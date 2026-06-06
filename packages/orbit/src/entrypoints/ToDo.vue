<template>
  <div
    v-show="show"
    class="orbit-panel onb-panel fixed z-50 right-0 w-80 h-[calc(100%_-_80px)] text-ink-gray-9 m-5 mt-[62px] p-3 flex gap-2 flex-col justify-between rounded-lg bg-surface-modal shadow-2xl"
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
      <TodoSteps
        v-if="!isOnboardingStepsCompleted && !showHelpCenter"
        :title="title"
        :logo="logo"
      />
      <div v-else-if="showHelpCenter" class="flex flex-col h-full overflow-hidden">
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
import { Dropdown, Button, FeatherIcon } from 'frappe-ui'

import StepsIcon from '../icons/StepsIcon.vue'
import MinimizeIcon from '../icons/MinimizeIcon.vue'
import MaximizeIcon from '../icons/MaximizeIcon.vue'
import HelpIcon from '../icons/HelpIcon.vue'
import OrbitLogo from '../icons/OrbitLogo.vue'
import TodoSteps from '../components/TodoSteps.vue'

import { useTodos } from '../composables/useTodos'
import logger from '../utils/logger'

const show = ref(true)
const minimize = ref(false)
const showHelpCenter = ref(false)

const title = 'Frappe Orbit'
const logo = markRaw(OrbitLogo)

const { resetAll, isOnboardingStepsCompleted, fetchTodos } = useTodos()

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
      label: 'Reset todos',
      onClick: resetOnboardingSteps,
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

function resetOnboardingSteps() {
  resetAll()
  showHelpCenter.value = false
}

onMounted(() => {
  logger.debug("ToDo component mounted");
  fetchTodos();
})
</script>
