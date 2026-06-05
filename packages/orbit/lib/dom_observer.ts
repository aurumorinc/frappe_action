import { Result } from "./engine";

export interface DomObserverConfig {
  target_selector: string;
  extract_target: string;
}

export function domObserver(config: DomObserverConfig): Promise<Result<unknown>> {
  return new Promise((resolve) => {
    const element = document.querySelector(config.target_selector);
    
    if (element) {
      const value = extractValue(element, config.extract_target);
      resolve({ success: true, value });
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      const el = document.querySelector(config.target_selector);
      if (el) {
        obs.disconnect();
        clearTimeout(timeoutId);
        const value = extractValue(el, config.extract_target);
        resolve({ success: true, value });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    const timeoutId = setTimeout(() => {
      observer.disconnect();
      resolve({ success: false, error: new Error('Timeout waiting for element') });
    }, 30000);
  });
}

function extractValue(element: Element, extractTarget: string): unknown {
  if (extractTarget === 'innerText') {
    return (element as HTMLElement).innerText || element.textContent; // Fallback for jsdom
  }
  if (extractTarget === 'href') {
    return (element as HTMLAnchorElement).href;
  }
  if (extractTarget === 'value') {
    return (element as HTMLInputElement).value;
  }
  return element.getAttribute(extractTarget);
}
