import { browser } from "wxt/browser";
import { domObserver } from "../repositories/browser/observers/dom";
import baseLogger from "../utils/logging";
import { captureSnapshot } from "../lib/stagehand/snapshot";

const logger = baseLogger.child({ context: 'content_message_handler' });

export function setupContentMessageListeners(uiRef: { current: any }, isMounted: { value: boolean }) {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "REQUIRE_HITL") {
      logger.info({ payload: message.payload }, "HITL required");
      // Play chime
      try {
        const audio = new Audio(browser.runtime.getURL('/chime.mp3' as any));
        audio.play().catch(e => logger.warn({ err: e }, "Could not play chime"));
      } catch (e) {
        logger.warn({ err: e }, "Audio not supported");
      }
      
      // Dispatch event to Vue app
      window.dispatchEvent(new CustomEvent("ORBIT_REQUIRE_HITL", { detail: message.payload }));
    } else if (message.type === "RUN_ALL_COMPLETED") {
      window.dispatchEvent(new CustomEvent("ORBIT_RUN_ALL_COMPLETED"));
    } else if (message.type === "START_DOM_OBSERVER") {
      domObserver(message.payload).then((result) => {
        if (result.success) {
          browser.runtime.sendMessage({
            type: "DOM_OBSERVER_RESULT",
            payload: (result as any).data
          });
        }
      });
    } else if (message.type === "CAPTURE_SNAPSHOT") {
      try {
        const snapshot = captureSnapshot();
        sendResponse(snapshot);
      } catch (e) {
        logger.error({ err: e }, "Failed to capture snapshot");
        sendResponse({ error: "Failed to capture snapshot" });
      }
      return true;
    } else if (message.type === "EXECUTE_XPATH") {
      try {
        const { selector, method, nodeType } = message.payload;
        const result = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const element = result.singleNodeValue as HTMLElement;
        
        if (!element) {
          sendResponse({ success: false, error: "Element not found" });
          return true;
        }

        if (method === 'click') {
          element.click();
          sendResponse({ success: true });
        } else if (method === 'type') {
          // Basic type implementation, might need to be expanded based on arguments
          element.focus();
          sendResponse({ success: true });
        } else if (nodeType === 'nodes:extract') {
          sendResponse({ success: true, data: element.innerText });
        } else {
          sendResponse({ success: true });
        }
      } catch (e) {
        logger.error({ err: e }, "Failed to execute XPath");
        sendResponse({ success: false, error: "Execution failed" });
      }
      return true;
    } else if (message.type === "TOGGLE_UI") {
      logger.debug("Received TOGGLE_UI message");
      if (uiRef.current) {
        if (!isMounted.value) {
          logger.debug("Mounting UI...");
          try {
            uiRef.current.mount();
            isMounted.value = true;
            logger.info("UI mounted successfully");
          } catch (e) {
            logger.error({ err: e }, "Error mounting UI");
          }
        } else {
          logger.debug("Removing UI...");
          uiRef.current.remove();
          isMounted.value = false;
        }
      } else {
        logger.warn("UI not ready yet, waiting...");
        // If UI is not ready yet, wait a bit and try again
        setTimeout(() => {
          if (uiRef.current && !isMounted.value) {
            logger.debug("Mounting UI after delay...");
            try {
              uiRef.current.mount();
              isMounted.value = true;
              logger.info("UI mounted successfully after delay");
            } catch (e) {
              logger.error({ err: e }, "Error mounting UI after delay");
            }
          } else if (!uiRef.current) {
            logger.error("UI failed to initialize completely.");
          }
        }, 1000);
      }
    }
  });

  window.addEventListener("ORBIT_START_HEADLESS_ACTION", (event: Event) => {
    const customEvent = event as CustomEvent;
    const actionName = customEvent.detail?.action_name;

    if (actionName) {
      logger.info({ actionName }, "Headless bot requested action");
    }
  });

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    
    if (event.data && event.data.type === "ORBIT_GET_REDIRECT_URI") {
      browser.runtime.sendMessage({ type: "GET_REDIRECT_URI" }, (response) => {
        if (response && response.redirect_uri) {
          window.postMessage({
            type: "ORBIT_REDIRECT_URI",
            payload: { redirect_uri: response.redirect_uri }
          }, "*");
        }
      });
    } else if (event.data && event.data.type === "ORBIT_START_AUTH") {
      browser.runtime.sendMessage({
        type: "START_OAUTH_FLOW",
        payload: event.data.payload
      }, (response) => {
        if (response && response.success) {
          window.postMessage({ type: "ORBIT_AUTH_SUCCESS" }, "*");
        } else {
          window.postMessage({ type: "ORBIT_AUTH_FAILED", error: response?.error }, "*");
        }
      });
    } else if (event.data && event.data.type === "ORBIT_CHECK_AUTH_STATUS") {
      browser.runtime.sendMessage({
        type: "CHECK_AUTH_STATUS",
        payload: event.data.payload
      }, (response) => {
        window.postMessage({
          type: "ORBIT_AUTH_STATUS_RESULT",
          payload: response
        }, "*");
      });
    }
  });
}
