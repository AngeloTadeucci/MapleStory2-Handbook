import { z } from 'zod';

const channel = z.number().min(0).max(1);
const rgb = z.tuple([channel, channel, channel]);
export const characterPreviewSchema = z.object({
  version: z.literal(1),
  name: z.string().max(40),
  body: z.enum(['female', 'male']),
  skin: z.array(rgb).length(3),
  items: z.array(
    z.object({
      id: z.number().int().positive(),
      hand: z.enum(['RH', 'LH']).optional(),
      colors: z.array(rgb).length(3).optional(),
      hairLengths: z.array(z.number().min(0).max(1)).optional()
    })
  ),
  omitted: z.array(z.string()),
  notes: z.array(z.string()).default([])
});
