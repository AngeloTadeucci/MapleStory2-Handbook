import { z } from 'zod';

export const gifSchema = z.object({
	framerate: z.number().int().min(1).max(60),
	height: z.undefined().or(z.number().int().min(10)),
	width: z.undefined().or(z.number().int().min(10)),
	quality: z.undefined().or(z.number().int().min(1).max(100))
});

export type GifSchema = typeof gifSchema;
