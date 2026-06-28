import frappeUIPreset from 'frappe-ui/tailwind'

/** @type {import('tailwindcss').Config} */
export default {
  presets: [frappeUIPreset],
  content: [
    './src/entrypoints/**/*.{html,js,ts,jsx,tsx,vue}',
    './src/components/**/*.{html,js,ts,jsx,tsx,vue}',
    './src/views/**/*.{html,js,ts,jsx,tsx,vue}',
    './node_modules/frappe-ui/src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}