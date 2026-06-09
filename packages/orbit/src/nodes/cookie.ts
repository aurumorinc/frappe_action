import { CookieNodeData, NodeType, Result } from './types';
import { browser } from 'wxt/browser';

export const cookieNode: NodeType<CookieNodeData> = {
  id: 'nodes:cookie',
  name: 'cookie',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    const url = data.domain ? (data.domain.startsWith('http') ? data.domain : `https://${data.domain}`) : undefined;

    if (data.action === 'get') {
      if (url) {
        const cookie = await browser.cookies.get({ url, name: data.name });
        // Store in context if needed
        return { success: true, data: undefined };
      } else {
        const cookies = await browser.cookies.getAll({ name: data.name });
        // Store in context if needed
        return { success: true, data: undefined };
      }
    } else if (data.action === 'set' && data.value !== undefined && url) {
      await browser.cookies.set({
        url,
        name: data.name,
        value: data.value,
        domain: data.domain
      });
      return { success: true, data: undefined };
    } else if (data.action === 'remove' && url) {
      await browser.cookies.remove({ url, name: data.name });
      return { success: true, data: undefined };
    }

    return { success: false, error: String(new Error('Invalid cookie action or missing parameters')) };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
