import { ref, computed, markRaw } from 'vue';
import { getSites } from '../services/auth';
import { updateTodoStatus, fetchActionGraph } from '../services/api';
import { startAction } from '../services/extension';
import TaskIcon from '../icons/TaskIcon.vue';
import logger from '../utils/logger';

export function useTodos() {
  const actions = ref<any[]>([]);
  const subTasks = ref<any[]>([]);
  const navigationStack = ref<any[]>([]);
  const reportData = ref({ totalOpen: 0, completedToday: 0 });
  
  const isLoading = ref(true);
  const hasAuthenticatedSites = ref(false);
  const isOnboardingStepsCompleted = ref(false);

  const totalActions = computed(() => {
    if (navigationStack.value.length > 0) {
      return subTasks.value.length;
    }
    return reportData.value.totalOpen + reportData.value.completedToday;
  });
  
  const actionsCompleted = computed(() => {
    if (navigationStack.value.length > 0) {
      return subTasks.value.filter(s => s.completed).length;
    }
    return reportData.value.completedToday;
  });
  
  const completedPercentage = computed(() => totalActions.value === 0 ? 0 : Math.round((actionsCompleted.value / totalActions.value) * 100) || 0);

  const visibleActions = computed(() => {
    if (navigationStack.value.length > 0) {
      return subTasks.value;
    }
    return actions.value;
  });

  function isDependent(action: any) {
    if (action.main && !action.completed) {
      const dependsOnAction = visibleActions.value.find((s) => s.name === action.main);
      if (dependsOnAction && !dependsOnAction.completed) {
        return true;
      }
    }
    return false;
  }

  function dependsOnTooltip(action: any) {
    if (action.main && !action.completed) {
      const dependsOnAction = visibleActions.value.find((s) => s.name === action.main);
      if (dependsOnAction && !dependsOnAction.completed) {
        return `You need to complete "${dependsOnAction.title}" first.`;
      }
    }
    return '';
  }

  async function skip(actionName: string) {
    const action = visibleActions.value.find(s => s.name === actionName);
    if (action) {
      action.completed = true;
      if (action.site) {
        await updateTodoStatus(action.site, action.name, 'Cancelled');
        await refreshCurrentView();
      }
    }
  }

  async function close(actionName: string) {
    const action = visibleActions.value.find(s => s.name === actionName);
    if (action) {
      action.completed = true;
      if (action.site) {
        await updateTodoStatus(action.site, action.name, 'Closed');
        await refreshCurrentView();
      }
    }
  }

  async function skipAll() {
    for (const action of visibleActions.value) {
      if (!action.completed) {
        action.completed = true;
        if (action.site) {
          await updateTodoStatus(action.site, action.name, 'Cancelled');
        }
      }
    }
    await refreshCurrentView();
  }

  async function refreshCurrentView() {
    if (navigationStack.value.length > 0) {
      const currentParent = navigationStack.value[navigationStack.value.length - 1];
      await fetchSubTodos(currentParent);
    } else {
      await fetchTodos();
    }
  }

  async function fetchSubTodos(parentTodo: any) {
    isLoading.value = true;
    try {
      const { fetchSubTodosFromSite } = await import('../services/api');
      const rawSubTasks = await fetchSubTodosFromSite(parentTodo.site, parentTodo.name);
      subTasks.value = rawSubTasks.map((todo: any) => mapTodoToAction(todo, parentTodo.site));
    } catch (error) {
      logger.error({ err: error }, "Error fetching sub todos");
    } finally {
      isLoading.value = false;
    }
  }

  async function selectTodo(todo: any) {
    if (todo.action) {
      const actionData = await fetchActionGraph(todo.site, todo.action);
      if (actionData && actionData.compiled_json) {
        startAction(todo, JSON.parse(actionData.compiled_json));
      }
    } else {
      navigationStack.value.push(todo);
      await fetchSubTodos(todo);
    }
  }

  async function goBack() {
    navigationStack.value.pop();
    if (navigationStack.value.length === 0) {
      subTasks.value = [];
      await fetchTodos();
    } else {
      const currentParent = navigationStack.value[navigationStack.value.length - 1];
      await fetchSubTodos(currentParent);
    }
  }

  function mapTodoToAction(todo: any, site: any) {
    let title = todo.name;
    if (todo.description) {
      try {
        const doc = new DOMParser().parseFromString(todo.description, 'text/html');
        title = doc.body.textContent || doc.body.innerText || todo.name;
      } catch (e) {
        title = todo.description.replace(/<[^>]*>?/gm, '') || todo.name;
      }
    }
    
    return {
      name: todo.name,
      title: title,
      icon: markRaw(TaskIcon),
      completed: todo.status === 'Closed' || todo.status === 'Cancelled',
      main: todo.main,
      action: todo.action,
      site: site,
      onClick: () => selectTodo({ ...todo, site })
    };
  }

  async function fetchTodos() {
    isLoading.value = true;
    try {
      const sites = await getSites();
      if (sites.length === 0) {
        hasAuthenticatedSites.value = false;
        isLoading.value = false;
        return;
      }
      
      hasAuthenticatedSites.value = true;
      
      const { fetchReportFromSites, fetchOpenTodosFromSites } = await import('../services/api');
      
      const report = await fetchReportFromSites(sites);
      reportData.value = { totalOpen: report.totalOpen, completedToday: report.completedToday };
      
      const allTodos = await fetchOpenTodosFromSites(sites);
      actions.value = allTodos.map((todo: any) => mapTodoToAction(todo, todo.site));
      
    } catch (error) {
      logger.error({ err: error }, "Error fetching sites or todos");
    } finally {
      isLoading.value = false;
    }
  }

  return {
    actions,
    subTasks,
    navigationStack,
    reportData,
    isLoading,
    hasAuthenticatedSites,
    isOnboardingStepsCompleted,
    totalActions,
    actionsCompleted,
    completedPercentage,
    visibleActions,
    isDependent,
    dependsOnTooltip,
    skip,
    close,
    skipAll,
    selectTodo,
    goBack,
    fetchTodos
  };
}
