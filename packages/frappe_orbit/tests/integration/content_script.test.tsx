// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import * as domObserverModule from '../../lib/dom_observer';

vi.mock('../../lib/dom_observer', () => ({
  domObserver: vi.fn()
}));

vi.mock('frappe-ui', () => ({
  Button: { template: '<button></button>' },
  FeatherIcon: { template: '<svg></svg>', props: ['name'] }
}));

describe('content_script', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('should listen for START_DOM_OBSERVER and execute', async () => {
    vi.mocked(domObserverModule.domObserver).mockResolvedValue({ success: true, value: 'extracted_data' });
    
    // Import the content script to register listeners
    const cs = await import('../../entrypoints/content');
    cs.default.main({ onInvalidated: vi.fn() } as any);
    
    // Simulate receiving a message from background
    const response = await new Promise((resolve) => {
      fakeBrowser.runtime.sendMessage({
        type: 'START_DOM_OBSERVER',
        payload: { target_selector: '#test', extract_target: 'innerText' }
      }).then(resolve);
    });
    
    expect(domObserverModule.domObserver).toHaveBeenCalledWith({
      target_selector: '#test',
      extract_target: 'innerText'
    });
    
    // In a real test, we'd verify that chrome.runtime.sendMessage was called with DOM_OBSERVER_RESULT
    // But fakeBrowser's sendMessage behavior might need specific setup for this
  });

  it('should listen for ORBIT_START_HEADLESS_ACTION event', async () => {
    const cs = await import('../../entrypoints/content');
    cs.default.main({ onInvalidated: vi.fn() } as any);
    
    const consoleSpy = vi.spyOn(console, 'log');
    
    const event = new CustomEvent('ORBIT_START_HEADLESS_ACTION', {
      detail: { action_name: 'Test Action' }
    });
    window.dispatchEvent(event);
    
    expect(consoleSpy).toHaveBeenCalledWith('Headless bot requested action:', 'Test Action');
  });
});
