import { GetTextNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { CDPService } from '../services/cdp';
import { browser } from 'wxt/browser';

export default async function getText(data: GetTextNodeData, id: string): Promise<Result<string | string[]>> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].id) {
      return { success: false, error: new Error('No active tab found') };
    }
    const tabId = tabs[0].id;

    const expression = `
      (() => {
        const elements = ${data.multiple ? `Array.from(document.querySelectorAll('${data.selector.replace(/'/g, "\\'")}'))` : `[document.querySelector('${data.selector.replace(/'/g, "\\'")}')]`};
        if (!elements[0]) return null;

        return elements.map(element => {
          let text = '';
          if (${data.includeTags}) {
            text = element.outerHTML;
          } else if (${data.useTextContent}) {
            text = element.textContent || '';
          } else {
            text = element.innerText || '';
          }
          return text;
        });
      })();
    `;

    const rawTexts = await CDPService.evaluate(tabId, expression);

    if (!rawTexts) {
      return { success: false, error: new Error(`Element not found: ${data.selector}`) };
    }

    let regex: RegExp | undefined;
    if (data.regex) {
      regex = new RegExp(data.regex, [...new Set(data.regexExp || [])].join(''));
    }

    const processedTexts = rawTexts.map((text: string) => {
      if (regex) {
        const match = text.match(regex);
        text = match ? match.join(' ') : text;
      }
      return (data.prefixText || '') + text + (data.suffixText || '');
    });

    return { success: true, value: data.multiple ? processedTexts : processedTexts[0] };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
