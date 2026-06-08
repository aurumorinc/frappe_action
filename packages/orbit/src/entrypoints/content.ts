import { browser } from "wxt/browser";
import { defineContentScript, createShadowRootUi } from '#imports';
import { createApp } from 'vue';
import ToDo from './ToDo.vue';
import { domObserver } from "../utils/dom_observer";
import logger from "../utils/logger";
import '../assets/tailwind.css'; // Import tailwind styles

const contentLogger = logger.child({ context: 'content_script' });

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: 'ui',
  async main(ctx) {
    let ui: any = null;
    let isMounted = false;

    // --- Background Listeners ---
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "START_DOM_OBSERVER") {
        domObserver(message.payload).then((result) => {
          if (result.success) {
            browser.runtime.sendMessage({
              type: "DOM_OBSERVER_RESULT",
              payload: result.value
            });
          }
        });
      } else if (message.type === "TOGGLE_ORBIT_UI") {
        contentLogger.debug("Received TOGGLE_ORBIT_UI message");
        if (ui) {
          if (!isMounted) {
            contentLogger.debug("Mounting UI...");
            try {
              ui.mount();
              isMounted = true;
              contentLogger.info("UI mounted successfully");
            } catch (e) {
              contentLogger.error({ err: e }, "Error mounting UI");
            }
          } else {
            contentLogger.debug("Removing UI...");
            ui.remove();
            isMounted = false;
          }
        } else {
          contentLogger.warn("UI not ready yet, waiting...");
          // If UI is not ready yet, wait a bit and try again
          setTimeout(() => {
            if (ui && !isMounted) {
              contentLogger.debug("Mounting UI after delay...");
              try {
                ui.mount();
                isMounted = true;
                contentLogger.info("UI mounted successfully after delay");
              } catch (e) {
                contentLogger.error({ err: e }, "Error mounting UI after delay");
              }
            } else if (!ui) {
              contentLogger.error("UI failed to initialize completely.");
            }
          }, 1000);
        }
      }
    });

    window.addEventListener("ORBIT_START_HEADLESS_ACTION", (event: Event) => {
      const customEvent = event as CustomEvent;
      const actionName = customEvent.detail?.action_name;

      if (actionName) {
        contentLogger.info({ actionName }, "Headless bot requested action");
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

    ui = await createShadowRootUi(ctx, {
      name: 'orbit-copilot-shadow-root',
      position: 'overlay',
      anchor: 'body',
      append: 'last',
      zIndex: 2147483647,
      onMount: (container, shadow, shadowHost) => {
        const app = createApp(ToDo);
        app.mount(container);
        return app;
      },
      onRemove: (app) => {
        app?.unmount();
      },
    });
  }
});