import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    permissions: ['storage', 'identity'],
    name: 'Frappe Orbit',
    description: 'An intelligent browser co-pilot that seamlessly integrates with your Frappe instances to automate workflows and extract data.',
    version: '16.0.1',
    action: {}
  },
  modules: ['@wxt-dev/module-vue', '@wxt-dev/auto-icons'],
  vite: () => ({
  })
});
