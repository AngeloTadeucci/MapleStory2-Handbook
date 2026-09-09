import { cpSync, linkSync, mkdirSync, readFileSync, readdirSync, symlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Package only the canonical model inventory. Private snapshots stay local.
 * @param {import('@sveltejs/kit').Adapter} adapter
 * @param {{ linkModels?: boolean, modelsDirectory?: string }} [options] Only for verified immutable assets on the same filesystem.
 * @returns {import('@sveltejs/kit').Adapter}
 */
export function simulatorAdapter(adapter, { linkModels = false, modelsDirectory } = {}) {
  return {
    ...adapter,
    async adapt(builder) {
      if (linkModels && modelsDirectory) {
        // SvelteKit clears its output at buildStart. Restore static inputs here,
        // after compilation, when the explicit reuse mode skipped Vite's copy.
        const client = builder.getClientDirectory();
        symlinkSync(modelsDirectory, join(client, 'gltf'), 'dir');
        const assets = builder.config.kit.files.assets;
        for (const name of readdirSync(assets)) {
          if (name !== 'gltf')
            cpSync(join(assets, name), join(client, name), {
              recursive: true,
              dereference: true,
              force: false
            });
        }
      }
      await adapter.adapt({
        ...builder,
        writeClient(destination) {
          const source = builder.getClientDirectory();
          const files = [];
          for (const name of readdirSync(source)) {
            if (name === '.vite') continue;
            if (name === 'gltf') {
              const inventory = JSON.parse(
                readFileSync(join(source, 'gltf/model-files.json'), 'utf8')
              );
              if (inventory.version !== 1 || !Array.isArray(inventory.files))
                throw new Error('Generate the canonical model inventory before building');
              const paths = [
                ...inventory.files.map((/** @type {{ path?: unknown }} */ file) => file?.path),
                'model-files.json'
              ];
              if (new Set(paths).size !== paths.length)
                throw new Error('Duplicate model package path');
              for (const path of paths) {
                if (
                  typeof path !== 'string' ||
                  !path ||
                  path.startsWith('/') ||
                  path.includes('\\') ||
                  path.includes(':') ||
                  path.split('/').includes('..') ||
                  /^(character-previews|simulator-release-\d+|.*preview[^/]*|gelo[^/]*)\//i.test(
                    path
                  )
                )
                  throw new Error('Invalid or private model package path');
                const target = join(destination, 'gltf', path);
                if (linkModels) {
                  mkdirSync(dirname(target), { recursive: true });
                  linkSync(join(source, 'gltf', path), target);
                } else builder.copy(join(source, 'gltf', path), target);
                files.push('gltf/' + path);
              }
            } else {
              files.push(
                ...builder
                  .copy(join(source, name), join(destination, name))
                  .map((path) => (path === name ? path : `${name}/${path}`))
              );
            }
          }
          return files;
        }
      });
    }
  };
}
