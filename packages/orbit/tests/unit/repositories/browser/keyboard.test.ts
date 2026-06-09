import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeyboardRepository } from '../../../../src/repositories/browser/keyboard';
import { CDPService } from '../../../../src/repositories/browser/cdp';
import { MarkovTyper } from '../../../../src/lib/human-typing/typer';

vi.mock('../../../../src/repositories/browser/cdp', () => ({
  CDPService: {
    sendCommand: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../../src/lib/human-typing/typer', () => {
  return {
    MarkovTyper: vi.fn(function(text) {
      return {
        run: vi.fn().mockReturnValue({
          history: [
            { action: 'TYPE', char: text[0], delayMs: 10 },
            { action: 'BACKSPACE', delayMs: 10 },
            { action: 'TYPE', char: text[0], delayMs: 10 },
          ],
        }),
      };
    }),
  };
});

describe('KeyboardRepository', () => {
  let keyboardRepo: KeyboardRepository;
  const tabId = 123;

  beforeEach(() => {
    vi.clearAllMocks();
    keyboardRepo = new KeyboardRepository(tabId);
  });

  it('should type text using MarkovTyper and dispatch correct CDP events', async () => {
    await keyboardRepo.type('a');

    expect(MarkovTyper).toHaveBeenCalledWith('a');
    
    // 2 events for TYPE 'a' (keyDown, keyUp)
    // 2 events for BACKSPACE (keyDown, keyUp)
    // 2 events for TYPE 'a' (keyDown, keyUp)
    expect(CDPService.sendCommand).toHaveBeenCalledTimes(6);

    // First TYPE 'a'
    expect(CDPService.sendCommand).toHaveBeenNthCalledWith(1, tabId, 'Input.dispatchKeyEvent', { type: 'keyDown', text: 'a' });
    expect(CDPService.sendCommand).toHaveBeenNthCalledWith(2, tabId, 'Input.dispatchKeyEvent', { type: 'keyUp', text: 'a' });

    // BACKSPACE
    expect(CDPService.sendCommand).toHaveBeenNthCalledWith(3, tabId, 'Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace' });
    expect(CDPService.sendCommand).toHaveBeenNthCalledWith(4, tabId, 'Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace' });

    // Second TYPE 'a'
    expect(CDPService.sendCommand).toHaveBeenNthCalledWith(5, tabId, 'Input.dispatchKeyEvent', { type: 'keyDown', text: 'a' });
    expect(CDPService.sendCommand).toHaveBeenNthCalledWith(6, tabId, 'Input.dispatchKeyEvent', { type: 'keyUp', text: 'a' });
  });
});
