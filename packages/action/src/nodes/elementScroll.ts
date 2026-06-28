import { ElementScrollNodeData, NodeType, Result } from './types';

export const elementScrollNode: NodeType<ElementScrollNodeData> = {
  id: 'nodes:element-scroll',
  name: 'elementScroll',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    
    const scrollY = data.scrollY || 0;
    const scrollX = data.scrollX || 0;
    
    let x = 0;
    let y = 0;

    if (data.selector) {
      const box = await context.browser.getBoundingBox( data.selector);
      if (!box) {
        return { success: false, error: String(new Error(`Element not found: ${data.selector}`)) };
      }
      x = box.x + box.width / 2;
      y = box.y + box.height / 2;
    } else {
      // If no selector, scroll from the center of the viewport
      const viewport = await context.browser.evaluate( `({ width: window.innerWidth, height: window.innerHeight })`);
      x = viewport.width / 2;
      y = viewport.height / 2;
    }

    // Input.synthesizeScrollGesture uses positive values for scrolling down/right,
    // but we need to specify the distance to scroll.
    // Note: xDistance and yDistance are the distance to scroll. Positive values scroll right/down.
    await context.browser.sendCommand( 'Input.synthesizeScrollGesture', {
      x,
      y,
      xDistance: scrollX,
      yDistance: scrollY,
      speed: data.smooth ? 800 : 2000, // Adjust speed based on smooth flag
      repeatCount: 1,
      repeatDelayMs: 0,
      interactionMarkerName: 'elementScroll'
    });

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
