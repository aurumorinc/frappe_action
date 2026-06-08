import { browser } from 'wxt/browser';
import baseLogger from '../utils/logger';

const logger = baseLogger.child({ context: 'cdp_service' });

export class CDPService {
  private static attachedTabs = new Set<number>();

  /**
   * Attaches the debugger to a specific tab.
   */
  static async attach(tabId: number): Promise<void> {
    if (this.attachedTabs.has(tabId)) {
      return;
    }

    try {
      await browser.debugger.attach({ tabId }, '1.3');
      this.attachedTabs.add(tabId);
      logger.debug({ tabId }, 'Debugger attached');
    } catch (error) {
      logger.error({ tabId, err: error }, 'Failed to attach debugger');
      throw error;
    }
  }

  /**
   * Detaches the debugger from a specific tab.
   */
  static async detach(tabId: number): Promise<void> {
    if (!this.attachedTabs.has(tabId)) {
      return;
    }

    try {
      await browser.debugger.detach({ tabId });
      this.attachedTabs.delete(tabId);
      logger.debug({ tabId }, 'Debugger detached');
    } catch (error) {
      logger.error({ tabId, err: error }, 'Failed to detach debugger');
      throw error;
    }
  }

  /**
   * Sends a CDP command to a specific tab.
   */
  static async sendCommand(tabId: number, method: string, commandParams?: any): Promise<any> {
    await this.attach(tabId);

    try {
      const result = await browser.debugger.sendCommand({ tabId }, method, commandParams);
      return result;
    } catch (error) {
      logger.error({ tabId, method, err: error }, 'Failed to send CDP command');
      throw error;
    }
  }

  /**
   * Evaluates a JavaScript expression in the context of the page.
   */
  static async evaluate(tabId: number, expression: string, returnByValue: boolean = true): Promise<any> {
    const result = await this.sendCommand(tabId, 'Runtime.evaluate', {
      expression,
      returnByValue,
      awaitPromise: true
    });

    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || 'Error evaluating script');
    }

    return result.result?.value;
  }

  /**
   * Gets the bounding box of an element using CDP.
   */
  static async getBoundingBox(tabId: number, selector: string): Promise<{ x: number; y: number; width: number; height: number } | null> {
    try {
      const expression = `
        (() => {
          const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        })();
      `;
      const box = await this.evaluate(tabId, expression);
      return box || null;
    } catch (error) {
      logger.error({ tabId, selector, err: error }, 'Failed to get bounding box via CDP');
      return null;
    }
  }
}
