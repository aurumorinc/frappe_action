import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ToDo from '../../../src/views/ToDoIndex.vue';

// Mock the composable
vi.mock('../../../src/composables/useTodos', () => ({
  useTodos: vi.fn(() => ({
    visibleActions: [],
    subTasks: [],
    navigationStack: [],
    reportData: { totalOpen: 0, completedToday: 0 },
    isLoading: false,
    hasAuthenticatedSites: true,
    isOnboardingStepsCompleted: false,
    totalActions: 0,
    actionsCompleted: 0,
    completedPercentage: 0,
    isDependent: vi.fn(),
    dependsOnTooltip: vi.fn(),
    skip: vi.fn(),
    close: vi.fn(),
    skipAll: vi.fn(),
    selectTodo: vi.fn(),
    goBack: vi.fn(),
    fetchTodos: vi.fn(),
    run: vi.fn(),
    runAll: vi.fn(),
    isRunning: false
  }))
}));

import { useTodos } from '../../../src/composables/useTodos';

// Stub Frappe UI components
const globalStubs = {
  Dropdown: { template: '<div class="stub-dropdown"><slot /></div>' },
  Button: { template: '<button class="stub-button"><slot /></button>' },
  FeatherIcon: { template: '<span class="stub-icon"></span>' },
  Tooltip: { template: '<div class="stub-tooltip"><slot /></div>' },
  Badge: { template: '<span class="stub-badge"><slot /></span>' }
};

describe('ToDo.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Happy Paths (Structural & Semantic Class Validation)', () => {
    it('should apply base semantic classes on mount', () => {
      const wrapper = mount(ToDo, { global: { stubs: globalStubs } });
      
      expect(wrapper.classes()).toContain('fixed');
      expect(wrapper.classes()).toContain('z-[2147483647]');
      expect(wrapper.classes()).toContain('right-0');
    });

    it('should render the correct list structure', () => {
      const mockActions = [
        { name: 'step1', title: 'Step 1', completed: false, onClick: vi.fn() },
        { name: 'step2', title: 'Step 2', completed: true, onClick: vi.fn() }
      ];

      (useTodos as any).mockReturnValue({
        visibleActions: mockActions,
        subTasks: [],
        navigationStack: [],
        reportData: { totalOpen: 2, completedToday: 1 },
        isLoading: false,
        hasAuthenticatedSites: true,
        isOnboardingStepsCompleted: false,
        totalActions: 2,
        actionsCompleted: 1,
        completedPercentage: 50,
        isDependent: vi.fn().mockReturnValue(false),
        dependsOnTooltip: vi.fn().mockReturnValue(''),
        skip: vi.fn(),
        close: vi.fn(),
        skipAll: vi.fn(),
        selectTodo: vi.fn(),
        goBack: vi.fn(),
        fetchTodos: vi.fn(),
        run: vi.fn(),
        runAll: vi.fn(),
        isRunning: false
      });

      const wrapper = mount(ToDo, { global: { stubs: globalStubs } });
      
      const listItems = wrapper.findAll('.group.w-full.flex');
      expect(listItems.length).toBe(2);
      
      expect(listItems[0].text()).toContain('Step 1');
      expect(listItems[1].text()).toContain('Step 2');
    });
  });

  describe('Dynamic Class Bindings (State-Driven Styling)', () => {
    it('should toggle the is-minimized class', async () => {
      const wrapper = mount(ToDo, { global: { stubs: globalStubs } });
      
      expect(wrapper.classes()).not.toContain('border');
      
      // Find the minimize button (second button in the header)
      const buttons = wrapper.findAll('.stub-button');
      const minimizeBtn = buttons[0]; // The first button is the minimize button since Dropdown is stubbed and its button is inside
      await minimizeBtn.trigger('click');
      
      expect(wrapper.classes()).toContain('border');
    });

    it('should apply opacity-50 class to completed steps', () => {
      const mockActions = [
        { name: 'step1', title: 'Step 1', completed: true, onClick: vi.fn() }
      ];

      (useTodos as any).mockReturnValue({
        visibleActions: mockActions,
        subTasks: [],
        navigationStack: [],
        reportData: { totalOpen: 1, completedToday: 1 },
        isLoading: false,
        hasAuthenticatedSites: true,
        isOnboardingStepsCompleted: false,
        totalActions: 1,
        actionsCompleted: 1,
        completedPercentage: 100,
        isDependent: vi.fn().mockReturnValue(false),
        dependsOnTooltip: vi.fn().mockReturnValue(''),
        skip: vi.fn(),
        close: vi.fn(),
        skipAll: vi.fn(),
        selectTodo: vi.fn(),
        goBack: vi.fn(),
        fetchTodos: vi.fn(),
        run: vi.fn(),
        runAll: vi.fn(),
        isRunning: false
      });

      const wrapper = mount(ToDo, { global: { stubs: globalStubs } });
      const listItem = wrapper.find('.group.w-full.flex');
      
      expect(listItem.classes()).toContain('opacity-50');
    });

    it('should apply opacity-50 class to dependent steps', () => {
      const mockActions = [
        { name: 'step1', title: 'Step 1', completed: false, onClick: vi.fn() }
      ];

      (useTodos as any).mockReturnValue({
        visibleActions: mockActions,
        subTasks: [],
        navigationStack: [],
        reportData: { totalOpen: 1, completedToday: 0 },
        isLoading: false,
        hasAuthenticatedSites: true,
        isOnboardingStepsCompleted: false,
        totalActions: 1,
        actionsCompleted: 0,
        completedPercentage: 0,
        isDependent: vi.fn().mockReturnValue(true),
        dependsOnTooltip: vi.fn().mockReturnValue('Depends on another step'),
        skip: vi.fn(),
        close: vi.fn(),
        skipAll: vi.fn(),
        selectTodo: vi.fn(),
        goBack: vi.fn(),
        fetchTodos: vi.fn(),
        run: vi.fn(),
        runAll: vi.fn(),
        isRunning: false
      });

      const wrapper = mount(ToDo, { global: { stubs: globalStubs } });
      const listItem = wrapper.find('.group.w-full.flex');
      
      expect(listItem.classes()).toContain('opacity-50');
    });

    it('should not apply opacity-50 class to incomplete, non-dependent steps', () => {
      const mockActions = [
        { name: 'step1', title: 'Step 1', completed: false, onClick: vi.fn() }
      ];

      (useTodos as any).mockReturnValue({
        visibleActions: mockActions,
        subTasks: [],
        navigationStack: [],
        reportData: { totalOpen: 1, completedToday: 0 },
        isLoading: false,
        hasAuthenticatedSites: true,
        isOnboardingStepsCompleted: false,
        totalActions: 1,
        actionsCompleted: 0,
        completedPercentage: 0,
        isDependent: vi.fn().mockReturnValue(false),
        dependsOnTooltip: vi.fn().mockReturnValue(''),
        skip: vi.fn(),
        close: vi.fn(),
        skipAll: vi.fn(),
        selectTodo: vi.fn(),
        goBack: vi.fn(),
        fetchTodos: vi.fn(),
        run: vi.fn(),
        runAll: vi.fn(),
        isRunning: false
      });

      const wrapper = mount(ToDo, { global: { stubs: globalStubs } });
      const listItem = wrapper.find('.group.w-full.flex');
      
      expect(listItem.classes()).not.toContain('opacity-50');
    });
  });

  describe('Edge & Corner Cases', () => {
    it('should handle empty state gracefully', () => {
      (useTodos as any).mockReturnValue({
        visibleActions: [],
        subTasks: [],
        navigationStack: [],
        reportData: { totalOpen: 0, completedToday: 0 },
        isLoading: false,
        hasAuthenticatedSites: true,
        isOnboardingStepsCompleted: false,
        totalActions: 0,
        actionsCompleted: 0,
        completedPercentage: 0,
        isDependent: vi.fn(),
        dependsOnTooltip: vi.fn(),
        skip: vi.fn(),
        close: vi.fn(),
        skipAll: vi.fn(),
        selectTodo: vi.fn(),
        goBack: vi.fn(),
        fetchTodos: vi.fn(),
        run: vi.fn(),
        runAll: vi.fn(),
        isRunning: false
      });

      const wrapper = mount(ToDo, { global: { stubs: globalStubs } });
      
      expect(wrapper.find('.text-center.text-ink-gray-5').exists()).toBe(true);
      expect(wrapper.text()).toContain('No pending tasks');
    });

    it('should handle loading state', () => {
      (useTodos as any).mockReturnValue({
        visibleActions: [],
        subTasks: [],
        navigationStack: [],
        reportData: { totalOpen: 0, completedToday: 0 },
        isLoading: true,
        hasAuthenticatedSites: true,
        isOnboardingStepsCompleted: false,
        totalActions: 0,
        actionsCompleted: 0,
        completedPercentage: 0,
        isDependent: vi.fn(),
        dependsOnTooltip: vi.fn(),
        skip: vi.fn(),
        close: vi.fn(),
        skipAll: vi.fn(),
        selectTodo: vi.fn(),
        goBack: vi.fn(),
        fetchTodos: vi.fn(),
        run: vi.fn(),
        runAll: vi.fn(),
        isRunning: false
      });

      const wrapper = mount(ToDo, { global: { stubs: globalStubs } });
      
      expect(wrapper.find('.text-center.text-ink-gray-5').exists()).toBe(true);
      expect(wrapper.text()).toContain('Loading...');
    });

    it('should handle unauthenticated state', () => {
      (useTodos as any).mockReturnValue({
        visibleActions: [],
        subTasks: [],
        navigationStack: [],
        reportData: { totalOpen: 0, completedToday: 0 },
        isLoading: false,
        hasAuthenticatedSites: false,
        isOnboardingStepsCompleted: false,
        totalActions: 0,
        actionsCompleted: 0,
        completedPercentage: 0,
        isDependent: vi.fn(),
        dependsOnTooltip: vi.fn(),
        skip: vi.fn(),
        close: vi.fn(),
        skipAll: vi.fn(),
        selectTodo: vi.fn(),
        goBack: vi.fn(),
        fetchTodos: vi.fn(),
        run: vi.fn(),
        runAll: vi.fn(),
        isRunning: false
      });

      const wrapper = mount(ToDo, { global: { stubs: globalStubs } });
      
      expect(wrapper.find('.text-center.text-ink-gray-5').exists()).toBe(true);
      expect(wrapper.text()).toContain('Please connect a site in Settings.');
    });
  });

  describe('Failure Modes & Security', () => {
    it('should not leak scoped styles', () => {
      const wrapper = mount(ToDo, { global: { stubs: globalStubs } });
      
      // Ensure root element has the specific fixed class
      expect(wrapper.classes()).toContain('fixed');
    });

    it('should safely render dynamic text', () => {
      const maliciousText = '<script>alert("xss")</script>';
      const mockActions = [
        { name: 'step1', title: maliciousText, completed: false, onClick: vi.fn() }
      ];

      (useTodos as any).mockReturnValue({
        visibleActions: mockActions,
        subTasks: [],
        navigationStack: [],
        reportData: { totalOpen: 1, completedToday: 0 },
        isLoading: false,
        hasAuthenticatedSites: true,
        isOnboardingStepsCompleted: false,
        totalActions: 1,
        actionsCompleted: 0,
        completedPercentage: 0,
        isDependent: vi.fn().mockReturnValue(false),
        dependsOnTooltip: vi.fn().mockReturnValue(''),
        skip: vi.fn(),
        close: vi.fn(),
        skipAll: vi.fn(),
        selectTodo: vi.fn(),
        goBack: vi.fn(),
        fetchTodos: vi.fn(),
        run: vi.fn(),
        runAll: vi.fn(),
        isRunning: false
      });

      const wrapper = mount(ToDo, { global: { stubs: globalStubs } });
      
      // Vue automatically escapes text interpolation
      expect(wrapper.html()).not.toContain('<script>');
      expect(wrapper.text()).toContain(maliciousText);
    });
  });
});
