import { browser } from 'wxt/browser';
import logger from '../../utils/logging';
import { getActiveSite } from '../auth/index';
import { getStagehandCache, saveStagehandCache, inferStagehandAction } from '../../repositories/model/index';
import { Engine, Node } from '../../nodes/index';
import { Result } from '../../nodes/types';

export async function executeModelNode(node: Node, tabId: number, url: string, currentEngine: Engine | null, currentTodo: import('../../models/todo/index').Todo | null): Promise<Result<unknown>> {
  const site = await getActiveSite();
  if (!site) {
    logger.error("No active site found for Stagehand execution");
    return { success: false, error: "No active site found" };
  }

  const instruction = currentEngine?.interpolateString(node.data.instruction) || node.data.instruction;
  
  try {
    // 1. Check Cache
    const cacheResult = await getStagehandCache(site, instruction, url);
    
    let selector = null;
    let method = null;
    let isCacheHit = false;

    if (cacheResult.success && cacheResult.data.hit) {
      selector = cacheResult.data.selector;
      method = cacheResult.data.method;
      isCacheHit = true;
      logger.info({ instruction, selector }, "Stagehand Cache HIT");
    }

    // 2. Execute (or attempt to execute if Cache HIT)
    let executionSuccess = false;
    if (isCacheHit && selector) {
      try {
        const execResult = await browser.tabs.sendMessage(tabId, {
          type: "EXECUTE_XPATH",
          payload: { selector, method, nodeType: node.type }
        });
        if (execResult && execResult.success) {
          executionSuccess = true;
          if (node.type === "nodes:extract" && node.data.variables && execResult.data) {
            const varName = Object.keys(node.data.variables)[0];
            if (varName) {
              return { success: true, data: { [varName]: execResult.data } };
            }
          }
          return { success: true, data: undefined };
        }
      } catch (e) {
        logger.warn({ err: e, selector }, "Cache HIT execution failed, falling back to MISS flow (Self-Healing)");
      }
    }

    // 3. Cache MISS or Self-Healing
    if (!executionSuccess) {
      logger.info({ instruction }, "Stagehand Cache MISS or Self-Healing triggered");
      
      // Request Snapshot
      const snapshotResult = await browser.tabs.sendMessage(tabId, { type: "CAPTURE_SNAPSHOT" });
      if (!snapshotResult || !snapshotResult.domText) {
        throw new Error("Failed to capture DOM snapshot");
      }

      // Call LLM Inference
      const inferResult = await inferStagehandAction(site, currentTodo?.main || '', instruction, snapshotResult.domText);

      if (!inferResult.success) {
        throw inferResult.error;
      }

      const elementId = inferResult.data.elementId;
      method = inferResult.data.method || 'click';
      selector = snapshotResult.xpathMap[elementId];

      if (!selector) {
        throw new Error(`LLM returned elementId ${elementId} which is not in xpathMap`);
      }

      // Execute new selector
      const execResult = await browser.tabs.sendMessage(tabId, {
        type: "EXECUTE_XPATH",
        payload: { selector, method, nodeType: node.type }
      });

      if (execResult && execResult.success) {
        // Save to Cache
        await saveStagehandCache(site, instruction, url, selector, method);

        if (node.type === "nodes:extract" && node.data.variables && execResult.data) {
          const varName = Object.keys(node.data.variables)[0];
          if (varName) {
            return { success: true, data: { [varName]: execResult.data } };
          }
        }
        return { success: true, data: undefined };
      } else {
        throw new Error("Execution failed even after LLM inference");
      }
    }
    return { success: false, error: "Unknown execution state" };
  } catch (error) {
    logger.error({ err: error, instruction }, "Stagehand execution failed");
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
