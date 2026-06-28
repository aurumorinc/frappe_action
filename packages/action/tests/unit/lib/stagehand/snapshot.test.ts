import { describe, it, expect, beforeEach } from 'vitest';
import { captureSnapshot } from '../../../../src/lib/stagehand/snapshot';

describe('captureSnapshot', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Mock window.getComputedStyle to always return visible for tests
    Object.defineProperty(window, 'getComputedStyle', {
      value: () => ({
        display: 'block',
        visibility: 'visible',
        opacity: '1'
      })
    });
    
    // Mock offsetWidth and offsetHeight
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 100 });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 100 });
  });

  it('should capture interactive elements and generate correct XPaths', () => {
    document.body.innerHTML = `
      <div>
        <button id="login-btn">Login</button>
        <input type="text" placeholder="Username" />
        <a href="/forgot">Forgot Password</a>
        <p>Just some text</p>
      </div>
    `;

    const result = captureSnapshot();

    // Should find 3 interactive elements (button, input, a)
    expect(Object.keys(result.xpathMap).length).toBe(3);
    
    // Check domText
    expect(result.domText).toContain('[1] button "Login"');
    expect(result.domText).toContain('[2] input "Username"');
    expect(result.domText).toContain('[3] a "Forgot Password"');

    // Check XPaths
    expect(result.xpathMap['1']).toBe('id("login-btn")');
    expect(result.xpathMap['2']).toBe('BODY/DIV[1]/INPUT[1]');
    expect(result.xpathMap['3']).toBe('BODY/DIV[1]/A[1]');
  });

  it('should ignore non-interactive elements', () => {
    document.body.innerHTML = `
      <div>
        <span>Not interactive</span>
        <div role="button">Interactive Div</div>
      </div>
    `;

    const result = captureSnapshot();

    expect(Object.keys(result.xpathMap).length).toBe(1);
    expect(result.domText).toContain('[1] div "Interactive Div"');
  });
});
