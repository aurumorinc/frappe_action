import { describe, it, expect, beforeEach } from 'vitest';
import { domObserver } from '../../lib/dom_observer';

describe('DOM Observer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should extract innerText from existing element', async () => {
    document.body.innerHTML = '<div id="target">Hello World</div>';

    const result = await domObserver({
      target_selector: '#target',
      extract_target: 'innerText'
    });

    expect(result.success).toBe(true);
    expect(result.success && result.value).toBe('Hello World');
  });

  it('should wait for element to appear and extract innerText', async () => {
    const promise = domObserver({
      target_selector: '#target',
      extract_target: 'innerText'
    });

    setTimeout(() => {
      const div = document.createElement('div');
      div.id = 'target';
      div.innerText = 'Delayed Hello';
      document.body.appendChild(div);
    }, 10);

    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.success && result.value).toBe('Delayed Hello');
  });
});
