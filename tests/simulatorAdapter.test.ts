import { describe, it, expect, vi } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  cpSync,
  existsSync,
  rmSync,
  statSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simulatorAdapter } from '../scripts/simulatorAdapter.js';
import type { Builder } from '@sveltejs/kit';

describe('simulator production package', () => {
  it.skipIf(process.platform === 'win32')(
    'restores verified assets after SvelteKit clears its output',
    async () => {
      const root = mkdtempSync(join(tmpdir(), 'simulator-package-'));
      try {
        const source = join(root, 'client'),
          models = join(root, 'models'),
          assets = join(root, 'static'),
          destination = join(root, 'output');
        for (const directory of [source, models, assets]) mkdirSync(directory);
        writeFileSync(join(source, 'app.js'), 'compiled');
        writeFileSync(join(assets, 'icon.png'), 'icon');
        writeFileSync(join(models, 'model.gltf'), 'model');
        writeFileSync(
          join(models, 'model-files.json'),
          JSON.stringify({ version: 1, files: [{ path: 'model.gltf' }] })
        );
        const adapter = simulatorAdapter(
          {
            name: 'fixture',
            adapt: async (builder) => {
              builder.writeClient(destination);
            }
          },
          { linkModels: true, modelsDirectory: models }
        );
        await adapter.adapt({
          getClientDirectory: () => source,
          config: { kit: { files: { assets } } },
          copy: (from: string, to: string) => {
            cpSync(from, to, { recursive: true });
            return [];
          }
        } as unknown as Builder);
        expect(statSync(join(destination, 'gltf/model.gltf')).ino).toBe(
          statSync(join(models, 'model.gltf')).ino
        );
        expect(existsSync(join(destination, 'icon.png'))).toBe(true);
        expect(existsSync(join(destination, 'app.js'))).toBe(true);
      } finally {
        if (!root.startsWith(join(tmpdir(), 'simulator-package-')))
          throw new Error('Unexpected temporary directory');
        rmSync(root, { recursive: true });
      }
    }
  );
  it.each([
    '../secret',
    '/absolute',
    'https://host/file',
    'character-previews/private.json',
    'CHARACTER-PREVIEWS/private.json',
    'simulator-release-15/model.gltf'
  ])('rejects unsafe or private allowlist path %s before copying it', async (path) => {
    const root = mkdtempSync(join(tmpdir(), 'simulator-package-'));
    try {
      mkdirSync(join(root, 'gltf'));
      writeFileSync(
        join(root, 'gltf/model-files.json'),
        JSON.stringify({ version: 1, files: [{ path }] })
      );
      const copy = vi.fn();
      const adapter = simulatorAdapter({
        name: 'fixture',
        adapt: async (builder) => {
          builder.writeClient(join(root, 'output'));
        }
      });
      await expect(
        adapter.adapt({ getClientDirectory: () => root, copy } as unknown as Builder)
      ).rejects.toThrow('Invalid or private');
      expect(copy).not.toHaveBeenCalled();
    } finally {
      rmSync(root, { recursive: true });
    }
  });
  it.each([false, true])(
    'packages canonical files and ordinary assets, linking models: %s',
    async (linkModels) => {
      const root = mkdtempSync(join(tmpdir(), 'simulator-package-'));
      try {
        const source = join(root, 'client'),
          destination = join(root, 'output');
        for (const path of [
          'gltf/hat/hat.gltf',
          'gltf/character-previews/gelo/character.json',
          'gltf/simulator-candidate-04/model.gltf',
          '_app/chunk.js',
          'icons/item.png'
        ]) {
          const file = join(source, path);
          mkdirSync(join(file, '..'), { recursive: true });
          writeFileSync(file, path);
        }
        writeFileSync(
          join(source, 'gltf/model-files.json'),
          JSON.stringify({ version: 1, files: [{ path: 'hat/hat.gltf' }] })
        );
        const adapter = simulatorAdapter(
          {
            name: 'fixture',
            adapt: async (builder) => {
              builder.writeClient(destination);
            }
          },
          { linkModels }
        );
        const builder = {
          getClientDirectory: () => source,
          copy: (from: string, to: string) => {
            cpSync(from, to, { recursive: true });
            return [];
          }
        };
        await adapter.adapt(builder as unknown as Builder);
        expect(existsSync(join(destination, 'gltf/hat/hat.gltf'))).toBe(true);
        if (linkModels)
          expect(statSync(join(destination, 'gltf/hat/hat.gltf')).ino).toBe(
            statSync(join(source, 'gltf/hat/hat.gltf')).ino
          );
        expect(existsSync(join(destination, '_app/chunk.js'))).toBe(true);
        expect(existsSync(join(destination, 'icons/item.png'))).toBe(true);
        expect(existsSync(join(destination, 'gltf/character-previews'))).toBe(false);
        expect(existsSync(join(destination, 'gltf/simulator-candidate-04'))).toBe(false);
        expect(existsSync(join(source, 'gltf/character-previews/gelo/character.json'))).toBe(true);
      } finally {
        if (!root.startsWith(join(tmpdir(), 'simulator-package-')))
          throw new Error('Unexpected temporary directory');
        rmSync(root, { recursive: true });
      }
    }
  );
});
