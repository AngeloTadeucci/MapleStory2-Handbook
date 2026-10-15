import { GIF_MAX_FRAMES } from '$lib/schemas/gif';

export type GifCaptureSource = {
  width: number;
  height: number;
  duration: number;
  begin: () => () => void;
  frame: (time: number) => string | Promise<string>;
};

export async function captureGifFrames(
  source: GifCaptureSource,
  framerate: number,
  progress: (completed: number, total: number) => void,
  signal?: AbortSignal
): Promise<string[]> {
  if (!Number.isFinite(source.duration) || source.duration <= 0)
    throw new Error('Select an animation before creating a GIF.');
  if (!Number.isInteger(framerate) || framerate < 10 || framerate > 50)
    throw new Error('Choose a frame rate between 10 and 50.');
  const count = Math.ceil(source.duration * framerate);
  if (count > GIF_MAX_FRAMES)
    throw new Error(
      `This animation needs ${count} frames, and GIFs are limited to ${GIF_MAX_FRAMES}. Choose a lower frame rate.`
    );
  signal?.throwIfAborted();
  const restore = source.begin();
  try {
    const frames: string[] = [];
    for (let index = 0; index < count; index++) {
      signal?.throwIfAborted();
      frames.push(await source.frame(index / framerate));
      progress(index + 1, count);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    signal?.throwIfAborted();
    return frames;
  } finally {
    restore();
  }
}
