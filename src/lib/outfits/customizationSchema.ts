import { z } from 'zod';

const rgb = z.tuple([z.number(), z.number(), z.number()]);
const frameSchema = z.object({
  image: z.string(),
  mask: z.string().nullable(),
  duration: z.number().positive()
});
const sequenceSchema = z.object({
  frames: z.array(frameSchema).min(1),
  repeat: z.boolean(),
  sourceAnimation: z.string().nullable()
});
export const customizationSchema = z.object({
  version: z.literal(1),
  palettes: z.record(
    z.string(),
    z.array(z.object({ id: z.string(), swatch: z.string(), colors: z.array(rgb).length(3) }))
  ),
  faces: z.record(
    z.string(),
    z.object({
      code: z.string(),
      sequences: z.record(z.string(), sequenceSchema),
      poseExpressions: z.record(z.string(), sequenceSchema).optional()
    })
  )
});
export type Customization = z.infer<typeof customizationSchema>;
export type FacePreset = Customization['faces'][string];
