import { describe, it, expect } from 'vitest';
import { path } from '../../../src/lib/ghost-cursor/spoof';

describe('GhostCursor Math', () => {
  it('should generate a path between two points', () => {
    const start = { x: 0, y: 0 };
    const end = { x: 100, y: 100, width: 10, height: 10 };
    
    const vectors = path(start, end);
    
    expect(vectors.length).toBeGreaterThan(0);
    
    // The first point should be close to start
    expect(vectors[0].x).toBeCloseTo(0, -1);
    expect(vectors[0].y).toBeCloseTo(0, -1);
    
    // The last point should be exactly the end point (or very close to it)
    const last = vectors[vectors.length - 1];
    expect(last.x).toBeCloseTo(100, -1);
    expect(last.y).toBeCloseTo(100, -1);
  });

  it('should generate timestamps if requested', () => {
    const start = { x: 0, y: 0 };
    const end = { x: 100, y: 100, width: 10, height: 10 };
    
    const vectors = path(start, end, { useTimestamps: true });
    
    expect(vectors.length).toBeGreaterThan(0);
    expect(vectors[0]).toHaveProperty('timestamp');
    
    // Timestamps should be strictly increasing
    for (let i = 1; i < vectors.length; i++) {
      expect((vectors[i] as any).timestamp).toBeGreaterThanOrEqual((vectors[i-1] as any).timestamp);
    }
  });
});
