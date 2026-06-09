import logger from '../../utils/logging';
import { SiteAuth } from '../../models/auth';
import { Todo, TodoReport } from '../../models/todo';
import { Result } from '../../nodes/types';

export async function fetchActionGraph(site: SiteAuth, actionName: string): Promise<Result<{ compiled_json: string }>> {
  try {
    const response = await fetch(`${site.url}/api/method/frappe_orbit.action.get?name=${actionName}`, {
      headers: { 'Authorization': `Bearer ${site.accessToken}` },
      credentials: 'omit'
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, data: data.message };
    }
    return { success: false, error: String(new Error(`Failed to fetch action graph for ${actionName}`)) };
  } catch (error) {
    logger.error({ err: error, siteUrl: site.url, actionName }, `Failed to fetch action graph for ${actionName} on ${site.url}`);
    return { success: false, error: String(error as Error) };
  }
}

export async function updateTodoStatus(site: SiteAuth, todoName: string, status: string, traceparent?: string): Promise<Result<boolean>> {
  try {
    const response = await fetch(`${site.url}/api/resource/ToDo/${todoName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${site.accessToken}`,
        'Content-Type': 'application/json',
        ...(traceparent ? { 'traceparent': traceparent } : {})
      },
      credentials: 'omit',
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
      logger.error({ siteUrl: site.url, todoName }, `Failed to update todo ${todoName} on ${site.url}`);
      return { success: false, error: String(new Error(`Failed to update todo ${todoName}`)) };
    }
    return { success: true, data: true };
  } catch (error) {
    logger.error({ err: error, siteUrl: site.url, todoName }, `Error updating todo ${todoName} on ${site.url}`);
    return { success: false, error: String(error as Error) };
  }
}

export async function fetchReportFromSites(sites: SiteAuth[]): Promise<Result<TodoReport>> {
  let totalOpen = 0;
  let completedToday = 0;
  
  for (const site of sites) {
    try {
      const response = await fetch(`${site.url}/api/method/frappe_orbit.todo.get_report`, {
        headers: { 'Authorization': `Bearer ${site.accessToken}` },
        credentials: 'omit'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.message) {
          totalOpen += data.message.total_open || 0;
          completedToday += data.message.completed_today || 0;
        }
      }
    } catch (error) {
      logger.error({ err: error, siteUrl: site.url }, `Failed to fetch report from ${site.url}`);
    }
  }
  return { success: true, data: { totalOpen, completedToday } };
}

export async function fetchOpenTodosFromSites(sites: SiteAuth[]): Promise<Result<Todo[]>> {
  let allOpenTodos: Todo[] = [];
  let allRecentClosed: Todo[] = [];
  
  for (const site of sites) {
    try {
      const response = await fetch(`${site.url}/api/method/frappe_orbit.todo.get_open?limit=9`, {
        headers: { 'Authorization': `Bearer ${site.accessToken}` },
        credentials: 'omit'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.message) {
          if (data.message.open_todos) {
            const siteOpenTodos = data.message.open_todos.map((todo: Todo) => ({ ...todo, site }));
            allOpenTodos = [...allOpenTodos, ...siteOpenTodos];
          }
          if (data.message.recent_closed) {
            const siteRecentClosed = data.message.recent_closed.map((todo: Todo) => ({ ...todo, site }));
            allRecentClosed = [...allRecentClosed, ...siteRecentClosed];
          }
        }
      }
    } catch (error) {
      logger.error({ err: error, siteUrl: site.url }, `Failed to fetch open todos from ${site.url}`);
    }
  }
  
  // Sort open todos by priority desc, creation asc across all sites
  allOpenTodos.sort((a, b) => {
    const priorityOrder: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
    const pA = priorityOrder[a.priority] || 0;
    const pB = priorityOrder[b.priority] || 0;
    if (pA !== pB) return pB - pA;
    return new Date(a.creation).getTime() - new Date(b.creation).getTime();
  });
  
  // Sort recent closed by modified desc across all sites
  allRecentClosed.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
  
  // Take top 9 open, and 1 most recent closed
  const finalOpen = allOpenTodos.slice(0, 9);
  const finalClosed = allRecentClosed.slice(0, 1);
  
  return { success: true, data: [...finalOpen, ...finalClosed] };
}

export async function fetchSubTodosFromSite(site: SiteAuth, parentId: string): Promise<Result<Todo[]>> {
  try {
    const response = await fetch(`${site.url}/api/method/frappe_orbit.todo.get_sub?parent_id=${parentId}`, {
      headers: { 'Authorization': `Bearer ${site.accessToken}` },
      credentials: 'omit'
    });
    if (response.ok) {
      const data = await response.json();
      if (data.message) {
        return { success: true, data: data.message.map((todo: Todo) => ({ ...todo, site })) };
      }
    }
    return { success: true, data: [] };
  } catch (error) {
    logger.error({ err: error, siteUrl: site.url, parentId }, `Failed to fetch sub todos for ${parentId} from ${site.url}`);
    return { success: false, error: String(error as Error) };
  }
}

export async function submitTodo(site: SiteAuth, todo: Todo, scrapedData: Record<string, unknown>): Promise<Result<boolean>> {
  try {
    const traceparent = todo.traceparent;
    const response = await fetch(`${site.url}/api/method/frappe_orbit.todo.submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${site.accessToken}`,
        'Content-Type': 'application/json',
        ...(traceparent ? { 'traceparent': traceparent } : {})
      },
      credentials: 'omit',
      body: JSON.stringify({
        doc: {
          ...todo,
          response_body: JSON.stringify(scrapedData),
          status: 'Closed'
        }
      })
    });
    if (!response.ok) {
      return { success: false, error: String(new Error(`Failed to submit todo ${todo.name}`)) };
    }
    return { success: true, data: true };
  } catch (error) {
    logger.error({ err: error, siteUrl: site.url }, "Failed to submit task data");
    return { success: false, error: String(error as Error) };
  }
}

export async function createSubTask(site: SiteAuth, parentTodo: Todo, message: string): Promise<Result<Todo>> {
  try {
    const traceparent = parentTodo.traceparent;
    const response = await fetch(`${site.url}/api/resource/ToDo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${site.accessToken}`,
        'Content-Type': 'application/json',
        ...(traceparent ? { 'traceparent': traceparent } : {})
      },
      credentials: 'omit',
      body: JSON.stringify({
        description: message,
        main: parentTodo.name,
        status: 'Open'
      })
    });
    if (!response.ok) {
      return { success: false, error: String(new Error(`Failed to create sub-task for ${parentTodo.name}`)) };
    }
    const newTodo = await response.json();
    return { success: true, data: newTodo.data };
  } catch (error) {
    logger.error({ err: error, siteUrl: site.url }, "Failed to create sub-task");
    return { success: false, error: String(error as Error) };
  }
}
