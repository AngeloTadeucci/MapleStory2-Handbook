import { expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ dev: false }));
import { loadHairPreviews } from '../src/lib/outfits/hairPreviews';

it('does not request excluded local hair previews in production', async () => {
  const fetcher = vi.fn<typeof fetch>();
  expect(await loadHairPreviews(fetcher, 'https://handbook.tadeucci.dev')).toEqual([]);
  expect(fetcher).not.toHaveBeenCalled();
});
