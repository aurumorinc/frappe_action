import { browser } from 'wxt/browser';
import logger from '../utils/logger';

const extLogger = logger.child({ context: 'extension_service' });

export function startAction(todo: any, compiledJson: any) {
  if (browser && browser.runtime && browser.runtime.sendMessage) {
    browser.runtime.sendMessage({
      type: "START_ACTION",
      payload: {
        todo: todo,
        compiled_json: compiledJson
      }
    });
  } else {
    extLogger.warn("browser.runtime.sendMessage is not available. Action not started.");
  }
}
