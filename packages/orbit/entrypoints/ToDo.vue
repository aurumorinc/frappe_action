<template>
  <div
    v-show="show"
    class="fixed z-50 right-0 w-80 h-[calc(100%_-_80px)] text-ink-gray-9 m-5 mt-[62px] p-3 flex gap-2 flex-col justify-between rounded-lg bg-surface-modal shadow-2xl"
    :class="{ 'top-[calc(100%_-_120px)] border': minimize }"
    @click.stop
  >
    <div class="flex items-center justify-between px-2 py-1.5">
      <div class="text-base font-medium">
        {{ headingTitle }}
      </div>
      <div class="flex gap-1">
        <Dropdown v-if="options.length" :options="options">
          <Button variant="ghost" icon="more-horizontal" />
        </Dropdown>
        <Button @click="minimize = !minimize" variant="ghost">
          <component
            :is="minimize ? MaximizeIcon : MinimizeIcon"
            class="h-3.5"
          />
        </Button>
        <Button variant="ghost" @click="show = false">
          <FeatherIcon name="x" class="h-3.5" />
        </Button>
      </div>
    </div>
    <div class="h-full overflow-hidden flex flex-col">
      <!-- OnboardingSteps content -->
      <div v-if="!isOnboardingStepsCompleted && !showHelpCenter" class="h-full overflow-hidden flex flex-col">
        <div class="flex flex-col justify-center items-center gap-1 mt-4 mb-7">
          <component :is="logo" class="size-10 shrink-0 rounded mb-4" />
          <div class="text-base font-medium">
            {{ 'Welcome to ' + title }}
          </div>
          <div class="text-p-base font-normal">
            {{ `${stepsCompleted}/${totalSteps} todos completed` }}
          </div>
        </div>
        
        <div v-if="isLoading" class="flex justify-center items-center h-full">
          <div class="text-ink-gray-5">Loading todos...</div>
        </div>
        <div v-else-if="!hasAuthenticatedSites" class="flex justify-center items-center h-full text-center px-4">
          <div class="text-ink-gray-5">No authenticated sites found. Please authenticate with a Frappe site to see your todos.</div>
        </div>
        <div v-else-if="steps.length === 0" class="flex justify-center items-center h-full text-center px-4">
          <div class="text-ink-gray-5">You have no pending todos. Great job!</div>
        </div>
        <div v-else class="flex flex-col gap-2.5 overflow-hidden">
          <div class="flex justify-between items-center py-0.5">
            <Badge
              :label="`${completedPercentage}% completed`"
              :theme="completedPercentage == 100 ? 'green' : 'orange'"
              size="lg"
            />
            <div class="flex">
              <Button
                v-if="completedPercentage != 0"
                variant="ghost"
                :label="'Reset'"
                @click="() => resetAll()"
              />
              <Button
                v-if="completedPercentage != 100"
                variant="ghost"
                :label="'Mark Completed'"
                @click="() => skipAll()"
              />
            </div>
          </div>
          <div class="flex flex-col gap-1.5 overflow-y-auto">
            <div
              v-for="step in visibleSteps"
              :key="step.name"
              class="group w-full flex gap-2 justify-between items-center hover:bg-surface-gray-1 rounded px-2 py-1.5 cursor-pointer"
              :class="{ 'ml-6 border-l-2 border-surface-gray-3 pl-3': step.dependsOn }"
              @click.stop="
                () => !step.completed && !isDependent(step) && step.onClick()
              "
            >
              <component
                :is="isDependent(step) ? Tooltip : 'div'"
                :text="dependsOnTooltip(step)"
              >
                <div
                  class="flex gap-2 items-center"
                  :class="[
                    step.completed
                      ? 'text-ink-gray-5'
                      : isDependent(step)
                        ? 'text-ink-gray-4'
                        : 'text-ink-gray-8',
                  ]"
                >
                  <component :is="step.icon" class="h-4" />
                  <div class="text-base" :class="{ 'line-through': step.completed }">
                    {{ step.title }}
                  </div>
                </div>
              </component>
              <Button
                v-if="!step.completed && !isDependent(step)"
                :label="'Mark Completed'"
                class="!h-4 text-xs !text-ink-gray-6 hidden group-hover:flex"
                @click.stop="() => skip(step.name)"
              />
              <Button
                v-else-if="!isDependent(step)"
                :label="'Reset'"
                class="!h-4 text-xs !text-ink-gray-6 hidden group-hover:flex"
                @click.stop="() => reset(step.name)"
              />
            </div>
          </div>
        </div>
      </div>
      <!-- HelpCenter content (mocked for now) -->
      <div v-else-if="showHelpCenter" class="h-full overflow-hidden flex flex-col">
        <div class="p-4 text-center text-ink-gray-5">
          Help Center Content
        </div>
      </div>
    </div>
    <div v-for="item in footerItems" class="flex flex-col gap-1.5">
      <div
        class="w-full flex gap-2 items-center hover:bg-surface-gray-1 text-ink-gray-8 rounded px-2 py-1.5 cursor-pointer"
        @click="item.onClick"
      >
        <component :is="item.icon" class="h-4" />
        <div class="text-base">{{ item.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, markRaw, onMounted } from 'vue'
import Dropdown from '../node_modules/frappe-ui/src/components/Dropdown/Dropdown.vue'
import Button from '../node_modules/frappe-ui/src/components/Button/Button.vue'
import Badge from '../node_modules/frappe-ui/src/components/Badge/Badge.vue'
import Tooltip from '../node_modules/frappe-ui/src/components/Tooltip/Tooltip.vue'
import FeatherIcon from '../node_modules/frappe-ui/src/components/FeatherIcon.vue'

import StepsIcon from '../icons/StepsIcon.vue'
import MinimizeIcon from '../icons/MinimizeIcon.vue'
import MaximizeIcon from '../icons/MaximizeIcon.vue'
import HelpIcon from '../icons/HelpIcon.vue'
import CRMLogo from '../icons/CRMLogo.vue'
import TaskIcon from '../icons/TaskIcon.vue'

import { getSites } from '../lib/auth_storage'

// Mock state
const show = ref(true)
const minimize = ref(false)
const showHelpCenter = ref(false)
const isOnboardingStepsCompleted = ref(false)
const isLoading = ref(true)
const hasAuthenticatedSites = ref(false)

const title = 'Frappe Orbit'
const logo = markRaw(CRMLogo)

const steps = ref([])

const totalSteps = computed(() => steps.value.length)
const stepsCompleted = computed(() => steps.value.filter(s => s.completed).length)
const completedPercentage = computed(() => totalSteps.value === 0 ? 0 : Math.round((stepsCompleted.value / totalSteps.value) * 100) || 0)
const visibleSteps = computed(() => {
  // Sort steps so that children appear immediately after their parents
  const sorted = [];
  const parentMap = new Map();
  const rootSteps = [];

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

  // Add any orphaned children just in case
  steps.value.forEach(step => {
    if (step.dependsOn && !sorted.includes(step)) {
      sorted.push(step);
    }
  });

  return sorted.slice(0, 9);
})

const headingTitle = computed(() => {
  if (!isOnboardingStepsCompleted.value && !showHelpCenter.value) {
    return 'Getting started'
  } else if (showHelpCenter.value) {
    return 'Help center'
  }
})

const options = computed(() => {
  let items = [
    {
      icon: StepsIcon,
      label: 'Reset onboarding steps',
      onClick: resetAll,
      condition: () => showHelpCenter.value && isOnboardingStepsCompleted.value,
    },
  ]
  return items.filter((item) => item.condition())
})

const footerItems = computed(() => {
  let items = [
    {
      icon: HelpIcon,
      label: 'Help centre',
      onClick: () => {
        showHelpCenter.value = true
      },
      condition: !isOnboardingStepsCompleted.value && !showHelpCenter.value,
    },
    {
      icon: StepsIcon,
      label: 'Getting started',
      onClick: () => (showHelpCenter.value = false),
      condition: showHelpCenter.value && !isOnboardingStepsCompleted.value,
    },
  ]
  return items.filter((item) => item.condition)
})

function isDependent(step) {
  if (step.dependsOn && !step.completed) {
    const dependsOnStep = steps.value.find((s) => s.name === step.dependsOn)
    if (dependsOnStep && !dependsOnStep.completed) {
      return true
    }
  }
  return false
}

function dependsOnTooltip(step) {
  if (step.dependsOn && !step.completed) {
    const dependsOnStep = steps.value.find((s) => s.name === step.dependsOn)
    if (dependsOnStep && !dependsOnStep.completed) {
      return `You need to complete "${dependsOnStep.title}" first.`
    }
  }
  return ''
}

async function updateTodoStatus(site, todoName, status) {
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
    }
  } catch (error) {
    console.error(`Error updating todo ${todoName} on ${site.url}:`, error);
  }
}

async function skip(stepName) {
  const step = steps.value.find(s => s.name === stepName)
  if (step) {
    step.completed = true
    if (step.site) {
      await updateTodoStatus(step.site, step.name, 'Closed')
    }
  }
}

async function reset(stepName) {
  const step = steps.value.find(s => s.name === stepName)
  if (step) {
    step.completed = false
    if (step.site) {
      await updateTodoStatus(step.site, step.name, 'Open')
    }
  }
}

async function skipAll() {
  for (const step of steps.value) {
    if (!step.completed) {
      step.completed = true
      if (step.site) {
        await updateTodoStatus(step.site, step.name, 'Closed')
      }
    }
  }
}

async function resetAll() {
  for (const step of steps.value) {
    if (step.completed) {
      step.completed = false
      if (step.site) {
        await updateTodoStatus(step.site, step.name, 'Open')
      }
    }
  }
  isOnboardingStepsCompleted.value = false
  showHelpCenter.value = false
}

async function fetchTodos() {
  isLoading.value = true;
  try {
    const sites = await getSites();
    console.log("SITES:", sites);
    if (sites.length === 0) {
      hasAuthenticatedSites.value = false;
      isLoading.value = false;
      return;
    }
    
    hasAuthenticatedSites.value = true;
    let allTodos = [];

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
            const siteTodos = data.data.map(todo => ({
              name: todo.name,
              title: todo.description || todo.name,
              icon: markRaw(TaskIcon),
              completed: todo.status === 'Closed',
              dependsOn: todo.depends_on,
              site: site,
              onClick: async () => {
                console.log(`Clicked ${todo.name}`);
                // Fetch action graph and start engine
                try {
                  const actionRes = await fetch(`${site.url}/api/method/frappe_orbit.action.get?name=${todo.action}`, {
                    headers: { 'Authorization': `Bearer ${site.accessToken}` }
                  });
                  const actionData = await actionRes.json();
                  if (actionData.message && actionData.message.compiled_json) {
                    chrome.runtime.sendMessage({
                      type: "START_ACTION",
                      payload: {
                        todo: todo,
                        compiled_json: JSON.parse(actionData.message.compiled_json)
                      }
                    });
                  }
                } catch (e) {
                  console.error("Failed to start action", e);
                }
              }
            }));
            allTodos = [...allTodos, ...siteTodos];
          }
        }
      } catch (error) {
        console.error(`Failed to fetch todos from ${site.url}:`, error);
      }
    }
    
    steps.value = allTodos;
  } catch (error) {
    console.error("Error fetching sites or todos:", error);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchTodos();
})
</script>
