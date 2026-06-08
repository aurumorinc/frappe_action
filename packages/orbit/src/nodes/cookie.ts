import { CookieNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { browser } from 'wxt/browser';

export default async function cookie(data: CookieNodeData): Promise<Result<any>> {
  try {
    const url = data.domain ? (data.domain.startsWith('http') ? data.domain : `https://${data.domain}`) : undefined;

    if (data.action === 'get') {
      if (url) {
        const cookie = await browser.cookies.get({ url, name: data.name });
        return { success: true, value: cookie ? cookie.value : null };
      } else {
        const cookies = await browser.cookies.getAll({ name: data.name });
        return { success: true, value: cookies.length > 0 ? cookies[0].value : null };
      }
    } else if (data.action === 'set' && data.value !== undefined && url) {
      await browser.cookies.set({
        url,
        name: data.name,
        value: data.value,
        domain: data.domain
      });
      return { success: true, value: undefined };
    } else if (data.action === 'remove' && url) {
      await browser.cookies.remove({ url, name: data.name });
      return { success: true, value: undefined };
    }

    return { success: false, error: new Error('Invalid cookie action or missing parameters') };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
