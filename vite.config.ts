import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    {
      name: 'reuse-verified-model-assets',
      enforce: 'post',
      config: () =>
        process.env.HANDBOOK_LINK_MODELS === '1' ? { build: { copyPublicDir: false } } : undefined
    }
  ],
  test: {
    include: ['tests/**/*.{test,spec}.{js,ts}']
  }
});
