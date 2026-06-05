import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [WxtVitest(), vue()],
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
