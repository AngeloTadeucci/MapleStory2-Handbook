import fs from 'fs';
import os from 'os';
import { join } from 'path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const execFile = vi.hoisted(() =>
  vi.fn((_bin: string, args: string[], callback: (error: Error | null) => void) => {
    fs.writeFileSync(args[args.indexOf('-o') + 1], 'GIF89a');
    callback(null);
  })
);
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return { ...actual, default: actual, execFile };
});

import { POST } from '../src/routes/api/gif/+server';
type GifRequest = Parameters<typeof POST>[0];

const outputRoot = fs.mkdtempSync(join(os.tmpdir(), 'gif-api-'));
process.env.GIFS_OUTPUT_PATH = outputRoot;
const processingRoot = join(process.cwd(), 'static', 'gifs', 'processing');
const frame = 'data:image/png;base64,iVBORw0KGgo=';

// The rate limiter is module state, so every request gets its own address unless a test says otherwise.
let nextAddress = 0;
function post(body: Record<string, unknown>, address = `10.0.0.${++nextAddress}`) {
  return POST({
    getClientAddress: () => address,
    request: new Request('http://localhost/api/gif', {
      method: 'POST',
      body: JSON.stringify({
        model: '02010001_stan',
        animation: 'Idle_A',
        screenshots: [frame],
        framerate: 10,
        height: 100,
        width: 100,
        quality: 80,
        ...body
      })
    })
  } as unknown as GifRequest);
}

function processingEntries() {
  return fs.existsSync(processingRoot) ? fs.readdirSync(processingRoot) : [];
}

beforeEach(() => {
  execFile.mockClear();
});

// Holds the next two gifski calls open until the test releases them.
function holdGifski() {
  const release: Array<() => void> = [];
  for (let i = 0; i < 2; i++) {
    execFile.mockImplementationOnce((_bin, args, callback) => {
      release.push(() => {
        fs.writeFileSync(args[args.indexOf('-o') + 1], 'GIF89a');
        callback(null);
      });
    });
  }
  return () => release.splice(0).forEach((finish) => finish());
}
afterAll(() => fs.rmSync(outputRoot, { recursive: true, force: true }));

describe('gif API', () => {
  it('rejects a model that walks out of the processing folder before touching disk', async () => {
    const before = processingEntries();
    const response = await post({ model: '../../..' });
    expect(response.status).toBe(400);
    expect(processingEntries()).toEqual(before);
    expect(fs.existsSync(join(process.cwd(), 'package.json'))).toBe(true);
    expect(execFile).not.toHaveBeenCalled();
  });

  it('rejects shell metacharacters in the animation name', async () => {
    const response = await post({ animation: 'a;id;#' });
    expect(response.status).toBe(400);
    expect(execFile).not.toHaveBeenCalled();
  });

  it('accepts native clip names and passes gifski an argument array in frame order', async () => {
    const before = processingEntries();
    const response = await post({
      animation: 'Sit_Chair_Idle_A [sequence 0] [event 14]',
      screenshots: Array.from({ length: 12 }, () => frame)
    });
    expect(response.status).toBe(200);

    const { url } = await response.json();
    expect(url).toMatch(
      /^02010001_stan\/02010001_stan-Sit_Chair_Idle_A__sequence_0___event_14_-.+\.gif$/
    );
    expect(fs.existsSync(join(outputRoot, url))).toBe(true);

    const [, args] = execFile.mock.calls[0];
    const frames = args.slice(args.indexOf('-o') + 2);
    expect(frames).toHaveLength(12);
    expect(frames.map((path: string) => path.slice(-15))).toEqual(
      Array.from({ length: 12 }, (_, i) => `frame-${String(i).padStart(5, '0')}.png`)
    );
    expect(processingEntries()).toEqual(before);
  });

  it('cleans up its processing folder when a screenshot is malformed', async () => {
    const before = processingEntries();
    const response = await post({ screenshots: [frame, 'not-a-png'] });
    expect(response.status).toBe(400);
    expect(processingEntries()).toEqual(before);
    expect(execFile).not.toHaveBeenCalled();
  });

  it.each([
    ['width', { width: 2049 }],
    ['height', { height: 2049 }],
    ['screenshot count', { screenshots: Array.from({ length: 601 }, () => frame) }]
  ])('rejects an oversize %s before touching disk', async (_name, body) => {
    const before = processingEntries();
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(processingEntries()).toEqual(before);
    expect(execFile).not.toHaveBeenCalled();
  });

  it('accepts the largest allowed dimensions and frame count', async () => {
    const response = await post({
      width: 2048,
      height: 2048,
      screenshots: Array.from({ length: 600 }, () => frame)
    });
    expect(response.status).toBe(200);
  });

  it('answers 503 once two gifski runs are active, without writing frames for the third', async () => {
    const before = processingEntries();
    const release = holdGifski();

    const first = post({});
    const second = post({});
    await vi.waitFor(() => expect(execFile).toHaveBeenCalledTimes(2));
    const busy = processingEntries();
    expect(busy).toHaveLength(before.length + 2);

    const third = await post({});
    expect(third.status).toBe(503);
    expect(Number(third.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect((await third.json()).message).toEqual(expect.any(String));
    expect(execFile).toHaveBeenCalledTimes(2);
    expect(processingEntries()).toEqual(busy);

    release();
    expect((await first).status).toBe(200);
    expect((await second).status).toBe(200);
    expect(processingEntries()).toEqual(before);

    expect((await post({})).status).toBe(200);
  });

  it('releases its concurrency slot when gifski fails', async () => {
    // Two leaked slots would be enough to turn every later request into a 503.
    for (let i = 0; i < 2; i++)
      execFile.mockImplementationOnce((_bin, _args, callback) =>
        callback(Object.assign(new Error('gifski failed'), { code: 1 }))
      );
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect((await post({})).status).toBe(500);
    expect((await post({})).status).toBe(500);
    log.mockRestore();
    expect((await post({})).status).toBe(200);
  });

  it('answers 429 with Retry-After once one address is out of requests', async () => {
    const address = '203.0.113.7';
    const statuses: number[] = [];
    let limited: Response | undefined;
    // Invalid requests spend a point without doing any work.
    for (let i = 0; i < 50 && !limited; i++) {
      const response = await post({ model: '../..' }, address);
      statuses.push(response.status);
      if (response.status === 429) limited = response;
    }

    expect(limited).toBeDefined();
    // A real user making a few GIFs must never reach the limit.
    expect(statuses.length - 1).toBeGreaterThanOrEqual(5);
    expect(Number(limited?.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect((await post({}, '203.0.113.8')).status).toBe(200);
  });
});
