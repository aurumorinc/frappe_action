import { describe, it, expect, beforeEach, vi } from 'vitest';
import handleSelector, { markElement } from '../../../src/nodes/handleSelector';
import { isXPath } from '../../../src/nodes/helper';

describe('handleSelector utilities', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="test-container">
        <p class="description">cat</p>
      </div>
    `;
  });

  it('isXPath should correctly identify xpath', () => {
    expect(isXPath('//div')).toBe(true);
    expect(isXPath('(/div)')).toBe(true);
    expect(isXPath('.class')).toBe(false);
  });

  it('markElement should add block attribute', () => {
    const el = document.querySelector('.description')!;
    markElement(el, { id: '123', data: { selector: '', markEl: true } });
    expect(el.hasAttribute('block--123')).toBe(true);
  });

  it('handleSelector should find element and call onSelected', async () => {
    const onSelected = vi.fn();
    const result = await handleSelector(
      { data: { selector: '.description' }, id: '123' },
      { onSelected }
    );
    expect(result).not.toBeNull();
    expect(onSelected).toHaveBeenCalled();
  });
});
