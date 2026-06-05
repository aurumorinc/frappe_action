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

export async function fetchTodosFromSites(sites: any[]) {
  let allTodos: any[] = [];
  for (const site of sites) {
    try {
      const response = await fetch(`${site.url}/api/resource/ToDo?fields=["name","description","status","depends_on","action"]&limit_page_length=20`, {
        headers: {
          'Authorization': `Bearer ${site.accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          const siteTodos = data.data.map((todo: any) => ({
            ...todo,
            site: site
          }));
          allTodos = [...allTodos, ...siteTodos];
        }
      }
    } catch (error) {
      console.error(`Failed to fetch todos from ${site.url}:`, error);
    }
  }
  return allTodos;
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
