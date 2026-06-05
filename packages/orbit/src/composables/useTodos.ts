import { ref, computed, markRaw } from 'vue';
import { getSites } from '../services/auth';
import { fetchTodosFromSites, updateTodoStatus, fetchActionGraph } from '../services/api';
import { startAction } from '../services/extension';
import TaskIcon from '../icons/TaskIcon.vue';
import logger from '../utils/logger';

export function useTodos() {
  const steps = ref<any[]>([]);
  const isLoading = ref(true);
  const hasAuthenticatedSites = ref(false);
  const isOnboardingStepsCompleted = ref(false);

  const totalSteps = computed(() => steps.value.length);
  const stepsCompleted = computed(() => steps.value.filter(s => s.completed).length);
  const completedPercentage = computed(() => totalSteps.value === 0 ? 0 : Math.round((stepsCompleted.value / totalSteps.value) * 100) || 0);

  const visibleSteps = computed(() => {
    const sorted: any[] = [];
    const parentMap = new Map();
    const rootSteps: any[] = [];

    steps.value.forEach(step => {
      if (step.dependsOn) {
        if (!parentMap.has(step.dependsOn)) {
          parentMap.set(step.dependsOn, []);
        }
        parentMap.get(step.dependsOn).push(step);
      } else {
        rootSteps.push(step);
      }
    });

    rootSteps.forEach(root => {
      sorted.push(root);
      if (parentMap.has(root.name)) {
        sorted.push(...parentMap.get(root.name));
      }
    });

    steps.value.forEach(step => {
      if (step.dependsOn && !sorted.includes(step)) {
        sorted.push(step);
      }
    });

    return sorted.slice(0, 9);
  });

  function isDependent(step: any) {
    if (step.dependsOn && !step.completed) {
      const dependsOnStep = steps.value.find((s) => s.name === step.dependsOn);
      if (dependsOnStep && !dependsOnStep.completed) {
        return true;
      }
    }
    return false;
  }

  function dependsOnTooltip(step: any) {
    if (step.dependsOn && !step.completed) {
      const dependsOnStep = steps.value.find((s) => s.name === step.dependsOn);
      if (dependsOnStep && !dependsOnStep.completed) {
        return `You need to complete "${dependsOnStep.title}" first.`;
      }
    }
    return '';
  }

  async function skip(stepName: string) {
    const step = steps.value.find(s => s.name === stepName);
    if (step) {
      step.completed = true;
      if (step.site) {
        await updateTodoStatus(step.site, step.name, 'Closed');
      }
    }
  }

  async function reset(stepName: string) {
    const step = steps.value.find(s => s.name === stepName);
    if (step) {
      step.completed = false;
      if (step.site) {
        await updateTodoStatus(step.site, step.name, 'Open');
      }
    }
  }

  async function skipAll() {
    for (const step of steps.value) {
      if (!step.completed) {
        step.completed = true;
        if (step.site) {
          await updateTodoStatus(step.site, step.name, 'Closed');
        }
      }
    }
  }

  async function resetAll() {
    for (const step of steps.value) {
      if (step.completed) {
        step.completed = false;
        if (step.site) {
          await updateTodoStatus(step.site, step.name, 'Open');
        }
      }
    }
    isOnboardingStepsCompleted.value = false;
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
      const allTodos = await fetchTodosFromSites(sites);
      
      steps.value = allTodos.map((todo: any) => ({
        name: todo.name,
        title: todo.description || todo.name,
        icon: markRaw(TaskIcon),
        completed: todo.status === 'Closed',
        dependsOn: todo.depends_on,
        site: todo.site,
        onClick: async () => {
          logger.debug({ todoName: todo.name }, "Todo clicked");
          if (todo.action) {
            const actionData = await fetchActionGraph(todo.site, todo.action);
            if (actionData && actionData.compiled_json) {
              startAction(todo, JSON.parse(actionData.compiled_json));
            }
          }
        }
      }));
    } catch (error) {
      logger.error({ err: error }, "Error fetching sites or todos");
    } finally {
      isLoading.value = false;
    }
  }

  return {
    steps,
    isLoading,
    hasAuthenticatedSites,
    isOnboardingStepsCompleted,
    totalSteps,
    stepsCompleted,
    completedPercentage,
    visibleSteps,
    isDependent,
    dependsOnTooltip,
    skip,
    reset,
    skipAll,
    resetAll,
    fetchTodos
  };
}
