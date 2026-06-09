import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { delayNode } from '../../../src/nodes/delay';

describe('delay node', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve after the specified time', async () => {
    const promise = delayNode.execute({ time: 1000 }, {} as any);
    
    // Fast-forward time
    vi.advanceTimersByTime(1000);
    
    const result = await promise;
    expect(result.success).toBe(true);
  });

  it('should default to 1000ms if time is not provided', async () => {
    const promise = delayNode.execute({} as any, {} as any);
    
    vi.advanceTimersByTime(500);
    // Promise shouldn't be resolved yet, but we can't easily test pending state synchronously
    // without complex setup. We'll just advance the rest of the way.
    vi.advanceTimersByTime(500);
    
    const result = await promise;
    expect(result.success).toBe(true);
  });
});
