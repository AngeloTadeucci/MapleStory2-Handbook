import { json } from '@sveltejs/kit';
import { exec } from 'child_process';
import type { ExecException } from 'child_process';
import fs from 'fs';
import { z } from 'zod';
import { join } from 'path';

const schema = z.object({
  model: z.string(),
  animation: z.string(),
  screenshots: z.array(z.string()),
  framerate: z.number().int().min(10).max(50),
  height: z.number().int().positive(),
  width: z.number().int().positive(),
  quality: z.number().int().min(1).max(100)
});

export const POST = async ({ request }) => {
  const { model, animation, screenshots, framerate, height, width, quality } = await request.json();

  const validation = schema.safeParse({
    model,
    animation,
    screenshots,
    framerate,
    height,
    width,
    quality
  });

  if (!validation.success) {
    return new Response(
      JSON.stringify({ message: 'Invalid request', errors: validation.error.issues }),
      {
        status: 400
      }
    );
  }

  const appPath = process.cwd();
  const processingFolder = join(appPath, 'static', 'gifs', 'processing', model);

  // check if processing folder has items, if so delete all
  if (fs.existsSync(processingFolder)) {
    fs.rmSync(processingFolder, { recursive: true });
    fs.mkdirSync(processingFolder, { recursive: true });
  } else {
    fs.mkdirSync(processingFolder, { recursive: true });
  }

  const baseFileName = `${model}-${animation}-`;

  for (let i = 0; i < screenshots.length; i++) {
    const screenshot: string = screenshots[i];
    if (!screenshot.includes('data:image/png;base64,')) {
      return new Response(JSON.stringify({ message: 'No screenshot' }), {
        status: 400
      });
    }
    const fileName = `${baseFileName}${i}.png`;
    const base64Data = screenshot.replace(/^data:image\/png;base64,/, '');
    if (base64Data.length <= 0) {
      return new Response(JSON.stringify({ message: 'No screenshot data' }), {
        status: 400
      });
    }
    const processingFile = join(processingFolder, fileName);
    fs.writeFileSync(processingFile, base64Data, 'base64');
  }

  if (!fs.existsSync(join(processingFolder, baseFileName) + '0.png')) {
    return new Response(JSON.stringify({ message: 'No screenshot saved' }), {
      status: 400
    });
  }

  try {
    const gif = await convertToGif(
      processingFolder,
      `${baseFileName}*.png`,
      model,
      animation,
      framerate,
      height,
      width,
      quality
    );
    fs.rmSync(processingFolder, { recursive: true });

    return json({ url: `${model}/${gif}` });
  } catch (err) {
    fs.rmSync(processingFolder, { recursive: true });
    return new Response(JSON.stringify({ message: 'Failed to create gif', code: err }), {
      status: 500
    });
  }
};

async function convertToGif(
  folder: string,
  fileName: string,
  model: string,
  animation: string,
  framerate: number,
  height: number,
  width: number,
  quality: number
) {
  let appPath = process.cwd();

  appPath = appPath.substring(0, appPath.lastIndexOf(process.platform === 'win32' ? '\\' : '/'));

  const outputFolder = join(appPath, 'gifs', model);

  const outputFileName = `${model}-${animation}-${crypto.randomUUID()}.gif`;

  const inputFile = join(folder, fileName);

  return new Promise(function (resolve, reject) {
    if (!fs.existsSync(inputFile.replace('*', '0'))) {
      reject(400);
      return;
    }

    const outputFile = join(outputFolder, outputFileName);
    if (!fs.existsSync(outputFile)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    const gifski = exec(
      `gifski --fps ${framerate} -H ${height} -W ${width} --quality ${quality} ${inputFile} -o ${outputFile} `, // -H 320 -W 320 --quality 70 --motion-quality 40 --lossy-quality 40
      function (error: ExecException | null) {
        if (error) {
          console.log(error.stack);
          console.log('[gifski] Error code: ' + error.code);
          console.log('[gifski] Signal received: ' + error.signal);
        }
      }
    );

    gifski.on('exit', function (code: number | null) {
      if (code != 0) {
        reject(code);
      } else {
        resolve(outputFileName);
      }
    });
  });
}
