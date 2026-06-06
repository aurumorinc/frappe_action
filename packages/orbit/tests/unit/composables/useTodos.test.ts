import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTodos } from '../../../src/composables/useTodos';
import * as authService from '../../../src/services/auth';
import * as apiService from '../../../src/services/api';

vi.mock('../../../src/services/auth', () => ({
  getSites: vi.fn()
}));

vi.mock('../../../src/services/api', () => ({
  fetchReportFromSites: vi.fn(),
  fetchOpenTodosFromSites: vi.fn(),
  fetchSubTodosFromSite: vi.fn(),
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

  it('fetchTodos populates actions', async () => {
    const mockSites = [{ url: 'http://test', accessToken: 'token' }];
    vi.mocked(authService.getSites).mockResolvedValueOnce(mockSites as any);
    
    const mockReport = { totalOpen: 2, completedToday: 1 };
    vi.mocked(apiService.fetchReportFromSites).mockResolvedValueOnce(mockReport);

    const mockTodos = [
      { name: 'parent', status: 'Open' }
    ];
    vi.mocked(apiService.fetchOpenTodosFromSites).mockResolvedValueOnce(mockTodos);
    
    const { fetchTodos, actions, visibleActions, reportData } = useTodos();
    
    await fetchTodos();
    
    expect(actions.value).toHaveLength(1);
    expect(visibleActions.value[0].name).toBe('parent');
    expect(reportData.value.totalOpen).toBe(2);
  });

  it('skip updates status and calls api', async () => {
    const { actions, skip } = useTodos();
    actions.value = [{ name: 'todo1', completed: false, site: {} }];
    
    // Mock fetchTodos to prevent error during refreshCurrentView
    vi.mocked(authService.getSites).mockResolvedValueOnce([]);

    await skip('todo1');
    
    expect(actions.value[0].completed).toBe(true);
    expect(apiService.updateTodoStatus).toHaveBeenCalledWith({}, 'todo1', 'Cancelled');
  });
});
