// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { domObserver } from '../../../src/utils/dom_observer';

describe('domObserver', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should extract inner text when element exists', async () => {
    document.body.innerHTML = '<div id="target">Hello World</div>';
    
    const promise = domObserver({ target_selector: '#target', extract_target: 'innerText' });
    const result = await promise;
    
    expect(result).toEqual({ success: true, value: 'Hello World' });
  });

  it('should timeout when element does not appear', async () => {
    const promise = domObserver({ target_selector: '#missing', extract_target: 'innerText' });
    
    vi.advanceTimersByTime(30000);
    
    const result = await promise;
    expect(result).toEqual({ success: false, error: new Error('Timeout waiting for element') });
  });

  it('should extract attribute value', async () => {
    document.body.innerHTML = '<a id="link" href="https://example.com">Link</a>';
    
    const promise = domObserver({ target_selector: '#link', extract_target: 'href' });
    const result = await promise;
    
    expect(result).toEqual({ success: true, value: 'https://example.com/' });
  });
});
