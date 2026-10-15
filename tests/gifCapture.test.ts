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

  it('stops capturing and restores playback once aborted', async () => {
    const { source, restore } = fixture(2);
    const controller = new AbortController();
    source.frame = vi.fn((time) => {
      if (time >= 0.2) controller.abort();
      return `frame:${time}`;
    });
    await expect(captureGifFrames(source, 10, vi.fn(), controller.signal)).rejects.toThrow();
    expect(source.frame).toHaveBeenCalledTimes(3);
    expect(restore).toHaveBeenCalledOnce();
  });

  it('does not touch the scene when already aborted', async () => {
    const { source } = fixture();
    const controller = new AbortController();
    controller.abort();
    await expect(captureGifFrames(source, 10, vi.fn(), controller.signal)).rejects.toThrow();
    expect(source.begin).not.toHaveBeenCalled();
    expect(source.frame).not.toHaveBeenCalled();
  });

  it('refuses animations that need more frames than the server accepts, before pausing', async () => {
    const { source } = fixture(12.1);
    await expect(captureGifFrames(source, 50, vi.fn())).rejects.toThrow('limited to 600');
    expect(source.begin).not.toHaveBeenCalled();
  });

  it('starts capturing an animation that needs exactly the maximum frame count', async () => {
    const { source } = fixture(12);
    const controller = new AbortController();
    source.frame = vi.fn(() => {
      controller.abort();
      return 'frame';
    });
    const progress = vi.fn();
    await captureGifFrames(source, 50, progress, controller.signal).catch(() => undefined);
    expect(source.begin).toHaveBeenCalledOnce();
    expect(progress).toHaveBeenCalledWith(1, 600);
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
