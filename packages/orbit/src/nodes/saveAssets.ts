import { SaveAssetsNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { CDPService } from '../services/cdp';
import { browser } from 'wxt/browser';

export default async function saveAssets(data: SaveAssetsNodeData, id: string): Promise<Result<void>> {
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
        return elements.map(el => el.getAttribute('${data.attribute.replace(/'/g, "\\'")}')).filter(Boolean);
      })();
    `;

    const urls = await CDPService.evaluate(tabId, expression);

    if (!urls || urls.length === 0) {
      return { success: false, error: new Error(`No assets found for selector: ${data.selector}`) };
    }

    for (const url of urls) {
      // Resolve relative URLs
      const absoluteUrl = new URL(url, tabs[0].url).href;
      await browser.downloads.download({ url: absoluteUrl });
    }

    return { success: true, value: undefined };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
