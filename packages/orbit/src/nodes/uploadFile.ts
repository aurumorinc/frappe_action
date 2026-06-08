import { UploadFileNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { CDPService } from '../services/cdp';
import { browser } from 'wxt/browser';

export default async function uploadFile(data: UploadFileNodeData, id: string): Promise<Result<void>> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].id) {
      return { success: false, error: new Error('No active tab found') };
    }
    const tabId = tabs[0].id;

    // Get the objectId of the file input element
    const expression = `document.querySelector('${data.selector.replace(/'/g, "\\'")}')`;
    const result = await CDPService.sendCommand(tabId, 'Runtime.evaluate', {
      expression,
      returnByValue: false
    });

    if (!result.result || !result.result.objectId) {
      return { success: false, error: new Error(`Element not found: ${data.selector}`) };
    }

    const objectId = result.result.objectId;

    // Use CDP to set the files natively
    await CDPService.sendCommand(tabId, 'DOM.setFileInputFiles', {
      files: data.filePaths,
      objectId
    });

    return { success: true, value: undefined };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
