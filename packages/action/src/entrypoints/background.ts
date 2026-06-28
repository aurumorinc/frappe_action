import { defineBackground } from '#imports';
import baseLogger from "../utils/logging";
import { setupMessageListeners } from '../messaging/background';
import { browser } from 'wxt/browser';

export default defineBackground(() => {
  const logger = baseLogger.child({ context: 'background' });

  browser.action.onClicked.addListener((tab) => {
    logger.debug({ tabId: tab.id }, "Action clicked");
    if (tab.id) {
      browser.tabs.sendMessage(tab.id, { type: "TOGGLE_UI" }).then(() => {
        logger.debug({ tabId: tab.id }, "Successfully sent TOGGLE_UI");
      }).catch((err) => {
        logger.warn({ tabId: tab.id, err }, "Failed to send TOGGLE_UI (content script likely not injected)");
      });
    }
  });

  setupMessageListeners();
});
