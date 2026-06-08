import { EventClickNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { CDPService } from '../services/cdp';
import { GhostCursor } from '../lib/ghost-cursor/spoof';
import { browser } from 'wxt/browser';

export default async function eventClick(data: EventClickNodeData, id: string): Promise<Result<void>> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].id) {
      return { success: false, error: new Error('No active tab found') };
    }
    const tabId = tabs[0].id;

    const box = await CDPService.getBoundingBox(tabId, data.selector);
    if (!box) {
      return { success: false, error: new Error(`Element not found: ${data.selector}`) };
    }

    const cursor = new GhostCursor(tabId);
    await cursor.click(box);

    return { success: true, value: undefined };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
