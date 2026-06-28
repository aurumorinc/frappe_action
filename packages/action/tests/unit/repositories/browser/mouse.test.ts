import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MouseRepository } from '../../../../src/repositories/browser/mouse';
import { GhostCursor } from '../../../../src/lib/ghost-cursor/spoof';

vi.mock('../../../../src/lib/ghost-cursor/spoof', () => {
  return {
    GhostCursor: vi.fn(function() {
      return {
        click: vi.fn().mockResolvedValue(undefined),
        move: vi.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

describe('MouseRepository', () => {
  let mouseRepo: MouseRepository;
  const tabId = 123;

  beforeEach(() => {
    vi.clearAllMocks();
    mouseRepo = new MouseRepository(tabId);
  });

  it('should initialize GhostCursor with the correct tabId', () => {
    expect(GhostCursor).toHaveBeenCalledWith(tabId);
  });

  it('should call cursor.click with the correct bounding box', async () => {
    const box = { x: 10, y: 20, width: 100, height: 50 };
    await mouseRepo.click(box);
    
    const mockCursorInstance = vi.mocked(GhostCursor).mock.results[0].value;
    expect(mockCursorInstance.click).toHaveBeenCalledWith(box);
  });

  it('should call cursor.move with the correct bounding box', async () => {
    const box = { x: 10, y: 20, width: 100, height: 50 };
    await mouseRepo.move(box);
    
    const mockCursorInstance = vi.mocked(GhostCursor).mock.results[0].value;
    expect(mockCursorInstance.move).toHaveBeenCalledWith(box);
  });
});
