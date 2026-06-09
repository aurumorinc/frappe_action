import { browser } from "wxt/browser";
import { Result } from "../../../nodes/types";

export interface NetworkObserverConfig {
  target_selector: string; // URL regex
  extract_target: string; // e.g., 'request_body', 'response_body'
}

export function networkObserver(config: NetworkObserverConfig): Promise<Result<unknown>> {
  return new Promise((resolve) => {
    const listener = (details: any) => {
      const regex = new RegExp(config.target_selector);
      if (regex.test(details.url)) {
        browser.webRequest.onBeforeRequest.removeListener(listener);
        
        if (config.extract_target === 'request_body' && details.requestBody) {
          let body = null;
          if (details.requestBody.raw && details.requestBody.raw[0].bytes) {
            const decoder = new TextDecoder('utf-8');
            body = decoder.decode(details.requestBody.raw[0].bytes);
          } else if (details.requestBody.formData) {
            body = details.requestBody.formData;
          }
          resolve({ success: true, data: body });
        } else {
          resolve({ success: true, data: null });
        }
      }
      return undefined;
    };

    browser.webRequest.onBeforeRequest.addListener(
      listener,
      { urls: ["<all_urls>"] },
      ["requestBody"]
    );
  });
}
