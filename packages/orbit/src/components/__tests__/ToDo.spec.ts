import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ToDo from '../../entrypoints/ToDo.vue';

vi.mock('frappe-ui', () => ({
  Button: { template: '<button class="mock-button"><slot name="prefix"></slot><slot></slot></button>' },
  FeatherIcon: { template: '<svg class="mock-feather-icon"></svg>', props: ['name'] },
  Dropdown: { template: '<div class="mock-dropdown"><slot></slot></div>', props: ['options'] },
  Badge: { template: '<span class="mock-badge">{{ label }}</span>', props: ['label', 'theme', 'size'] },
  Tooltip: { template: '<div class="mock-tooltip"><slot></slot></div>', props: ['text'] }
}));

describe('ToDo.vue (HelpModal)', () => {
  it('renders the full modal initially', () => {
    const wrapper = mount(ToDo);
    expect(wrapper.text()).toContain('Todos');
    expect(wrapper.text()).toContain('0/0 todos completed');
  });

  it('shows the correct title', async () => {
    const wrapper = mount(ToDo);
    expect(wrapper.text()).toContain('Welcome to Frappe Orbit');
  });
});
