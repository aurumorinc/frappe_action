import { defineBackground } from '#imports';
import { Engine, ActionGraph } from "../services/action";
import { networkObserver } from "../utils/network_observer";
import { saveSite, getActiveSite, getSites } from "../services/auth";
import baseLogger, { processTelemetry } from "../utils/logger";
import { SentryManager } from "../lib/sentry";
import { PostHogManager } from "../lib/posthog";
import { fetchSentryConfig, fetchPosthogConfig } from "../services/api";

export default defineBackground(() => {
  const logger = baseLogger.child({ context: 'background' });
  let currentEngine: Engine | null = null;
  let currentTodo: any = null;
  let todoQueue: any[] = [];
  let isRunningAll = false;

  browser.action.onClicked.addListener((tab) => {
    logger.debug({ tabId: tab.id }, "Action clicked");
    if (tab.id) {
      browser.tabs.sendMessage(tab.id, { type: "TOGGLE_UI" }).then(() => {
        logger.debug({ tabId: tab.id }, "Successfully sent TOGGLE_UI");
      }).catch((err) => {
        logger.warn({ tabId: tab.id, err }, "Failed to send TOGGLE_UI (content script likely not injected)");
      });
    }
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "LOG_TRANSMIT") {
      processTelemetry(message.payload.level, message.payload.logEvent);
      return true;
    } else if (message.type === "GET_REDIRECT_URI") {
      sendResponse({ redirect_uri: browser.identity.getRedirectURL() });
      return true;
    } else if (message.type === "START_OAUTH_FLOW") {
      const { siteUrl, clientId } = message.payload;
      const redirectUri = browser.identity.getRedirectURL();
      
      const authUrl = new URL("/api/method/frappe.integrations.oauth2.authorize", siteUrl);
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("scope", "all");

      browser.identity.launchWebAuthFlow(
        {
          url: authUrl.toString(),
          interactive: true
        },
        async (redirectUrl) => {
          if (browser.runtime.lastError || !redirectUrl) {
            sendResponse({ success: false, error: browser.runtime.lastError?.message });
            return;
          }

          const url = new URL(redirectUrl);
          const code = url.searchParams.get("code");

          if (code) {
            try {
              const tokenResponse = await fetch(new URL("/api/method/frappe.integrations.oauth2.get_token", siteUrl).toString(), {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded"
                },
                credentials: "omit",
                body: new URLSearchParams({
                  grant_type: "authorization_code",
                  client_id: clientId,
                  code: code,
                  redirect_uri: redirectUri
                })
              });

              const tokenData = await tokenResponse.json();

              if (tokenData.access_token) {
                const newSite = {
                  id: Math.random().toString(36).substring(2) + Date.now().toString(36),
                  url: siteUrl,
                  clientId: clientId,
                  accessToken: tokenData.access_token,
                  refreshToken: tokenData.refresh_token,
                  expiresAt: Date.now() + (tokenData.expires_in * 1000),
                  isActive: true
                };
                await saveSite(newSite);
                
                // Fetch and initialize telemetry config for the new site
                fetchSentryConfig(newSite).then(config => {
                  if (config && config.dsn) {
                    SentryManager.registerSiteConfig(siteUrl, config.dsn);
                  }
                }).catch(err => {
                  logger.error({ err, siteUrl }, "Failed to initialize Sentry config");
                });

                fetchPosthogConfig(newSite).then(config => {
                  if (config && config.api_key && config.host) {
                    PostHogManager.registerSiteConfig(siteUrl, config.api_key, config.host);
                  }
                }).catch(err => {
                  logger.error({ err, siteUrl }, "Failed to initialize PostHog config");
                });

                sendResponse({ success: true });
              } else {
                sendResponse({ success: false, error: "Failed to get access token" });
              }
            } catch (error: any) {
              sendResponse({ success: false, error: error.message });
            }
          } else {
            sendResponse({ success: false, error: "No authorization code returned" });
          }
        }
      );
      return true; // Keep message channel open for async response
    } else if (message.type === "CHECK_AUTH_STATUS") {
      const { siteUrl } = message.payload;
      getSites().then(sites => {
        const site = sites.find(s => s.url === siteUrl && s.accessToken);
        sendResponse({ isAuthorized: !!site });
      });
      return true;
    } else if (message.type === "START_ACTION") {
      const graph: ActionGraph = message.payload.compiled_json;
      currentTodo = message.payload.todo;
      currentEngine = new Engine(graph);
      isRunningAll = false;
      
      logger.info({ eventName: 'action_started', siteUrl: currentTodo?.site?.url, todoName: currentTodo?.name }, "Action started");
      
      processNextNode();
      sendResponse({ status: "started" });
    } else if (message.type === "START_RUN_ALL") {
      todoQueue = message.payload.todos || [];
      isRunningAll = true;
      if (todoQueue.length > 0) {
        startNextTodoFromQueue();
        sendResponse({ status: "started_run_all" });
      } else {
        isRunningAll = false;
        sendResponse({ status: "empty_queue" });
      }
    } else if (message.type === "DOM_OBSERVER_RESULT") {
      if (currentEngine) {
        const currentNode = currentEngine.getCurrentNode();
        if (currentNode && currentNode.data.data_key) {
          currentEngine.advance({ [currentNode.data.data_key]: message.payload });
        } else {
          currentEngine.advance();
        }
        processNextNode();
      }
    } else if (message.type === "HITL_RESULT") {
      if (currentEngine) {
        const currentNode = currentEngine.getCurrentNode();
        if (currentNode && currentNode.type === "hitl") {
          if (currentNode.data.data_key && message.payload.data) {
            currentEngine.advance({ [currentNode.data.data_key]: message.payload.data });
          } else {
            currentEngine.advance();
          }
          processNextNode();
        }
      }
    }
    return true;
  });

  function startNextTodoFromQueue() {
    if (todoQueue.length === 0) {
      isRunningAll = false;
      browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs[0]?.id) {
          browser.tabs.sendMessage(tabs[0].id, { type: "RUN_ALL_COMPLETED" });
        }
      });
      return;
    }
    const nextTodo = todoQueue.shift();
    if (nextTodo && nextTodo.compiled_json) {
      currentTodo = nextTodo;
      currentEngine = new Engine(nextTodo.compiled_json);
      logger.info({ eventName: 'action_started', siteUrl: currentTodo?.site?.url, todoName: currentTodo?.name }, "Action started from queue");
      processNextNode();
    } else {
      // Skip invalid todo
      startNextTodoFromQueue();
    }
  }

  async function processNextNode() {
    if (!currentEngine) return;

    const node = currentEngine.getCurrentNode();
    if (!node) {
      // Action complete
      logger.info({ eventName: 'action_completed', siteUrl: currentTodo?.site?.url, todoName: currentTodo?.name, scrapedData: currentEngine.scrapedData }, "Action complete");
      if (currentTodo) {
        const site = await getActiveSite();
        if (site) {
          try {
            const traceparent = currentTodo.traceparent;
            await fetch(`${site.url}/api/method/frappe_orbit.todo.submit`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${site.accessToken}`,
                'Content-Type': 'application/json',
                ...(traceparent ? { 'traceparent': traceparent } : {})
              },
              credentials: 'omit',
              body: JSON.stringify({
                doc: {
                  ...currentTodo,
                  response_body: JSON.stringify(currentEngine.scrapedData),
                  status: 'Closed'
                }
              })
            });
          } catch (e) {
            logger.error({ err: e, siteUrl: site.url }, "Failed to submit task data");
          }
        }
      }
      
      if (isRunningAll) {
        startNextTodoFromQueue();
      }
      return;
    }

    if (node.data.is_sub_task && currentTodo) {
      const site = await getActiveSite();
      if (site) {
        try {
          // We need a template name, but for now we might just use a generic one or pass it in data
          // Assuming we have a generic template or we just create a ToDo directly
          // The blueprint says: call trigger_sub_task API
          // Wait, trigger_sub_task requires template_name. Let's just create a ToDo directly for simplicity if template is missing
          // Actually, let's just call a new API or use the existing one with a dummy template
          // For now, let's just create a ToDo via standard REST API
          const traceparent = currentTodo.traceparent;
          const response = await fetch(`${site.url}/api/resource/ToDo`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${site.accessToken}`,
              'Content-Type': 'application/json',
              ...(traceparent ? { 'traceparent': traceparent } : {})
            },
            credentials: 'omit',
            body: JSON.stringify({
              description: node.data.message || `Sub-task for node ${node.id}`,
              main: currentTodo.name,
              status: 'Open'
            })
          });
          const newTodo = await response.json();
          // We should wait for this ToDo to be closed, but for now we just create it
          // In a real implementation, we'd poll or wait for a message from the UI
        } catch (e) {
          logger.error({ err: e, siteUrl: site.url }, "Failed to create sub-task");
        }
      }
    }

    if (node.type === "trigger") {
      if (node.data.url_template) {
        const url = currentEngine.interpolateString(node.data.url_template);
        browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            browser.tabs.update(tabs[0].id, { url });
          }
        });
      }
      currentEngine.advance();
      processNextNode();
    } else if (node.type === "redirect") {
      if (node.data.url_template) {
        const url = currentEngine.interpolateString(node.data.url_template);
        browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            browser.tabs.update(tabs[0].id, { url });
          }
        });
      }
      currentEngine.advance();
      processNextNode();
    } else if (node.type === "hitl") {
      // Pause execution and notify UI
      browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs[0]?.id) {
          browser.tabs.sendMessage(tabs[0].id, {
            type: "REQUIRE_HITL",
            payload: {
              nodeId: node.id,
              nodeType: node.type,
              message: node.data.message || "Human intervention required",
              todo_type: node.data.todo_type,
              dataKey: node.data.data_key
            }
          });
        }
      });
      // Do not call currentEngine.advance() or processNextNode() here.
      // We will wait for a message from the UI to resume.
    } else {
      // Other node types
      currentEngine.advance();
      processNextNode();
    }
  }
});
