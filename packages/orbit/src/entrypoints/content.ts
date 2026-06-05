import { browser } from "wxt/browser";
import { defineContentScript, createShadowRootUi } from '#imports';
import { createApp } from 'vue';
import ToDo from './ToDo.vue';
import { domObserver } from "../utils/dom_observer";
import '../assets/tailwind.css'; // Import tailwind styles

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
        if (ui) {
          if (!isMounted) {
            ui.mount();
            isMounted = true;
          } else {
            ui.remove();
            isMounted = false;
          }
        } else {
          // If UI is not ready yet, wait a bit and try again
          setTimeout(() => {
            if (ui && !isMounted) {
              ui.mount();
              isMounted = true;
            }
          }, 500);
        }
      }
    });

    window.addEventListener("ORBIT_START_HEADLESS_ACTION", (event: Event) => {
      const customEvent = event as CustomEvent;
      const actionName = customEvent.detail?.action_name;

      if (actionName) {
        console.log("Headless bot requested action:", actionName);
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
      }
    });

    ui = await createShadowRootUi(ctx, {
      name: 'orbit-copilot-shadow-root',
      position: 'inline',
      anchor: 'body',
      append: 'last',
      onMount: (container) => {
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