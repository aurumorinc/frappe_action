export async function updateTodoStatus(site: any, todoName: string, status: string) {
  try {
    const response = await fetch(`${site.url}/api/resource/ToDo/${todoName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${site.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
      console.error(`Failed to update todo ${todoName} on ${site.url}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Error updating todo ${todoName} on ${site.url}:`, error);
    return false;
  }
}

export async function fetchReportFromSites(sites: any[]) {
  let totalOpen = 0;
  let completedToday = 0;
  
  for (const site of sites) {
    try {
      const response = await fetch(`${site.url}/api/method/frappe_orbit.todo.get_report`, {
        headers: { 'Authorization': `Bearer ${site.accessToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.message) {
          totalOpen += data.message.total_open || 0;
          completedToday += data.message.completed_today || 0;
        }
      }
    } catch (error) {
      console.error(`Failed to fetch report from ${site.url}:`, error);
    }
  }
  return { totalOpen, completedToday };
}

export async function fetchOpenTodosFromSites(sites: any[]) {
  let allOpenTodos: any[] = [];
  let allRecentClosed: any[] = [];
  
  for (const site of sites) {
    try {
      const response = await fetch(`${site.url}/api/method/frappe_orbit.todo.get_open?limit=9`, {
        headers: { 'Authorization': `Bearer ${site.accessToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.message) {
          if (data.message.open_todos) {
            const siteOpenTodos = data.message.open_todos.map((todo: any) => ({ ...todo, site }));
            allOpenTodos = [...allOpenTodos, ...siteOpenTodos];
          }
          if (data.message.recent_closed) {
            const siteRecentClosed = data.message.recent_closed.map((todo: any) => ({ ...todo, site }));
            allRecentClosed = [...allRecentClosed, ...siteRecentClosed];
          }
        }
      }
    } catch (error) {
      console.error(`Failed to fetch open todos from ${site.url}:`, error);
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
  
  return [...finalOpen, ...finalClosed];
}

export async function fetchSubTodosFromSite(site: any, parentId: string) {
  try {
    const response = await fetch(`${site.url}/api/method/frappe_orbit.todo.get_sub?parent_id=${parentId}`, {
      headers: { 'Authorization': `Bearer ${site.accessToken}` }
    });
    if (response.ok) {
      const data = await response.json();
      if (data.message) {
        return data.message.map((todo: any) => ({ ...todo, site }));
      }
    }
    return [];
  } catch (error) {
    console.error(`Failed to fetch sub todos for ${parentId} from ${site.url}:`, error);
    return [];
  }
}

export async function fetchActionGraph(site: any, actionName: string) {
  try {
    const response = await fetch(`${site.url}/api/method/frappe_orbit.action.get?name=${actionName}`, {
      headers: { 'Authorization': `Bearer ${site.accessToken}` }
    });
    if (response.ok) {
      const data = await response.json();
      return data.message;
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch action graph for ${actionName} on ${site.url}:`, error);
    return null;
  }
}
