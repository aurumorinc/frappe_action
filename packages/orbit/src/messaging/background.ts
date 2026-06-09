import { browser } from 'wxt/browser';
import { Engine, Graph } from '../nodes/index';
import { saveSite, getActiveSite, getSites } from '../services/auth';
import { fetchSentryConfig, fetchPosthogConfig } from '../repositories/auth';
import { submitTodo, createSubTask } from '../repositories/todo';
import { SentryManager } from '../lib/sentry';
import { PostHogManager } from '../lib/posthog';
import baseLogger, { processTelemetry } from '../utils/logging';
import { Todo } from '../models/todo/index';

const logger = baseLogger.child({ context: 'message_handler' });

let currentEngine: Engine | null = null;
let currentTodo: Todo | null = null;
let todoQueue: Todo[] = [];
let isRunningAll = false;

export function setupMessageListeners() {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "LOG_TRANSMIT") {
      processTelemetry(message.payload.level, message.payload.logEvent);
      return true;
    } else if (message.type === "GET_REDIRECT_URI") {
      sendResponse({ redirect_uri: browser.identity.getRedirectURL() });
      return true;
    } else if (message.type === "START_OAUTH_FLOW") {
      handleOAuthFlow(message.payload, sendResponse);
      return true; // Keep message channel open for async response
    } else if (message.type === "CHECK_AUTH_STATUS") {
      const { siteUrl } = message.payload;
      getSites().then(sites => {
        const site = sites.find(s => s.url === siteUrl && s.accessToken);
        sendResponse({ isAuthorized: !!site });
      });
      return true;
    } else if (message.type === "START_ACTION") {
      const graph: Graph = message.payload.compiled_json;
      currentTodo = message.payload.todo;
      
      browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        const tabId = tabs[0]?.id || 0;
        currentEngine = new Engine(graph, tabId, currentTodo!);
        isRunningAll = false;
        
        logger.info({ eventName: 'action_started', siteUrl: currentTodo?.site?.url, todoName: currentTodo?.name }, "Action started");
        
        processNextNode();
        sendResponse({ status: "started" });
      });
      return true;
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
      return true;
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
}

function handleOAuthFlow(payload: { siteUrl: string; clientId: string }, sendResponse: (response: unknown) => void) {
  const { siteUrl, clientId } = payload;
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
            fetchSentryConfig(newSite).then(result => {
              if (result.success && result.data.dsn) {
                SentryManager.registerSiteConfig(siteUrl, result.data.dsn);
              }
            }).catch(err => {
              logger.error({ err, siteUrl }, "Failed to initialize Sentry config");
            });

            fetchPosthogConfig(newSite).then(result => {
              if (result.success && result.data.api_key && result.data.host) {
                PostHogManager.registerSiteConfig(siteUrl, result.data.api_key, result.data.host);
              }
            }).catch(err => {
              logger.error({ err, siteUrl }, "Failed to initialize PostHog config");
            });

            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: "Failed to get access token" });
          }
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
        }
      } else {
        sendResponse({ success: false, error: "No authorization code returned" });
      }
    }
  );
}

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
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const tabId = tabs[0]?.id || 0;
      currentEngine = new Engine(nextTodo.compiled_json, tabId, currentTodo!);
      logger.info({ eventName: 'action_started', siteUrl: currentTodo?.site?.url, todoName: currentTodo?.name }, "Action started from queue");
      processNextNode();
    });
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
        await submitTodo(site, currentTodo, currentEngine.scrapedData);
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
      await createSubTask(site, currentTodo, node.data.message || `Sub-task for node ${node.id}`);
    }
  }

  const result = await currentEngine.advance();
  
  if (currentEngine.isPaused) {
    // Node requested a pause (e.g., HITL)
    return;
  }

  processNextNode();
}
