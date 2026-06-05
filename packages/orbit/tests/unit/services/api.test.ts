import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateTodoStatus, fetchTodosFromSites, fetchActionGraph } from '../../../src/services/api';

describe('api.ts', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('updateTodoStatus returns true on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);
    const result = await updateTodoStatus({ url: 'http://test', accessToken: 'token' }, 'todo1', 'Closed');
    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledWith('http://test/api/resource/ToDo/todo1', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ status: 'Closed' })
    }));
  });

  it('updateTodoStatus returns false on failure', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    const result = await updateTodoStatus({ url: 'http://test', accessToken: 'token' }, 'todo1', 'Closed');
    expect(result).toBe(false);
  });

  it('fetchTodosFromSites returns combined todos', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ name: 'todo1' }] })
    } as Response);
    
    const sites = [{ url: 'http://test', accessToken: 'token' }];
    const result = await fetchTodosFromSites(sites);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('todo1');
    expect(result[0].site).toBe(sites[0]);
  });

  it('fetchActionGraph returns message on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: { compiled_json: '{}' } })
    } as Response);
    
    const result = await fetchActionGraph({ url: 'http://test', accessToken: 'token' }, 'action1');
    expect(result).toEqual({ compiled_json: '{}' });
  });
});
