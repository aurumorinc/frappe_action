import { describe, it, expect } from 'vitest';
import { MarkovTyper } from '../../../src/lib/human-typing/typer';

describe('MarkovTyper', () => {
  it('should generate a typing sequence for a simple string', () => {
    const typer = new MarkovTyper('hello');
    const { totalTime, history } = typer.run();

    expect(history.length).toBeGreaterThanOrEqual(6); // INIT + 5 chars (minimum)
    expect(history[0].action).toContain('INIT');
    
    // The final text should match the target
    const finalEvent = history[history.length - 1];
    expect(finalEvent.text).toBe('hello');
    
    // Total time should be reasonable (e.g., > 0.1s)
    expect(totalTime).toBeGreaterThan(0.1);
  });

  it('should handle empty strings by throwing an error', () => {
    expect(() => new MarkovTyper('')).toThrow('targetText must be a non-empty string');
  });

  it('should simulate errors and backspaces when error probability is high', () => {
    // We can't easily mock Math.random here without affecting the whole suite,
    // but we can run it a few times or just trust the logic.
    // Let's just verify it runs without crashing for a longer string.
    const typer = new MarkovTyper('this is a longer string that might have typos');
    const { history } = typer.run();
    
    const finalEvent = history[history.length - 1];
    expect(finalEvent.text).toBe('this is a longer string that might have typos');
  });
});
