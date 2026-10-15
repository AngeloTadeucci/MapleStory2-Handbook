import { json, type RequestEvent } from '@sveltejs/kit';
import { execFile } from 'child_process';
import fs from 'fs';
import { z } from 'zod';
import { join } from 'path';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { GIF_MAX_DIMENSION, GIF_MAX_FRAMES } from '$lib/schemas/gif';

// These values reach the filesystem and the gifski command line. Native clip
// names contain spaces and brackets, e.g. "Sit_Chair_Idle_A [sequence 0] [event 14]".
const schema = z.object({
  model: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  download: z.boolean().default(false),
  animation: z.string().regex(/^[A-Za-z0-9_ [\]-]{1,80}$/),
  screenshots: z.array(z.string()).max(GIF_MAX_FRAMES),
  framerate: z.number().int().min(10).max(50),
  height: z.number().int().positive().max(GIF_MAX_DIMENSION),
  width: z.number().int().positive().max(GIF_MAX_DIMENSION),
  quality: z.number().int().min(1).max(100)
});

// Someone tuning size and quality makes a handful of GIFs in a few minutes.
const rateLimiter = new RateLimiterMemory({
  points: 10, // 10 requests
  duration: 60 * 10 // 10 minutes
});

// gifski is CPU heavy and each job holds every frame in memory and on disk.
const MAX_CONCURRENT_JOBS = 2;
const BUSY_RETRY_AFTER_SECONDS = 15;
let activeJobs = 0;

export const POST = async ({ request, getClientAddress }: RequestEvent) => {
  try {
    await rateLimiter.consume(getClientAddress());
  } catch (err) {
    if (!(err instanceof RateLimiterRes)) throw err;
    return json(
      { message: 'Too many GIF requests. Try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.max(1, Math.ceil(err.msBeforeNext / 1000))) }
      }
    );
  }

  const validation = schema.safeParse(await request.json().catch(() => null));

  if (!validation.success) {
    return new Response(
      JSON.stringify({ message: 'Invalid request', errors: validation.error.issues }),
      {
        status: 400
      }
    );
  }

  const { model, animation, screenshots, framerate, height, width, quality, download } =
    validation.data;

  if (screenshots.length === 0) {
    return new Response(JSON.stringify({ message: 'No screenshot saved' }), {
      status: 400
    });
  }

  if (activeJobs >= MAX_CONCURRENT_JOBS) {
    return json(
      { message: 'The GIF service is busy. Try again in a moment.' },
      { status: 503, headers: { 'Retry-After': String(BUSY_RETRY_AFTER_SECONDS) } }
    );
  }
  activeJobs++;

  const processingFolder = join(process.cwd(), 'static', 'gifs', 'processing', crypto.randomUUID());

  try {
    fs.mkdirSync(processingFolder, { recursive: true });
    const frames: string[] = [];
    for (let i = 0; i < screenshots.length; i++) {
      const screenshot = screenshots[i];
      if (!screenshot.includes('data:image/png;base64,')) {
        return new Response(JSON.stringify({ message: 'Invalid screenshot format' }), {
          status: 400
        });
      }
      const base64Data = screenshot.replace(/^data:image\/png;base64,/, '');
      if (base64Data.length <= 0) {
        return new Response(JSON.stringify({ message: 'No screenshot data' }), {
          status: 400
        });
      }
      const frame = join(processingFolder, `frame-${String(i).padStart(5, '0')}.png`);
      fs.writeFileSync(frame, base64Data, 'base64');
      frames.push(frame);
    }

    const gif = await convertToGif(frames, model, animation, framerate, height, width, quality);

    if (download) {
      const data = fs.readFileSync(join(gifOutputFolder(model), gif));
      return new Response(data, {
        headers: {
          'Content-Type': 'image/gif',
          'Content-Disposition': 'attachment; filename="maplestory2-outfit.gif"'
        }
      });
    }
    return json({ url: `${model}/${gif}` });
  } catch (err) {
    return new Response(JSON.stringify({ message: 'Failed to create gif', code: err }), {
      status: 500
    });
  } finally {
    activeJobs--;
    fs.rmSync(processingFolder, { recursive: true, force: true });
  }
};

function convertToGif(
  frames: string[],
  model: string,
  animation: string,
  framerate: number,
  height: number,
  width: number,
  quality: number
) {
  const outputFolder = gifOutputFolder(model);
  fs.mkdirSync(outputFolder, { recursive: true });

  const safeAnimation = animation.replace(/[^A-Za-z0-9_-]/g, '_');
  const outputFileName = `${model}-${safeAnimation}-${crypto.randomUUID()}.gif`;
  const outputFile = join(outputFolder, outputFileName);

  const gifskiBin = process.env.GIFSKI_PATH ?? join(process.cwd(), 'bin', 'gifski');
  const args = [
    '--fps',
    String(framerate),
    '-H',
    String(height),
    '-W',
    String(width),
    '--quality',
    String(quality),
    '-o',
    outputFile,
    ...frames
  ];

  return new Promise<string>(function (resolve, reject) {
    execFile(gifskiBin, args, function (error) {
      if (error) {
        console.log(error.stack);
        console.log('[gifski] Error code: ' + error.code);
        console.log('[gifski] Signal received: ' + error.signal);
        reject(error.code ?? 1);
        return;
      }
      resolve(outputFileName);
    });
  });
}

function gifOutputFolder(model: string) {
  return process.env.GIFS_OUTPUT_PATH
    ? join(process.env.GIFS_OUTPUT_PATH, model)
    : join(process.cwd(), '..', 'gifs', model);
}
