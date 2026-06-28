import { describe, it, expect, beforeEach } from 'vitest';
import FindElement from '../../../src/nodes/FindElement';

describe('FindElement', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="test-container">
        <p class="description">cat</p>
        <p class="description">dog</p>
        <span block--123>marked</span>
      </div>
    `;
  });

  it('should find element by css selector', () => {
    const el = FindElement.cssSelector({ selector: '.description' });
    expect(el).not.toBeNull();
    expect((el as Element).textContent).toBe('cat');
  });

  it('should find multiple elements by css selector', () => {
    const els = FindElement.cssSelector({ selector: '.description', multiple: true });
    expect(els).not.toBeNull();
    expect((els as NodeListOf<Element>).length).toBe(2);
  });

  it('should exclude marked elements', () => {
    const el = FindElement.cssSelector({ selector: 'span', markEl: true, blockIdAttr: 'block--123' });
    expect(el).toBeNull();
  });

  it('should find element by xpath', () => {
    const el = FindElement.xpath({ selector: '//p[@class="description"]' });
    expect(el).not.toBeNull();
    expect((el as Node).textContent).toBe('cat');
  });

  it('should find multiple elements by xpath', () => {
    const els = FindElement.xpath({ selector: '//p[@class="description"]', multiple: true });
    expect(els).not.toBeNull();
    expect((els as Node[]).length).toBe(2);
  });
});
