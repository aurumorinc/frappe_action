import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';
import vue from '@vitejs/plugin-vue';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
  plugins: [WxtVitest(), vue(), Icons({ compiler: 'vue3' })],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'components/**/*.spec.ts'],
    server: {
      deps: {
        inline: ['frappe-ui']
      }
    }
  },
});
