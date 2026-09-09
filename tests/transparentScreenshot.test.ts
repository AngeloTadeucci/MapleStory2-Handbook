import { Camera, Color, Scene, type WebGLRenderer } from 'three';
import { expect, it, vi } from 'vitest';
import { transparentScreenshot } from '../src/lib/outfits/transparentScreenshot';

it.each([false, true])(
  'restores the preview background and alpha when export fails=%s',
  (fails) => {
    const scene = new Scene();
    const background = new Color('blue');
    scene.background = background;
    let alpha = 1;
    const render = vi.fn();
    const renderer = {
      getClearAlpha: () => alpha,
      setClearAlpha: (value: number) => {
        alpha = value;
      },
      render,
      domElement: {
        toDataURL: () => {
          expect(scene.background).toBeNull();
          expect(alpha).toBe(0);
          if (fails) throw new Error('Export failed');
          return 'data:image/png;base64,test';
        }
      }
    } as unknown as WebGLRenderer;
    if (fails)
      expect(() => transparentScreenshot(renderer, scene, new Camera())).toThrow('Export failed');
    else
      expect(transparentScreenshot(renderer, scene, new Camera())).toBe(
        'data:image/png;base64,test'
      );
    expect(scene.background).toBe(background);
    expect(alpha).toBe(1);
    expect(render).toHaveBeenCalledTimes(2);
  }
);
