import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { simulatorAdapter } from './scripts/simulatorAdapter.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
    // If your environment is not supported or you settled on a specific environment, switch out the adapter.
    // See https://kit.svelte.dev/docs/adapters for more information about adapters.
    outDir: process.env.HANDBOOK_KIT_DIR || '.svelte-kit',
    ...(process.env.HANDBOOK_STATIC_DIR
      ? { files: { assets: process.env.HANDBOOK_STATIC_DIR } }
      : {}),
    adapter: simulatorAdapter(adapter({ out: process.env.HANDBOOK_BUILD_DIR || 'build' }))
  }
};

export default config;
