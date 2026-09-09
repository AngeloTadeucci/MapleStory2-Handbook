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
  progress: (completed: number, total: number) => void
): Promise<string[]> {
  if (!Number.isFinite(source.duration) || source.duration <= 0)
    throw new Error('Select an animation before creating a GIF.');
  if (!Number.isInteger(framerate) || framerate < 10 || framerate > 50)
    throw new Error('Choose a frame rate between 10 and 50.');
  const count = Math.ceil(source.duration * framerate);
  const restore = source.begin();
  try {
    const frames: string[] = [];
    for (let index = 0; index < count; index++) {
      frames.push(await source.frame(index / framerate));
      progress(index + 1, count);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return frames;
  } finally {
    restore();
  }
}
