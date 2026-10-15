import { z } from 'zod';

// The server enforces the same limits. 2048 covers a full-width canvas on a
// 2560 px display and a few drag-resized custom sizes, with room to spare.
export const GIF_MAX_DIMENSION = 2048;
// 50 fps, the highest rate the UI offers, times a 12 s clip. The server keeps
// every frame in memory and on disk while gifski runs, so this bounds both.
export const GIF_MAX_FRAMES = 600;

export const gifSchema = z.object({
  framerate: z.number().int().min(1).max(60),
  height: z.undefined().or(z.number().int().min(10).max(GIF_MAX_DIMENSION)),
  width: z.undefined().or(z.number().int().min(10).max(GIF_MAX_DIMENSION)),
  quality: z.undefined().or(z.number().int().min(1).max(100))
});

export type GifSchema = typeof gifSchema;
