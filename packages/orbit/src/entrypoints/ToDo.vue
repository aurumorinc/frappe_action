<template>
  <div
    v-show="show"
    class="orbit-root orbit-panel onb-panel fixed z-50 right-0 w-80 h-[calc(100%_-_80px)] text-ink-gray-9 m-5 mt-[62px] p-3 flex gap-2 flex-col justify-between rounded-lg bg-surface-modal shadow-2xl font-sans"
    style="font-family: InterVar, ui-sans-serif, system-ui, sans-serif;"
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
      <div v-if="!isOnboardingStepsCompleted && !showSettings" class="flex flex-col h-full overflow-hidden">
        <div class="flex flex-col justify-center items-center gap-1 mt-4 mb-7">
          <component
            :is="logo"
            class="size-10 shrink-0 rounded mb-4 cursor-pointer transition-transform duration-300"
            :class="{ 'animate-spin': isRunning, 'hover:scale-110': !isRunning }"
            @click="runAll"
            title="Run All"
          />
          <div class="text-base font-medium">
            {{ 'Welcome to ' + title }}
          </div>
          <div class="text-p-base font-normal">
            {{ `${actionsCompleted}/${totalActions} todos completed` }}
          </div>
        </div>
        <div class="flex flex-col gap-2.5 overflow-hidden">
          <div v-if="hasAuthenticatedSites" class="flex justify-between items-center py-0.5">
            <Badge
              v-if="navigationStack.length > 0"
              :label="`${completedPercentage}% completed`"
              :theme="completedPercentage == 100 ? 'green' : 'orange'"
              size="lg"
            />
            <div v-else></div>
            <div class="flex">
              <Button
                v-if="navigationStack.length > 0"
                variant="ghost"
                :label="'Back'"
                @click="goBack"
              />
              <Button
                v-if="completedPercentage != 100 && navigationStack.length === 0"
                variant="ghost"
                :label="'Skip all'"
                @click="skipAll"
              />
              <Button
                v-if="completedPercentage != 100 && navigationStack.length > 0 && !currentActionHasAction"
                variant="ghost"
                :label="'Skip all'"
                @click="skipAll"
              />
              <Button
                v-if="navigationStack.length > 0 && currentActionHasAction"
                variant="ghost"
                :label="'Close'"
                @click="() => close(navigationStack[navigationStack.length - 1].name)"
              />
            </div>
          </div>
          <div v-else class="text-center text-ink-gray-5 py-4">
            No sites are connected. Please connect a site in Settings.
          </div>
          <div class="flex flex-col gap-1.5 overflow-y-auto">
            <div
              v-for="action in visibleActions"
              :key="action.title"
              class="group w-full flex gap-2 justify-between items-center hover:bg-surface-gray-1 rounded px-2 py-1.5 cursor-pointer"
              @click.stop="
                () => !action.completed && !isDependent(action) && action.onClick()
              "
            >
              <component
                :is="isDependent(action) ? Tooltip : 'div'"
                :text="dependsOnTooltip(action)"
              >
                <div
                  class="flex gap-2 items-center"
                  :class="[
                    action.completed
                      ? 'text-ink-gray-5'
                      : isDependent(action)
                        ? 'text-ink-gray-4'
                        : 'text-ink-gray-8',
                  ]"
                >
                  <component :is="action.icon" class="h-4" />
                  <div class="text-base" :class="{ 'line-through': action.completed }">
                    {{ action.title }}
                  </div>
                </div>
              </component>
              <div class="flex gap-1">
                <Button
                  v-if="!action.completed && !isDependent(action)"
                  :label="'Skip'"
                  class="!h-4 text-xs !text-ink-gray-6 hidden group-hover:flex"
                  @click.stop="() => skip(action.name)"
                />
                <Button
                  v-if="!action.completed && !isDependent(action)"
                  :label="'Close'"
                  class="!h-4 text-xs !text-ink-gray-6 hidden group-hover:flex"
                  @click.stop="() => close(action.name)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="showSettings" class="flex flex-col h-full overflow-hidden">
        <div class="p-4 text-center text-ink-gray-5">
          Settings Content
        </div>
      </div>
      <div v-if="hitlNode" class="flex flex-col h-full overflow-hidden p-4 bg-surface-gray-1 rounded mt-2">
        <div class="text-lg font-bold mb-2">Human Intervention Required</div>
        <div class="mb-4 text-sm">{{ hitlNode.message }}</div>
        <Button variant="solid" label="Continue" @click="submitHitl" />
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
import { Dropdown, Button, FeatherIcon, Tooltip, Badge } from 'frappe-ui'

import StepsIcon from '../icons/StepsIcon.vue'
import MinimizeIcon from '../icons/MinimizeIcon.vue'
import MaximizeIcon from '../icons/MaximizeIcon.vue'
import HelpIcon from '../icons/HelpIcon.vue'
import OrbitLogo from '../icons/OrbitLogo.vue'

import { useTodos } from '../composables/useTodos'
import logger from '../utils/logger'

const show = ref(true)
const minimize = ref(false)
const showSettings = ref(false)
const hitlNode = ref<any>(null)

const title = 'Frappe Orbit'
const logo = markRaw(OrbitLogo)

const {
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
  fetchTodos,
  runAll,
  isRunning
} = useTodos()

const currentActionHasAction = computed(() => {
  if (navigationStack.value.length > 0) {
    return !!navigationStack.value[navigationStack.value.length - 1].action;
  }
  return false;
});

const headingTitle = computed(() => {
  if (!isOnboardingStepsCompleted.value && !showSettings.value) {
    return 'ToDo'
  } else if (showSettings.value) {
    return 'Settings'
  }
})

const options = computed(() => {
  let items = [
    {
      icon: StepsIcon,
      label: 'Reset todos',
      onClick: resetOnboardingSteps,
      condition: () => showSettings.value && isOnboardingStepsCompleted.value,
    },
  ]

  return items.filter((item) => item.condition())
})

const footerItems = computed(() => {
  let items = [
    {
      icon: HelpIcon,
      label: 'Settings',
      onClick: () => {
        showSettings.value = true
      },
      condition: !isOnboardingStepsCompleted.value && !showSettings.value,
    },
    {
      icon: StepsIcon,
      label: 'Todos',
      onClick: () => (showSettings.value = false),
      condition: showSettings.value && !isOnboardingStepsCompleted.value,
    },
  ]

  return items.filter((item) => item.condition)
})

function resetOnboardingSteps() {
  // resetAll()
  showSettings.value = false
}

onMounted(() => {
  logger.debug("ToDo component mounted");
  fetchTodos();

  window.addEventListener("ORBIT_REQUIRE_HITL", (event) => {
    hitlNode.value = event.detail;
    show.value = true; // Ensure UI is visible
    minimize.value = false; // Ensure UI is not minimized
  });

  window.addEventListener("ORBIT_RUN_ALL_COMPLETED", () => {
    isRunning.value = false;
  });
})

function submitHitl() {
  import('wxt/browser').then(({ browser }) => {
    browser.runtime.sendMessage({
      type: "HITL_RESULT",
      payload: { data: "User completed task" }
    });
  });
  hitlNode.value = null;
}
</script>
