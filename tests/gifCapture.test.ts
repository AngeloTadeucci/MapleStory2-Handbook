import { describe, expect, it, vi } from 'vitest';
import { captureGifFrames, type GifCaptureSource } from '../src/lib/gifCapture';

describe('GIF frame capture', () => {
  function fixture(duration = 0.21) {
    const restore = vi.fn();
    const source: GifCaptureSource = {
      width: 400,
      height: 400,
      duration,
      begin: vi.fn(() => restore),
      frame: vi.fn((time) => `frame:${time}`)
    };
    return { source, restore };
  }

  it('captures one loop at fixed frame intervals and restores playback', async () => {
    const { source, restore } = fixture();
    const progress = vi.fn();
    expect(await captureGifFrames(source, 10, progress)).toEqual([
      'frame:0',
      'frame:0.1',
      'frame:0.2'
    ]);
    expect(progress).toHaveBeenLastCalledWith(3, 3);
    expect(restore).toHaveBeenCalledExactlyOnceWith();
  });

  it('restores playback when rendering fails', async () => {
    const { source, restore } = fixture();
    source.frame = () => {
      throw new Error('Canvas unavailable');
    };
    await expect(captureGifFrames(source, 15, vi.fn())).rejects.toThrow('Canvas unavailable');
    expect(restore).toHaveBeenCalledOnce();
  });

  it.each([0, -1, NaN, Infinity])(
    'rejects unusable duration %s before pausing',
    async (duration) => {
      const { source } = fixture(duration);
      await expect(captureGifFrames(source, 15, vi.fn())).rejects.toThrow('Select an animation');
      expect(source.begin).not.toHaveBeenCalled();
    }
  );
});
