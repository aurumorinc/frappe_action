import { browser } from "wxt/browser";
import { defineContentScript } from '#imports';
import baseLogger from '../utils/logging';

const logger = baseLogger.child({ context: 'auth_listener' });

export default defineContentScript({
  matches: ["<all_urls>"],
  allFrames: true,
  main() {
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;

      if (event.data && event.data.type === "ACTION_START_AUTH") {
        logger.info({ payload: event.data.payload }, "Action Extension: Received auth request");
        
        browser.runtime.sendMessage(
          {
            type: "START_OAUTH_FLOW",
            payload: event.data.payload
          },
          (response) => {
            if (response && response.success) {
              window.postMessage({ type: "ACTION_AUTH_SUCCESS" }, "*");
            } else {
              logger.error({ err: response?.error }, "Action Extension: Auth failed");
              window.postMessage({ type: "ACTION_AUTH_FAILED", error: response?.error }, "*");
            }
          }
        );
      }
    });
  }
});
