import { ElementScrollNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { CDPService } from '../services/cdp';
import { browser } from 'wxt/browser';

export default async function elementScroll(data: ElementScrollNodeData, id: string): Promise<Result<void>> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].id) {
      return { success: false, error: new Error('No active tab found') };
    }
    const tabId = tabs[0].id;

    const scrollY = data.scrollY || 0;
    const scrollX = data.scrollX || 0;
    
    let x = 0;
    let y = 0;

    if (data.selector) {
      const box = await CDPService.getBoundingBox(tabId, data.selector);
      if (!box) {
        return { success: false, error: new Error(`Element not found: ${data.selector}`) };
      }
      x = box.x + box.width / 2;
      y = box.y + box.height / 2;
    } else {
      // If no selector, scroll from the center of the viewport
      const viewport = await CDPService.evaluate(tabId, `({ width: window.innerWidth, height: window.innerHeight })`);
      x = viewport.width / 2;
      y = viewport.height / 2;
    }

    // Input.synthesizeScrollGesture uses positive values for scrolling down/right,
    // but we need to specify the distance to scroll.
    // Note: xDistance and yDistance are the distance to scroll. Positive values scroll right/down.
    await CDPService.sendCommand(tabId, 'Input.synthesizeScrollGesture', {
      x,
      y,
      xDistance: scrollX,
      yDistance: scrollY,
      speed: data.smooth ? 800 : 2000, // Adjust speed based on smooth flag
      repeatCount: 1,
      repeatDelayMs: 0,
      interactionMarkerName: 'elementScroll'
    });

    return { success: true, value: undefined };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
