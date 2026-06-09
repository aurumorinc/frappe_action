import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeModelNode } from '../../../../src/services/model/index';
import * as actionRepo from '../../../../src/repositories/model/index';
import * as authService from '../../../../src/services/auth';
import { browser } from 'wxt/browser';
import { Engine } from '../../../../src/nodes/index';

vi.mock('wxt/browser', () => ({
  browser: {
    tabs: {
      sendMessage: vi.fn()
    }
  }
}));

vi.mock('../../../../src/repositories/model/index', () => ({
  getStagehandCache: vi.fn(),
  saveStagehandCache: vi.fn(),
  inferStagehandAction: vi.fn()
}));

vi.mock('../../../../src/services/auth', () => ({
  getActiveSite: vi.fn()
}));

describe('Stagehand Service', () => {
  let mockEngine: Engine;
  let processNextNode: any;

  beforeEach(() => {
    vi.resetAllMocks();
    mockEngine = {
      advance: vi.fn(),
      interpolateString: (s: string) => s,
      scrapedData: {}
    } as unknown as Engine;
    processNextNode = vi.fn();

    (authService.getActiveSite as any).mockResolvedValue({
      url: 'https://test.com',
      accessToken: 'token'
    });
  });

  it('should execute XPath and return success on Cache HIT', async () => {
    (actionRepo.getStagehandCache as any).mockResolvedValue({
      success: true,
      data: { hit: true, selector: '//button', method: 'click' }
    });

    (browser.tabs.sendMessage as any).mockResolvedValue({ success: true });

    const node = { id: '1', type: 'nodes:act', data: { instruction: 'Click button' } } as any;
    
    const result = await executeModelNode(node, 1, 'https://test.com', mockEngine, null);

    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(1, {
      type: 'EXECUTE_XPATH',
      payload: { selector: '//button', method: 'click', nodeType: 'nodes:act' }
    });
    expect(result).toEqual({ success: true, data: undefined });
  });

  it('should fallback to LLM inference on Cache MISS', async () => {
    (actionRepo.getStagehandCache as any).mockResolvedValue({
      success: true,
      data: { hit: false }
    });

    (browser.tabs.sendMessage as any)
      .mockResolvedValueOnce({ domText: '<html></html>', xpathMap: { '1': '//button' } }) // CAPTURE_SNAPSHOT
      .mockResolvedValueOnce({ success: true }); // EXECUTE_XPATH

    (actionRepo.inferStagehandAction as any).mockResolvedValue({
      success: true,
      data: { elementId: '1', method: 'click' }
    });

    (actionRepo.saveStagehandCache as any).mockResolvedValue({ success: true });

    const node = { id: '1', type: 'nodes:act', data: { instruction: 'Click button' } } as any;
    
    const result = await executeModelNode(node, 1, 'https://test.com', mockEngine, null);

    expect(actionRepo.inferStagehandAction).toHaveBeenCalled();
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(1, {
      type: 'EXECUTE_XPATH',
      payload: { selector: '//button', method: 'click', nodeType: 'nodes:act' }
    });
    expect(actionRepo.saveStagehandCache).toHaveBeenCalled();
    expect(result).toEqual({ success: true, data: undefined });
  });

  it('should fallback to LLM inference on Cache HIT execution failure (Self-Healing)', async () => {
    (actionRepo.getStagehandCache as any).mockResolvedValue({
      success: true,
      data: { hit: true, selector: '//old-button', method: 'click' }
    });

    (browser.tabs.sendMessage as any)
      .mockRejectedValueOnce(new Error('Element not found')) // EXECUTE_XPATH fails
      .mockResolvedValueOnce({ domText: '<html></html>', xpathMap: { '1': '//new-button' } }) // CAPTURE_SNAPSHOT
      .mockResolvedValueOnce({ success: true }); // EXECUTE_XPATH succeeds

    (actionRepo.inferStagehandAction as any).mockResolvedValue({
      success: true,
      data: { elementId: '1', method: 'click' }
    });

    const node = { id: '1', type: 'nodes:act', data: { instruction: 'Click button' } } as any;
    
    const result = await executeModelNode(node, 1, 'https://test.com', mockEngine, null);

    expect(actionRepo.inferStagehandAction).toHaveBeenCalled();
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(1, {
      type: 'EXECUTE_XPATH',
      payload: { selector: '//new-button', method: 'click', nodeType: 'nodes:act' }
    });
    expect(result).toEqual({ success: true, data: undefined });
  });

  it('should return failure on total execution failure', async () => {
    (actionRepo.getStagehandCache as any).mockResolvedValue({
      success: true,
      data: { hit: false }
    });

    (browser.tabs.sendMessage as any).mockRejectedValue(new Error('Snapshot failed'));

    const node = { id: '1', type: 'nodes:act', data: { instruction: 'Click button' } } as any;
    
    const result = await executeModelNode(node, 1, 'https://test.com', mockEngine, null);

    expect(result.success).toBe(false);
  });
});
