import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ToDo from '../ToDo.vue';

// Mock the composable
vi.mock('../../composables/useTodos', () => ({
  useTodos: vi.fn(() => ({
    steps: [],
    isLoading: false,
    hasAuthenticatedSites: true,
    isOnboardingStepsCompleted: false,
    totalSteps: 0,
    stepsCompleted: 0,
    completedPercentage: 0,
    visibleSteps: [],
    isDependent: vi.fn(),
    dependsOnTooltip: vi.fn(),
    skip: vi.fn(),
    reset: vi.fn(),
    skipAll: vi.fn(),
    resetAll: vi.fn(),
    fetchTodos: vi.fn()
  }))
}));

import { useTodos } from '../../composables/useTodos';

// Stub Frappe UI components
const globalStubs = {
  Dropdown: { template: '<div class="stub-dropdown"><slot /></div>' },
  Button: { template: '<button class="stub-button"><slot /></button>' },
  Badge: { template: '<span class="stub-badge"></span>' },
  Tooltip: { template: '<div class="stub-tooltip"><slot /></div>' },
  FeatherIcon: { template: '<svg class="stub-feather-icon"></svg>' }
};

describe('ToDo.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Happy Paths (Structural & Semantic Class Validation)', () => {
    it('should apply base semantic classes on mount', () => {
      const wrapper = mount(ToDo, {
        global: { stubs: globalStubs }
      });

      expect(wrapper.classes()).toContain('orbit-panel');
      expect(wrapper.find('.orbit-header-main').exists()).toBe(true);
      expect(wrapper.find('.orbit-header-title').exists()).toBe(true);
    });

    it('should render the correct list structure', () => {
      const mockSteps = [
        { name: 'step1', title: 'Step 1', completed: false, dependsOn: false, icon: 'div', onClick: vi.fn() },
        { name: 'step2', title: 'Step 2', completed: false, dependsOn: false, icon: 'div', onClick: vi.fn() },
        { name: 'step3', title: 'Step 3', completed: false, dependsOn: false, icon: 'div', onClick: vi.fn() }
      ];

      (useTodos as any).mockReturnValue({
        steps: mockSteps,
        visibleSteps: mockSteps,
        isLoading: false,
        hasAuthenticatedSites: true,
        isOnboardingStepsCompleted: false,
        isDependent: () => false,
        dependsOnTooltip: () => '',
        fetchTodos: vi.fn()
      });

      const wrapper = mount(ToDo, {
        global: { stubs: globalStubs }
      });

      expect(wrapper.find('.orbit-list-container').exists()).toBe(true);
      const groups = wrapper.findAll('.orbit-group');
      expect(groups.length).toBe(3);

      groups.forEach(group => {
        expect(group.find('.orbit-step-left').exists()).toBe(true);
        expect(group.find('.orbit-step-icon').exists()).toBe(true);
        expect(group.find('.orbit-step-text').exists()).toBe(true);
      });
    });
  });

  describe('Dynamic Class Bindings (State-Driven Styling)', () => {
    it('should toggle the is-minimized class', async () => {
      const wrapper = mount(ToDo, {
        global: { stubs: globalStubs }
      });

      expect(wrapper.classes()).not.toContain('is-minimized');

      // Find the minimize button (it's the second button in the header actions)
      const buttons = wrapper.findAll('.orbit-header-actions .stub-button');
      await buttons[0].trigger('click'); // Assuming Dropdown is not rendered if options is empty, so minimize is first

      expect(wrapper.classes()).toContain('is-minimized');
    });

    it('should apply is-complete class to completed steps', () => {
      const mockSteps = [
        { name: 'step1', title: 'Step 1', completed: true, dependsOn: false, icon: 'div', onClick: vi.fn() }
      ];

      (useTodos as any).mockReturnValue({
        steps: mockSteps,
        visibleSteps: mockSteps,
        isLoading: false,
        hasAuthenticatedSites: true,
        isOnboardingStepsCompleted: false,
        isDependent: () => false,
        dependsOnTooltip: () => '',
        fetchTodos: vi.fn()
      });

      const wrapper = mount(ToDo, {
        global: { stubs: globalStubs }
      });

      const stepText = wrapper.find('.orbit-step-text');
      expect(stepText.classes()).toContain('is-complete');
    });

    it('should apply is-dependent class to dependent steps', () => {
      const mockSteps = [
        { name: 'step1', title: 'Step 1', completed: false, dependsOn: true, icon: 'div', onClick: vi.fn() }
      ];

      (useTodos as any).mockReturnValue({
        steps: mockSteps,
        visibleSteps: mockSteps,
        isLoading: false,
        hasAuthenticatedSites: true,
        isOnboardingStepsCompleted: false,
        isDependent: () => true,
        dependsOnTooltip: () => 'Depends on something',
        fetchTodos: vi.fn()
      });

      const wrapper = mount(ToDo, {
        global: { stubs: globalStubs }
      });

      const group = wrapper.find('.orbit-group');
      expect(group.classes()).toContain('is-dependent');

      const stepText = wrapper.find('.orbit-step-text');
      expect(stepText.classes()).toContain('is-dependent');
    });

    it('should apply is-pending class to incomplete, non-dependent steps', () => {
      const mockSteps = [
        { name: 'step1', title: 'Step 1', completed: false, dependsOn: false, icon: 'div', onClick: vi.fn() }
      ];

      (useTodos as any).mockReturnValue({
        steps: mockSteps,
        visibleSteps: mockSteps,
        isLoading: false,
        hasAuthenticatedSites: true,
        isOnboardingStepsCompleted: false,
        isDependent: () => false,
        dependsOnTooltip: () => '',
        fetchTodos: vi.fn()
      });

      const wrapper = mount(ToDo, {
        global: { stubs: globalStubs }
      });

      const stepText = wrapper.find('.orbit-step-text');
      expect(stepText.classes()).toContain('is-pending');
    });
  });

  describe('Edge & Corner Cases', () => {
    it('should handle empty state gracefully', () => {
      (useTodos as any).mockReturnValue({
        steps: [],
        visibleSteps: [],
        isLoading: false,
        hasAuthenticatedSites: true,
        isOnboardingStepsCompleted: false,
        fetchTodos: vi.fn()
      });

      const wrapper = mount(ToDo, {
        global: { stubs: globalStubs }
      });

      expect(wrapper.find('.orbit-state-message').exists()).toBe(true);
      expect(wrapper.find('.orbit-list-container').exists()).toBe(false);
      expect(wrapper.text()).toContain('All Caught Up');
    });

    it('should handle loading state', () => {
      (useTodos as any).mockReturnValue({
        steps: [],
        visibleSteps: [],
        isLoading: true,
        hasAuthenticatedSites: true,
        isOnboardingStepsCompleted: false,
        fetchTodos: vi.fn()
      });

      const wrapper = mount(ToDo, {
        global: { stubs: globalStubs }
      });

      expect(wrapper.find('.orbit-state-message').exists()).toBe(true);
      expect(wrapper.text()).toContain('Loading todos...');
    });

    it('should handle unauthenticated state', () => {
      (useTodos as any).mockReturnValue({
        steps: [],
        visibleSteps: [],
        isLoading: false,
        hasAuthenticatedSites: false,
        isOnboardingStepsCompleted: false,
        fetchTodos: vi.fn()
      });

      const wrapper = mount(ToDo, {
        global: { stubs: globalStubs }
      });

      expect(wrapper.find('.orbit-state-message').exists()).toBe(true);
      expect(wrapper.text()).toContain('No Authenticated Sites');
    });
  });

  describe('Failure Modes & Security', () => {
    it('should not leak scoped styles', () => {
      const wrapper = mount(ToDo, {
        global: { stubs: globalStubs }
      });

      const html = wrapper.html();
      // Vue scoped styles add attributes like data-v-xxxxxxx
      expect(html).not.toMatch(/data-v-[a-zA-Z0-9]+/);
    });

    it('should safely render dynamic text', () => {
      const maliciousTitle = '<script>alert(1)</script>';
      const mockSteps = [
        { name: 'step1', title: maliciousTitle, completed: false, dependsOn: false, icon: 'div', onClick: vi.fn() }
      ];

      (useTodos as any).mockReturnValue({
        steps: mockSteps,
        visibleSteps: mockSteps,
        isLoading: false,
        hasAuthenticatedSites: true,
        isOnboardingStepsCompleted: false,
        isDependent: () => false,
        dependsOnTooltip: () => '',
        fetchTodos: vi.fn()
      });

      const wrapper = mount(ToDo, {
        global: { stubs: globalStubs }
      });

      const stepText = wrapper.find('.orbit-step-text');
      // The text should be escaped, so the raw HTML string should be present in the text content,
      // but not as actual DOM nodes.
      expect(stepText.text()).toBe(maliciousTitle);
      expect(stepText.html()).not.toContain('<script>');
    });
  });
});
