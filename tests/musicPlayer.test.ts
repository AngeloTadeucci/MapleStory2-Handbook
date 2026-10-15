import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('$env/static/public', () => ({ PUBLIC_MODELS_URL: 'https://cdn.test/' }));

class FakeAudio {
  src = '';
  volume = 1;
  currentTime = 0;
  duration = 0;
  playResults: Array<() => Promise<void>> = [];
  playCalls = 0;
  addEventListener() {}
  pause() {}
  play() {
    this.playCalls++;
    const next = this.playResults.shift();
    return next ? next() : Promise.resolve();
  }
}

const track = { id: 1, name: 'a', fileName: 'a.mp3', durationSeconds: 10 };
const track2 = { id: 2, name: 'b', fileName: 'b.mp3', durationSeconds: 10 };

let pendingFrames: Map<number, FrameRequestCallback>;
let nextFrameId: number;
let audio: FakeAudio;

async function loadPlayer() {
  vi.resetModules();
  const { musicPlayer } = await import('../src/lib/stores/musicPlayer.svelte');
  // The store keeps its audio element private, and the constructor made it from the stubbed global.
  audio = (musicPlayer as unknown as { audio: FakeAudio }).audio;
  return musicPlayer;
}

describe('musicPlayer', () => {
  beforeEach(() => {
    pendingFrames = new Map();
    nextFrameId = 1;
    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = nextFrameId++;
      pendingFrames.set(id, callback);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      pendingFrames.delete(id);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('keeps one requestAnimationFrame loop after two starts', async () => {
    const player = await loadPlayer();

    player.play(track);
    await Promise.resolve();
    player.play(track2);
    await Promise.resolve();

    expect(player.isPlaying).toBe(true);
    expect(pendingFrames.size).toBe(1);
  });

  it('stops the loop on pause and restarts a single loop on resume', async () => {
    const player = await loadPlayer();

    player.play(track);
    await Promise.resolve();
    player.togglePlay();
    expect(player.isPlaying).toBe(false);
    expect(pendingFrames.size).toBe(0);

    player.togglePlay();
    await Promise.resolve();
    expect(player.isPlaying).toBe(true);
    expect(pendingFrames.size).toBe(1);
  });

  it('leaves isPlaying false and starts no loop when play rejects', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const player = await loadPlayer();
    audio.playResults.push(() => Promise.reject(new DOMException('blocked', 'NotAllowedError')));

    player.play(track);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(player.isPlaying).toBe(false);
    expect(pendingFrames.size).toBe(0);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('ignores AbortError without warning and without marking the player as playing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const player = await loadPlayer();
    audio.playResults.push(() => Promise.reject(new DOMException('interrupted', 'AbortError')));

    player.play(track);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(player.isPlaying).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });
});
