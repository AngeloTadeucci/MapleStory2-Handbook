// The package ships Svelte 3 source with no type declarations.
declare module '@beyonk/svelte-google-analytics' {
  import type { Component } from 'svelte';

  export const GoogleAnalytics: Component<{
    properties: string[];
    configurations?: Record<string, Record<string, unknown>>;
    enabled?: boolean;
  }>;
}
