import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserService } from '../../../../src/services/browser/index';
import { CDPService } from '../../../../src/repositories/browser/cdp';
import { MouseRepository } from '../../../../src/repositories/browser/mouse';
import { KeyboardRepository } from '../../../../src/repositories/browser/keyboard';

vi.mock('../../../../src/repositories/browser/cdp', () => ({
  CDPService: {
    getBoundingBox: vi.fn(),
    evaluate: vi.fn(),
    sendCommand: vi.fn(),
  },
}));

vi.mock('../../../../src/repositories/browser/mouse', () => ({
  MouseRepository: vi.fn(function() {
    return {
      click: vi.fn().mockResolvedValue(undefined),
      move: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

vi.mock('../../../../src/repositories/browser/keyboard', () => ({
  KeyboardRepository: vi.fn(function() {
    return {
      type: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

describe('BrowserService', () => {
  let browserService: BrowserService;
  const tabId = 123;

  beforeEach(() => {
    vi.clearAllMocks();
    browserService = new BrowserService(tabId);
  });

  it('should return the correct tabId', () => {
    expect(browserService.getTabId()).toBe(tabId);
  });

  it('should clickElement by resolving bounding box and calling mouse.click', async () => {
    const box = { x: 10, y: 20, width: 100, height: 50 };
    vi.mocked(CDPService.getBoundingBox).mockResolvedValue(box);

    await browserService.clickElement('#btn');

    expect(CDPService.getBoundingBox).toHaveBeenCalledWith(tabId, '#btn');
    const mockMouse = vi.mocked(MouseRepository).mock.results[0].value;
    expect(mockMouse.click).toHaveBeenCalledWith(box);
  });

  it('should throw error in clickElement if bounding box is not found', async () => {
    vi.mocked(CDPService.getBoundingBox).mockResolvedValue(null);

    await expect(browserService.clickElement('#btn')).rejects.toThrow('Element not found: #btn');
  });

  it('should clickBoundingBox directly', async () => {
    const box = { x: 10, y: 20, width: 100, height: 50 };
    await browserService.clickBoundingBox(box);

    const mockMouse = vi.mocked(MouseRepository).mock.results[0].value;
    expect(mockMouse.click).toHaveBeenCalledWith(box);
  });

  it('should hoverBoundingBox directly', async () => {
    const box = { x: 10, y: 20, width: 100, height: 50 };
    await browserService.hoverBoundingBox(box);

    const mockMouse = vi.mocked(MouseRepository).mock.results[0].value;
    expect(mockMouse.move).toHaveBeenCalledWith(box);
  });

  it('should typeText by clicking element and calling keyboard.type', async () => {
    const box = { x: 10, y: 20, width: 100, height: 50 };
    vi.mocked(CDPService.getBoundingBox).mockResolvedValue(box);

    await browserService.typeText('#input', 'hello');

    const mockMouse = vi.mocked(MouseRepository).mock.results[0].value;
    expect(mockMouse.click).toHaveBeenCalledWith(box);

    const mockKeyboard = vi.mocked(KeyboardRepository).mock.results[0].value;
    expect(mockKeyboard.type).toHaveBeenCalledWith('hello');
  });

  it('should type directly', async () => {
    await browserService.type('hello');

    const mockKeyboard = vi.mocked(KeyboardRepository).mock.results[0].value;
    expect(mockKeyboard.type).toHaveBeenCalledWith('hello');
  });

  it('should evaluate expression via CDPService', async () => {
    vi.mocked(CDPService.evaluate).mockResolvedValue('result');

    const result = await browserService.evaluate('1 + 1');

    expect(CDPService.evaluate).toHaveBeenCalledWith(tabId, '1 + 1');
    expect(result).toBe('result');
  });

  it('should sendCommand via CDPService', async () => {
    vi.mocked(CDPService.sendCommand).mockResolvedValue('result');

    const result = await browserService.sendCommand('Method', { param: 1 });

    expect(CDPService.sendCommand).toHaveBeenCalledWith(tabId, 'Method', { param: 1 });
    expect(result).toBe('result');
  });

  it('should getBoundingBox via CDPService', async () => {
    const box = { x: 10, y: 20, width: 100, height: 50 };
    vi.mocked(CDPService.getBoundingBox).mockResolvedValue(box);

    const result = await browserService.getBoundingBox('#btn');

    expect(CDPService.getBoundingBox).toHaveBeenCalledWith(tabId, '#btn');
    expect(result).toEqual(box);
  });
});
