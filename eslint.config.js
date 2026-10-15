import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

export default ts.config(
  {
    ignores: [
      'build/',
      '.svelte-kit/',
      'package/',
      'node_modules/',
      'static/',
      'src/lib/generated/',
      '.worktrees/',
      'plans/',
      '**/*.cjs'
    ]
  },
  js.configs.recommended,
  // Empty catch blocks are this codebase's idiom for best-effort work such as optional asset probes.
  { rules: { 'no-empty': ['error', { allowEmptyCatch: true }] } },
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    }
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: ts.parser,
        svelteConfig
      }
    }
  }
);
