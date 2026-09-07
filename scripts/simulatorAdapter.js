import { readdirSync } from 'node:fs';
import { join } from 'node:path';

// Local glTF research trees and saved character snapshots are not release assets.
// Other static assets and application chunks retain the normal adapter behavior.
/**
 * @param {import('@sveltejs/kit').Adapter} adapter
 * @param {string} release
 * @returns {import('@sveltejs/kit').Adapter}
 */
export function simulatorAdapter(adapter, release) {
  if (!/^simulator-release-\d+$/.test(release)) throw new Error('Invalid simulator release');
  return {
    ...adapter,
    async adapt(builder) {
      await adapter.adapt({
        ...builder,
        writeClient(destination) {
          const source = builder.getClientDirectory();
          const files = [];
          for (const name of readdirSync(source)) {
            if (name === '.vite') continue;
            if (name === 'gltf') {
              const prefix = `gltf/${release}/`;
              files.push(
                ...builder
                  .copy(join(source, 'gltf', release), join(destination, 'gltf', release))
                  .map((path) => prefix + path)
              );
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
