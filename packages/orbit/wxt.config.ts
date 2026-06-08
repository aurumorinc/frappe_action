import { defineConfig } from 'wxt';
import Icons from 'unplugin-icons/vite';

const removeDynamicImportsPlugin = () => {
  return {
    name: 'remove-dynamic-imports',
    transform(code: string, id: string) {
      if (id.includes('TextEditor/commands.js')) {
        return code.replace(/import\([^)]+\)/g, 'Promise.resolve(null)');
      }
    }
  };
};

export default defineConfig({
  srcDir: 'src',
  manifest: {
    permissions: ['storage', 'identity'],
    host_permissions: [
      '<all_urls>'
    ],
    name: 'Orbit',
    description: 'An intelligent browser co-pilot that seamlessly integrates with your Frappe instances to automate workflows and extract data.',
    version: '16.0.1',
    action: {
      default_icon: "icons/128.png"
    },
    icons: {
      "16": "icons/16.png",
      "32": "icons/32.png",
      "48": "icons/48.png",
      "128": "icons/128.png"
    }
  },
  modules: ['@wxt-dev/module-vue', '@wxt-dev/auto-icons'],
  vite: () => ({
    plugins: [
      removeDynamicImportsPlugin(),
      Icons({
        compiler: 'vue3',
      })
    ]
  })
});
