import { Engine, ActionGraph } from "./lib/engine";
import { networkObserver } from "./lib/network_observer";
import { saveSite } from "./lib/auth_storage";

let currentEngine: Engine | null = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_OAUTH_FLOW") {
    const { siteUrl, clientId } = message.payload;
    const redirectUri = chrome.identity.getRedirectURL();
    
    const authUrl = new URL("/api/method/frappe.integrations.oauth2.authorize", siteUrl);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "all");

    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl.toString(),
        interactive: true
      },
      async (redirectUrl) => {
        if (chrome.runtime.lastError || !redirectUrl) {
          sendResponse({ success: false, error: chrome.runtime.lastError?.message });
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
              body: new URLSearchParams({
                grant_type: "authorization_code",
                client_id: clientId,
                code: code,
                redirect_uri: redirectUri
              })
            });

            const tokenData = await tokenResponse.json();

            if (tokenData.access_token) {
              await saveSite({
                id: crypto.randomUUID(),
                url: siteUrl,
                clientId: clientId,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresAt: Date.now() + (tokenData.expires_in * 1000),
                isActive: true
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
  } else if (message.type === "START_ACTION") {
    const graph: ActionGraph = message.payload.compiled_json;
    currentEngine = new Engine(graph);
    
    processNextNode();
    sendResponse({ status: "started" });
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
  }
  return true;
});

async function processNextNode() {
  if (!currentEngine) return;

  const node = currentEngine.getCurrentNode();
  if (!node) {
    // Action complete
    console.log("Action complete", currentEngine.scrapedData);
    // Here we would call submit_task_data API
    return;
  }

  if (node.type === "network-request") {
    const result = await networkObserver({
      target_selector: node.data.target_selector || "",
      extract_target: node.data.extract_target || ""
    });
    
    if (result.success) {
      if (node.data.data_key) {
        currentEngine.advance({ [node.data.data_key]: result.value });
      } else {
        currentEngine.advance();
      }
      processNextNode();
    }
  } else if (node.type === "get-text" || node.type === "element-exists") {
    // Send message to content script to start DOM observer
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "START_DOM_OBSERVER",
          payload: {
            target_selector: node.data.target_selector,
            extract_target: node.data.extract_target
          }
        });
      }
    });
  } else {
    // Other node types (trigger, manual-step, etc.)
    currentEngine.advance();
    processNextNode();
  }
}
