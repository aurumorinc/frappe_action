<template>
  <div
    v-show="show"
    class="todo-modal"
    :class="{ 'todo-modal-minimized': minimize }"
    @click.stop
  >
    <div class="todo-header">
      <div class="todo-title">
        {{ headingTitle }}
      </div>
      <div class="todo-actions">
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
    <div class="todo-content-wrapper">
      <!-- OnboardingSteps content -->
      <div v-if="!isOnboardingStepsCompleted && !showHelpCenter" class="todo-content">
        <div class="todo-welcome">
          <component :is="logo" class="todo-logo" />
          <div class="todo-welcome-title">
            {{ 'Welcome to ' + title }}
          </div>
          <div class="todo-welcome-subtitle">
            {{ `${stepsCompleted}/${totalSteps} todos completed` }}
          </div>
        </div>
        
        <div v-if="isLoading" class="todo-state-message flex-col gap-2">
          <div class="text-sm text-ink-gray-5">Loading todos...</div>
        </div>
        <div v-else-if="!hasAuthenticatedSites" class="todo-state-message flex-col gap-2">
          <FeatherIcon name="alert-circle" class="h-8 w-8 text-ink-gray-4" />
          <div class="text-base font-medium text-ink-gray-9">No Authenticated Sites</div>
          <div class="text-sm text-ink-gray-5">Please authenticate with a Frappe site to see your todos.</div>
        </div>
        <div v-else-if="steps.length === 0" class="todo-state-message flex-col gap-2">
          <FeatherIcon name="check-circle" class="h-8 w-8 text-ink-gray-4" />
          <div class="text-base font-medium text-ink-gray-9">All Caught Up</div>
          <div class="text-sm text-ink-gray-5">You have no pending todos. Great job!</div>
        </div>
        <div v-else class="todo-list-container">
          <div class="todo-list-header">
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
                :label="'Mark completed'"
                @click="() => skipAll()"
              />
            </div>
          </div>
          <div class="todo-list">
            <div
              v-for="step in visibleSteps"
              :key="step.name"
              class="todo-item group"
              :class="{ 'todo-item-dependent': step.dependsOn }"
              @click.stop="
                () => !step.completed && !isDependent(step) && step.onClick()
              "
            >
              <component
                :is="isDependent(step) ? Tooltip : 'div'"
                :text="dependsOnTooltip(step)"
              >
                <div
                  class="todo-item-content"
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
                :label="'Skip'"
                class="todo-item-action"
                @click.stop="() => skip(step.name)"
              />
              <Button
                v-else-if="!isDependent(step)"
                :label="'Reset'"
                class="todo-item-action"
                @click.stop="() => reset(step.name)"
              />
            </div>
          </div>
        </div>
      </div>
      <!-- HelpCenter content (mocked for now) -->
      <div v-else-if="showHelpCenter" class="todo-content">
        <div class="p-4 text-center text-ink-gray-5">
          Help Center Content
        </div>
      </div>
    </div>
    <div v-for="item in footerItems" class="flex flex-col gap-1.5">
      <div
        class="todo-footer-item"
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
import { Dropdown, Button, Badge, Tooltip, FeatherIcon } from 'frappe-ui'

import StepsIcon from '../icons/StepsIcon.vue'
import MinimizeIcon from '../icons/MinimizeIcon.vue'
import MaximizeIcon from '../icons/MaximizeIcon.vue'
import HelpIcon from '../icons/HelpIcon.vue'
import OrbitLogo from '../icons/OrbitLogo.vue'

import { useTodos } from '../composables/useTodos'
import logger from '../utils/logger'

const show = ref(true)
const minimize = ref(false)
const showHelpCenter = ref(false)

const title = 'Frappe Orbit'
const logo = markRaw(OrbitLogo)

const {
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
} = useTodos()

const headingTitle = computed(() => {
  if (!isOnboardingStepsCompleted.value && !showHelpCenter.value) {
    return 'Todos'
  } else if (showHelpCenter.value) {
    return 'Help center'
  }
})

const options = computed(() => {
  let items = [
    {
      icon: StepsIcon,
      label: 'Reset todos',
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
      label: 'Todos',
      onClick: () => (showHelpCenter.value = false),
      condition: showHelpCenter.value && !isOnboardingStepsCompleted.value,
    },
  ]
  return items.filter((item) => item.condition)
})

onMounted(() => {
  logger.debug("ToDo component mounted");
  fetchTodos();
})
</script>

<style scoped>
.todo-modal {
  @apply fixed z-50 right-6 bottom-6 w-[310px] max-h-[80vh] text-ink-gray-9 p-4 flex flex-col rounded-2xl bg-surface-modal;
  box-shadow: 0 12px 40px rgba(0,0,0,0.15);
}
.todo-modal-minimized {
  @apply top-auto bottom-6 border;
}
.todo-header {
  @apply flex items-center justify-between px-2 py-1.5;
}
.todo-title {
  @apply text-base font-medium;
}
.todo-actions {
  @apply flex gap-1;
}
.todo-content-wrapper {
  @apply h-full overflow-hidden flex flex-col;
}
.todo-content {
  @apply h-full overflow-hidden flex flex-col;
}
.todo-welcome {
  @apply flex flex-col justify-center items-center gap-1 mt-4 mb-7;
}
.todo-logo {
  @apply size-10 shrink-0 rounded mb-4;
}
.todo-welcome-title {
  @apply text-base font-medium;
}
.todo-welcome-subtitle {
  @apply text-sm text-ink-gray-5 mb-2;
}
.todo-state-message {
  @apply flex justify-center items-center h-full text-center px-4;
}
.todo-list-container {
  @apply flex flex-col gap-2.5 overflow-hidden;
}
.todo-list-header {
  @apply flex justify-between items-center py-0.5;
}
.todo-list {
  @apply flex flex-col gap-3 overflow-y-auto mt-4;
}
.todo-item {
  @apply w-full flex gap-2 justify-between items-center hover:bg-surface-gray-1 hover:text-ink-gray-9 rounded px-2 py-1.5 cursor-pointer;
}
.todo-item-dependent {
  @apply ml-6 border-l-2 border-gray-300 pl-3;
}
.todo-item-content {
  @apply flex gap-2 items-center;
}
.todo-item-action {
  @apply !h-4 text-xs !text-ink-gray-6 hidden group-hover:flex;
}
.todo-footer-item {
  @apply w-full flex gap-2 items-center hover:bg-surface-gray-1 text-ink-gray-8 rounded px-2 py-1.5 cursor-pointer;
}
</style>
