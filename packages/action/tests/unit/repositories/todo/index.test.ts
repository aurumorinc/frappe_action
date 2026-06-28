import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateTodoStatus, fetchReportFromSites, fetchOpenTodosFromSites, fetchSubTodosFromSite, submitTodo, createSubTask } from '../../../../src/repositories/todo';
import { SiteAuth } from '../../../../src/models/auth';
import { Todo } from '../../../../src/models/todo';

// Mock global fetch
global.fetch = vi.fn();

describe('Todo Repository', () => {
  const mockSite: SiteAuth = {
    id: '1',
    url: 'https://test.com',
    clientId: 'client1',
    accessToken: 'token1',
    refreshToken: 'refresh1',
    expiresAt: 1234567890,
    isActive: true
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('updateTodoStatus', () => {
    it('should return success Result on valid API response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      const result = await updateTodoStatus(mockSite, 'TODO-001', 'Closed');
      
      expect(result).toEqual({ success: true, data: true });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.com/api/resource/ToDo/TODO-001',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'Closed' })
        })
      );
    });

    it('should return failure Result on API error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false
      });

      const result = await updateTodoStatus(mockSite, 'TODO-001', 'Closed');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Failed to update todo TODO-001');
      }
    });
  });

  describe('fetchReportFromSites', () => {
    it('should aggregate reports from multiple sites', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: { total_open: 5, completed_today: 2 } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: { total_open: 3, completed_today: 1 } })
        });

      const site2 = { ...mockSite, url: 'https://test2.com' };
      const result = await fetchReportFromSites([mockSite, site2]);
      
      expect(result).toEqual({ success: true, data: { totalOpen: 8, completedToday: 3 } });
    });
  });

  describe('fetchOpenTodosFromSites', () => {
    it('should fetch and sort open todos', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            open_todos: [
              { name: 'TODO-1', priority: 'High', creation: '2023-01-01' },
              { name: 'TODO-2', priority: 'Low', creation: '2023-01-02' }
            ],
            recent_closed: [
              { name: 'TODO-3', modified: '2023-01-03' }
            ]
          }
        })
      });

      const result = await fetchOpenTodosFromSites([mockSite]);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(3);
        expect(result.data[0].name).toBe('TODO-1'); // High priority first
        expect(result.data[2].name).toBe('TODO-3'); // Recent closed last
      }
    });
  });
});
