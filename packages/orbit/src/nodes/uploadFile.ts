import { UploadFileNodeData, NodeType, Result } from './types';

export const uploadFileNode: NodeType<UploadFileNodeData> = {
  id: 'nodes:upload-file',
  name: 'uploadFile',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    
    // Get the objectId of the file input element
    const expression = `document.querySelector('${data.selector.replace(/'/g, "\\'")}')`;
    const result = await context.browser.sendCommand( 'Runtime.evaluate', {
      expression,
      returnByValue: false
    });

    if (!result.result || !result.result.objectId) {
      return { success: false, error: String(new Error(`Element not found: ${data.selector}`)) };
    }

    const objectId = result.result.objectId;

    // Use CDP to set the files natively
    await context.browser.sendCommand( 'DOM.setFileInputFiles', {
      files: data.filePaths,
      objectId
    });

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
