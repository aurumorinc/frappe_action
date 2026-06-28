import { TakeScreenshotNodeData, NodeType, Result } from './types';
import { browser } from 'wxt/browser';

export const takeScreenshotNode: NodeType<TakeScreenshotNodeData> = {
  id: 'nodes:take-screenshot',
  name: 'takeScreenshot',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    let rect: any;

    if (data.selector && !data.fullPage) {
      const box = await context.browser.getBoundingBox(data.selector);
      if (box) {
        rect = box;
      }
    }

    // Send message to background script to capture the tab
    await browser.runtime.sendMessage({
      type: 'TAKE_SCREENSHOT',
      payload: {
        fullPage: data.fullPage,
        rect: rect ? {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        } : undefined
      }
    });

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
