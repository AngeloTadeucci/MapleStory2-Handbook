import { z } from 'zod';
import {
  AdditiveBlending,
  Box3,
  BufferGeometry,
  Color,
  ClampToEdgeWrapping,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Matrix3,
  Matrix4,
  Mesh,
  Object3D,
  Quaternion,
  RepeatWrapping,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  Texture,
  TextureLoader,
  Vector3,
  type Camera
} from 'three';

const vector = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
const surface = z
  .object({
    positions: z.array(vector).min(3).max(10000),
    normals: z.array(vector),
    indices: z.array(z.number().int().nonnegative()).min(3).max(60000),
    uv: z.array(z.tuple([z.number(), z.number()]))
  })
  .superRefine((s, c) => {
    if (
      s.indices.length % 3 ||
      s.indices.some((i) => i >= s.positions.length) ||
      s.normals.length !== s.positions.length
    )
      c.addIssue({ code: 'custom', message: 'Invalid effect emission surface' });
  });
const material = z.object({ diffuse: vector, emissive: vector, alpha: z.number().min(0).max(1) });
const curve = z.array(z.tuple([z.number(), z.number(), z.number(), z.number()])).min(2);
const transform = z.object({
  translation: z.tuple([z.number(), z.number()]),
  scale: z.tuple([z.number(), z.number()]),
  rotation: z.number(),
  method: z.literal(1),
  center: z.tuple([z.number(), z.number()])
});
export const cosmeticEffectSchema = z.object({
  version: z.literal(1),
  kind: z.literal('hair-twinkle-a'),
  attachNode: z.literal('Bip01 Head'),
  itemIds: z.array(z.number().int().positive()),
  notes: z.array(z.string()),
  systems: z
    .array(
      z.object({
        name: z.string(),
        surface,
        material,
        texture: z.literal('hitlight_8-2.png'),
        capacity: z.number().int().min(1).max(8),
        rate: z.number().positive().max(10),
        worldSpace: z.boolean(),
        speed: z.number().nonnegative(),
        speedVariation: z.number().nonnegative(),
        size: z.number().positive(),
        sizeVariation: z.number().nonnegative(),
        lifespan: z.number().positive(),
        lifespanVariation: z.number().nonnegative(),
        growTime: z.number().positive(),
        shrinkTime: z.number().positive(),
        drag: z.number().min(0).max(1)
      })
    )
    .length(2),
  glow: z.object({
    surface,
    material,
    transforms: z.array(z.array(z.number()).length(13)).length(3),
    textures: z
      .array(
        z.object({
          slot: z.number().int(),
          texture: z.enum(['gradient_light_02.png', 'one_002.png', 'alpha_0352.png']),
          flags: z.number().int(),
          transform: transform.nullable()
        })
      )
      .length(3),
    alphaKeys: curve,
    scaleUKeys: curve,
    scaleVKeys: curve
  })
});
export type CosmeticEffectData = z.infer<typeof cosmeticEffectSchema>;
export function effectUvMatrix(value: z.infer<typeof transform> | null, scale = value?.scale) {
  if (!value || !scale) return new Matrix3();
  const [cx, cy] = value.center,
    [tx, ty] = value.translation,
    [sx, sy] = scale;
  const c = Math.cos(value.rotation),
    s = Math.sin(value.rotation);
  return new Matrix3().set(
    sx * c,
    -sx * s,
    sx * (c * (tx - cx) - s * (ty - cy)) + cx,
    sy * s,
    sy * c,
    sy * (s * (tx - cx) + c * (ty - cy)) + cy,
    0,
    0,
    1
  );
}
type System = CosmeticEffectData['systems'][number];
type Particle = { position: Vector3; velocity: Vector3; age: number; life: number; size: number };

// Repeatable sampling makes seeking and regressions inspectable. The client's
// random sequence is not reproduced; its source ranges and surfaces are used.
export function randomSequence(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function sampleSurface(s: System['surface'], random: () => number) {
  const triangle =
    Math.min(Math.floor((random() * s.indices.length) / 3), s.indices.length / 3 - 1) * 3;
  const u = Math.sqrt(random()),
    v = random(),
    weights = [1 - u, u * (1 - v), u * v];
  const position = new Vector3(),
    normal = new Vector3();
  weights.forEach((w, j) => {
    const i = s.indices[triangle + j];
    position.addScaledVector(new Vector3(...s.positions[i]), w);
    normal.addScaledVector(new Vector3(...s.normals[i]), w);
  });
  return { position, normal: normal.normalize() };
}
export function particleScale(
  p: Pick<Particle, 'age' | 'life' | 'size'>,
  s: Pick<System, 'growTime' | 'shrinkTime'>
) {
  return p.size * Math.max(0, Math.min(1, p.age / s.growTime, (p.life - p.age) / s.shrinkTime));
}
export class ParticleSimulation {
  particles: Particle[] = [];
  time = 0;
  private nextBirth: number;
  private random: () => number;
  constructor(
    readonly source: System,
    private seed = 1
  ) {
    this.random = randomSequence(seed);
    this.nextBirth = 1 / source.rate;
  }
  reset() {
    this.particles = [];
    this.time = 0;
    this.nextBirth = 1 / this.source.rate;
    this.random = randomSequence(this.seed);
  }
  step(dt: number, head: Matrix4) {
    const s = this.source;
    this.time += dt;
    for (const p of this.particles) {
      p.age += dt;
      // Continuous linear drag is the pilot integration. Exact Gamebryo
      // frame-dependent drag parity remains in the source review notes.
      p.velocity.multiplyScalar(Math.exp(-s.drag * dt));
      p.position.addScaledVector(p.velocity, dt);
    }
    this.particles = this.particles.filter((p) => p.age < p.life);
    while (this.nextBirth <= this.time + 1e-8) {
      this.nextBirth += 1 / s.rate;
      if (this.particles.length >= s.capacity) continue;
      const { position, normal } = sampleSurface(s.surface, this.random);
      const speed = s.speed + (this.random() * 2 - 1) * s.speedVariation;
      const velocity = normal.multiplyScalar(speed);
      if (s.worldSpace) {
        position.applyMatrix4(head);
        velocity.applyMatrix3(new Matrix3().setFromMatrix4(head));
      }
      this.particles.push({
        position,
        velocity,
        age: 0,
        life: Math.max(0.001, s.lifespan + (this.random() * 2 - 1) * s.lifespanVariation),
        size:
          Math.max(0, s.size + (this.random() * 2 - 1) * s.sizeVariation) *
          (s.worldSpace ? new Vector3().setFromMatrixScale(head).x : 1)
      });
    }
  }
}
export function evaluateCurve(keys: number[][], time: number) {
  const end = keys[keys.length - 1][0];
  const t = end > 0 ? time % end : 0;
  const i = Math.max(0, keys.findIndex((k) => k[0] > t) - 1),
    a = keys[i],
    b = keys[i + 1] ?? a;
  const u = b[0] === a[0] ? 0 : (t - a[0]) / (b[0] - a[0]),
    u2 = u * u,
    u3 = u2 * u;
  return (
    (2 * u3 - 3 * u2 + 1) * a[1] +
    (u3 - 2 * u2 + u) * a[2] +
    (-2 * u3 + 3 * u2) * b[1] +
    (u3 - u2) * b[3]
  );
}
function nifMatrix(t: number[]) {
  return new Matrix4().set(
    t[3] * t[12],
    t[4] * t[12],
    t[5] * t[12],
    t[0],
    t[6] * t[12],
    t[7] * t[12],
    t[8] * t[12],
    t[1],
    t[9] * t[12],
    t[10] * t[12],
    t[11] * t[12],
    t[2],
    0,
    0,
    0,
    1
  );
}

export class CosmeticEffect {
  readonly root = new Group();
  readonly simulations: ParticleSimulation[];
  private sprites: Sprite[][] = [];
  private glow: Mesh<BufferGeometry, ShaderMaterial>;
  private glowParent = new Group();
  private billboard = new Group();
  private accumulator = 0;
  private elapsed = 0;
  private disposed = false;
  enabled = true;
  private constructor(
    readonly data: CosmeticEffectData,
    private head: Object3D,
    private textures: Texture[]
  ) {
    this.root.name = 'Cosmetic hair effect preview';
    this.simulations = data.systems.map((s, i) => new ParticleSimulation(s, i + 1));
    for (const s of data.systems) {
      const color = new Color().fromArray(s.material.diffuse);
      const sprites = Array.from({ length: s.capacity }, () => {
        const sprite = new Sprite(
          new SpriteMaterial({
            map: textures[0],
            color,
            transparent: true,
            depthWrite: false,
            depthTest: true,
            toneMapped: false
          })
        );
        sprite.visible = false;
        this.root.add(sprite);
        return sprite;
      });
      this.sprites.push(sprites);
    }
    const g = data.glow,
      geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(g.surface.positions.flat(), 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(g.surface.uv.flat(), 2));
    geometry.setIndex(g.surface.indices);
    const shader = new ShaderMaterial({
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      side: DoubleSide,
      toneMapped: false,
      uniforms: {
        base: { value: textures[1] },
        dark: { value: textures[2] },
        detail: { value: textures[3] },
        tint: { value: new Color().fromArray(g.material.diffuse) },
        opacity: { value: g.material.alpha },
        baseUv: { value: effectUvMatrix(g.textures[0].transform) },
        darkUv: { value: effectUvMatrix(g.textures[1].transform) },
        detailUv: { value: effectUvMatrix(g.textures[2].transform) }
      },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform sampler2D base,dark,detail; uniform vec3 tint; uniform float opacity; uniform mat3 baseUv,darkUv,detailUv; varying vec2 vUv;
      void main(){vec4 b=texture2D(base,(baseUv*vec3(vUv,1.)).xy);vec3 d=texture2D(dark,(darkUv*vec3(vUv,1.)).xy).rgb;
      vec4 detailColor=texture2D(detail,(detailUv*vec3(vUv,1.)).xy);
      gl_FragColor=vec4(tint*b.rgb*d*detailColor.rgb*2.,opacity*b.a*detailColor.a);}`
    });
    this.glow = new Mesh(geometry, shader);
    this.glow.matrix.copy(nifMatrix(g.transforms[2]));
    this.glow.matrixAutoUpdate = false;
    this.glowParent.matrixAutoUpdate = false;
    this.billboard.position.set(...(g.transforms[1].slice(0, 3) as [number, number, number]));
    this.billboard.add(this.glow);
    this.glowParent.add(this.billboard);
    this.root.add(this.glowParent);
  }
  static async load(url: string, itemId: number, head: Object3D) {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Unable to load the hair effect');
    const data = cosmeticEffectSchema.parse(await response.json());
    if (!data.itemIds.includes(itemId)) throw new Error('Effect does not belong to this hair');
    const textures: Texture[] = [];
    try {
      for (const name of [
        'hitlight_8-2.png',
        'gradient_light_02.png',
        'one_002.png',
        'alpha_0352.png'
      ]) {
        const t = await new TextureLoader().loadAsync(
          new URL(name, new URL(url, location.href)).href
        );
        textures.push(t);
        t.flipY = false;
        const descriptor = data.glow.textures.find((d) => d.texture === name);
        const flags = descriptor?.flags ?? 0x0200;
        t.wrapS = flags & 0x2000 ? RepeatWrapping : ClampToEdgeWrapping;
        t.wrapT = flags & 0x1000 ? RepeatWrapping : ClampToEdgeWrapping;
      }
      return new CosmeticEffect(data, head, textures);
    } catch (error) {
      for (const t of textures) t.dispose();
      throw error;
    }
  }
  update(delta: number, camera: Camera) {
    if (this.disposed) return;
    this.root.visible = this.enabled;
    if (!this.enabled) return;
    this.head.updateWorldMatrix(true, false);
    this.accumulator += Math.min(0.25, Math.max(0, delta));
    const step = 1 / 120;
    while (this.accumulator + 1e-10 >= step) {
      for (const s of this.simulations) s.step(step, this.head.matrixWorld);
      this.accumulator -= step;
      this.elapsed += step;
    }
    this.simulations.forEach((sim, i) =>
      this.sprites[i].forEach((sprite, j) => {
        const p = sim.particles[j];
        sprite.visible = !!p;
        if (p) {
          sprite.position.copy(p.position);
          if (!sim.source.worldSpace) sprite.position.applyMatrix4(this.head.matrixWorld);
          sprite.scale.setScalar(
            particleScale(p, sim.source) *
              (sim.source.worldSpace
                ? 1
                : new Vector3().setFromMatrixScale(this.head.matrixWorld).x)
          );
        }
      })
    );
    this.glowParent.matrix
      .copy(this.head.matrixWorld)
      .multiply(nifMatrix(this.data.glow.transforms[0]));
    this.glowParent.updateMatrixWorld(true);
    const parentRotation = this.glowParent.getWorldQuaternion(new Quaternion()).invert();
    this.billboard.quaternion
      .copy(parentRotation)
      .multiply(camera.getWorldQuaternion(new Quaternion()));
    this.glow.material.uniforms.opacity.value = evaluateCurve(
      this.data.glow.alphaKeys,
      this.elapsed
    );
    this.glow.material.uniforms.detailUv.value = effectUvMatrix(
      this.data.glow.textures[2].transform,
      [
        evaluateCurve(this.data.glow.scaleUKeys, this.elapsed),
        evaluateCurve(this.data.glow.scaleVKeys, this.elapsed)
      ]
    );
  }
  seek(time: number, camera: Camera) {
    this.simulations.forEach((s) => s.reset());
    this.accumulator = 0;
    this.elapsed = 0;
    // Seek rebuilds particles at the selected pose; it does not invent the
    // body's unobserved movement path between previous frames.
    let remaining = Math.min(30, Math.max(0, time));
    while (remaining > 0) {
      const step = Math.min(0.25, remaining);
      this.update(step, camera);
      remaining -= step;
    }
    this.update(0, camera);
  }
  framingBounds() {
    const box = new Box3();
    // Frame visible sparks. Invisible pool sprites and the broad translucent
    // glow should not make the outfit shrink when the camera is recentered.
    for (const sprites of this.sprites)
      for (const sprite of sprites)
        if (sprite.visible) box.union(new Box3().setFromObject(sprite, true));
    return box;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.root.removeFromParent();
    for (const sprites of this.sprites) for (const s of sprites) s.material.dispose();
    this.glow.geometry.dispose();
    this.glow.material.dispose();
    for (const t of this.textures) t.dispose();
    this.simulations.forEach((s) => s.reset());
    this.root.clear();
  }
}
