import { z } from 'zod';

export const decalSchema = z.object({
  texture: z.string().regex(/^makeup\/item_makeup\/[a-z0-9_]+\.png$/),
  mask: z
    .string()
    .regex(/^makeup\/item_makeup\/[a-z0-9_]+\.png$/)
    .optional(),
  transform: z.tuple([
    z.number().finite(),
    z.number().finite(),
    z.number().finite(),
    z.number().positive()
  ]),
  placements: z
    .array(
      z.tuple([
        z.number().finite(),
        z.number().finite(),
        z.number().finite(),
        z.number().positive()
      ])
    )
    .optional(),
  scaleRange: z.tuple([z.number().positive(), z.number().positive()]).optional()
});
export type FaceDecalData = z.infer<typeof decalSchema>;
