/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './entrypoints/**/*.{html,js,ts,jsx,tsx,vue}',
    './components/**/*.{html,js,ts,jsx,tsx,vue}',
    './node_modules/frappe-ui/src/components/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'surface-modal': '#ffffff',
        'surface-gray-1': '#f3f4f6',
        'ink-gray-9': '#111827',
        'ink-gray-8': '#374151',
        'ink-gray-7': '#4b5563',
        'ink-gray-6': '#6b7280',
        'ink-gray-5': '#9ca3af',
        'ink-gray-4': '#9ca3af',
      },
      fontSize: {
        'p-sm': '0.875rem',
        'p-base': '1rem',
      }
    },
  },
  plugins: [],
}