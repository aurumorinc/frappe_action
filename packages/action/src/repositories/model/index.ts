import logger from '../../utils/logging';
import { SiteAuth } from '../../models/auth';
import { Result } from '../../nodes/types';

export interface StagehandCacheResult {
  hit: boolean;
  selector?: string;
  method?: string;
}

export interface StagehandInferResult {
  elementId: string;
  method?: string;
}

export async function getStagehandCache(site: SiteAuth, instruction: string, url: string): Promise<Result<StagehandCacheResult>> {
  try {
    const response = await fetch(`${site.url}/api/method/frappe_action.action_node_cache.get`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${site.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ instruction, url })
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, data: data.message || { hit: false } };
    }
    return { success: false, error: String(new Error('Failed to get stagehand cache')) };
  } catch (error) {
    logger.error({ err: error, siteUrl: site.url, instruction }, `Failed to fetch stagehand cache from ${site.url}`);
    return { success: false, error: String(error as Error) };
  }
}

export async function saveStagehandCache(site: SiteAuth, instruction: string, url: string, selector: string, method: string): Promise<Result<boolean>> {
  try {
    const response = await fetch(`${site.url}/api/method/frappe_action.action_node_cache.save`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${site.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ instruction, url, selector, method })
    });
    if (response.ok) {
      return { success: true, data: true };
    }
    return { success: false, error: String(new Error('Failed to save stagehand cache')) };
  } catch (error) {
    logger.error({ err: error, siteUrl: site.url, instruction }, `Failed to update stagehand cache on ${site.url}`);
    return { success: false, error: String(error as Error) };
  }
}

export async function inferStagehandAction(site: SiteAuth, actionId: string, instruction: string, domTree: string): Promise<Result<StagehandInferResult>> {
  try {
    const response = await fetch(`${site.url}/api/method/frappe_action.action_node_cache.infer_action`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${site.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action_id: actionId,
        instruction,
        dom_tree: domTree
      })
    });
    if (response.ok) {
      const data = await response.json();
      if (data.message && data.message.elementId) {
        return { success: true, data: data.message };
      }
      return { success: false, error: String(new Error("LLM failed to return an elementId")) };
    }
    return { success: false, error: String(new Error('Failed to infer stagehand action')) };
  } catch (error) {
    logger.error({ err: error, siteUrl: site.url, instruction }, `Failed to infer stagehand action on ${site.url}`);
    return { success: false, error: String(error as Error) };
  }
}
