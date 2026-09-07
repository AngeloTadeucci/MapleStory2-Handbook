import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simulatorAdapter } from '../scripts/simulatorAdapter.js';
import type { Builder } from '@sveltejs/kit';

describe('simulator production package', () => {
  it('copies the selected release and ordinary assets while keeping character snapshots local', async () => {
    const root = mkdtempSync(join(tmpdir(), 'simulator-package-'));
    try {
      const source = join(root, 'client'),
        destination = join(root, 'output');
      for (const path of [
        'gltf/simulator-release-04/manifest.json',
        'gltf/character-previews/gelo/character.json',
        'gltf/simulator-candidate-04/model.gltf',
        '_app/chunk.js',
        'icons/item.png'
      ]) {
        const file = join(source, path);
        mkdirSync(join(file, '..'), { recursive: true });
        writeFileSync(file, path);
      }
      const adapter = simulatorAdapter(
        {
          name: 'fixture',
          adapt: async (builder) => {
            builder.writeClient(destination);
          }
        },
        'simulator-release-04'
      );
      const builder = {
        getClientDirectory: () => source,
        copy: (from: string, to: string) => {
          cpSync(from, to, { recursive: true });
          return [];
        }
      };
      await adapter.adapt(builder as unknown as Builder);
      expect(existsSync(join(destination, 'gltf/simulator-release-04/manifest.json'))).toBe(true);
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
  });
});
