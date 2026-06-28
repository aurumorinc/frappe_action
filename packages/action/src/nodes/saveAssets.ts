import { SaveAssetsNodeData, NodeType, Result } from './types';
import { browser } from 'wxt/browser';

export const saveAssetsNode: NodeType<SaveAssetsNodeData> = {
  id: 'nodes:save-assets',
  name: 'saveAssets',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    
    const expression = `
      (() => {
        const elements = ${data.multiple ? `Array.from(document.querySelectorAll('${data.selector.replace(/'/g, "\\'")}'))` : `[document.querySelector('${data.selector.replace(/'/g, "\\'")}')]`};
        if (!elements[0]) return null;
        return elements.map(el => el.getAttribute('${data.attribute.replace(/'/g, "\\'")}')).filter(Boolean);
      })();
    `;

    const urls = await context.browser.evaluate( expression);

    if (!urls || urls.length === 0) {
      return { success: false, error: String(new Error(`No assets found for selector: ${data.selector}`)) };
    }

    const tab = await browser.tabs.get(context.browser.getTabId());
    for (const url of urls) {
      // Resolve relative URLs
      const absoluteUrl = new URL(url, tab.url).href;
      await browser.downloads.download({ url: absoluteUrl });
    }

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
