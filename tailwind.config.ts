import { join } from 'path';
import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import { skeleton } from '@skeletonlabs/tw-plugin';
import { customTheme } from './src/custom_theme';

const config = {
  darkMode: 'class',
  content: [
    './src/**/*.{html,js,svelte,ts}',
    join(require.resolve('@skeletonlabs/skeleton'), '../**/*.{html,js,svelte,ts}')
  ],
  theme: {
    extend: {
      colors: {
        red: '#e93b3b',
        gold: '#ffd200',
        'blue-ascent': '#225d7c',
        'blue-ascent-bright': '#84d6ff',
        gray2: '#37393D'
      }
    }
  },
  plugins: [
    forms,
    skeleton({
      themes: { custom: [customTheme] }
    })
  ]
} satisfies Config;

export default config;
