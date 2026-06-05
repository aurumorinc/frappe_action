import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTodos } from '../../../src/composables/useTodos';
import * as authService from '../../../src/services/auth';
import * as apiService from '../../../src/services/api';

vi.mock('../../../src/services/auth', () => ({
  getSites: vi.fn()
}));

vi.mock('../../../src/services/api', () => ({
  fetchTodosFromSites: vi.fn(),
  updateTodoStatus: vi.fn(),
  fetchActionGraph: vi.fn()
}));

vi.mock('../../../src/services/extension', () => ({
  startAction: vi.fn()
}));

describe('useTodos.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchTodos sets hasAuthenticatedSites to false if no sites', async () => {
    vi.mocked(authService.getSites).mockResolvedValueOnce([]);
    const { fetchTodos, hasAuthenticatedSites, isLoading } = useTodos();
    
    await fetchTodos();
    
    expect(hasAuthenticatedSites.value).toBe(false);
    expect(isLoading.value).toBe(false);
  });

  it('fetchTodos populates steps and sorts them', async () => {
    const mockSites = [{ url: 'http://test', accessToken: 'token' }];
    vi.mocked(authService.getSites).mockResolvedValueOnce(mockSites as any);
    
    const mockTodos = [
      { name: 'child', depends_on: 'parent', status: 'Open' },
      { name: 'parent', status: 'Open' }
    ];
    vi.mocked(apiService.fetchTodosFromSites).mockResolvedValueOnce(mockTodos);
    
    const { fetchTodos, steps, visibleSteps } = useTodos();
    
    await fetchTodos();
    
    expect(steps.value).toHaveLength(2);
    // Parent should be first in visibleSteps
    expect(visibleSteps.value[0].name).toBe('parent');
    expect(visibleSteps.value[1].name).toBe('child');
  });

  it('skip updates status and calls api', async () => {
    const { steps, skip } = useTodos();
    steps.value = [{ name: 'todo1', completed: false, site: {} }];
    
    await skip('todo1');
    
    expect(steps.value[0].completed).toBe(true);
    expect(apiService.updateTodoStatus).toHaveBeenCalledWith({}, 'todo1', 'Closed');
  });
});
