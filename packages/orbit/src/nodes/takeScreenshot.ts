import handleSelector from './handleSelector';
import { TakeScreenshotNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { browser } from 'wxt/browser';

export default async function takeScreenshot(data: TakeScreenshotNodeData, id: string): Promise<Result<void>> {
  try {
    let rect: DOMRect | undefined;

    if (data.selector && !data.fullPage) {
      await handleSelector(
        { data, id },
        {
          onSelected(element: Element) {
            rect = element.getBoundingClientRect();
          },
        }
      );
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

    return { success: true, value: undefined };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
