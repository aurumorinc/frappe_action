import { defineContentScript } from '#imports';

export default defineContentScript({
  matches: ["<all_urls>"],
  allFrames: true,
  main() {
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;

      if (event.data && event.data.type === "ORBIT_START_AUTH") {
        console.log("Orbit Extension: Received auth request", event.data.payload);
        
        chrome.runtime.sendMessage(
          {
            type: "START_OAUTH_FLOW",
            payload: event.data.payload
          },
          (response) => {
            if (response && response.success) {
              window.postMessage({ type: "ORBIT_AUTH_SUCCESS" }, "*");
            } else {
              console.error("Orbit Extension: Auth failed", response?.error);
              window.postMessage({ type: "ORBIT_AUTH_FAILED", error: response?.error }, "*");
            }
          }
        );
      }
    });
  }
});
