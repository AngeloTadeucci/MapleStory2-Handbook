import { z } from 'zod';

export interface Background {
  /** Saved in outfit codes. Client `bg_X` textures use `X`, so codes made before this table still parse. */
  id: string;
  /** Texture stem under `backgrounds/bg/` and `backgrounds/thumbs/` at the library base. */
  file: string;
  region: string;
  label: string;
}

// Every texture in the client's Resource/Image.m2d bg/ folder. `_ch` textures are
// 1024x640 instead of 990x1024, so they are labelled Wide. The client names
// `bg_fairy tale` with a space; it is published as `bg_fairy_tale`.
const table: [id: string, region: string, label: string][] = [
  ['blue', 'Solid colors', 'Blue'],
  ['gray', 'Solid colors', 'Gray'],
  ['green', 'Solid colors', 'Green'],
  ['red', 'Solid colors', 'Red'],
  ['cave_a', 'Cave', 'A'],
  ['cave_b', 'Cave', 'B'],
  ['cave_c', 'Cave', 'C'],
  ['cave_d', 'Cave', 'D'],
  ['ellinia_a', 'Ellinia', 'A'],
  ['ellinia_b', 'Ellinia', 'B'],
  ['ellinia_ch', 'Ellinia', 'Wide'],
  ['halloween_ch', 'Events', 'Halloween'],
  ['halloween_b_ch', 'Events', 'Halloween B'],
  ['spring2018_ch', 'Events', 'Spring 2018'],
  ['spring2019_ch', 'Events', 'Spring 2019'],
  ['winter_ch', 'Events', 'Winter'],
  ['wedding_a', 'Events', 'Wedding'],
  ['mushking_ch_a', 'Events', 'Mushking'],
  ['henesys_a', 'Henesys', 'A'],
  ['henesys_b', 'Henesys', 'B'],
  ['henesys_c', 'Henesys', 'C'],
  ['henesys_d', 'Henesys', 'D'],
  ['henesys_jp', 'Henesys', 'Japan'],
  ['henesys_ch', 'Henesys', 'Wide'],
  ['iceage_a', 'Ice Age', 'A'],
  ['iceage_b', 'Ice Age', 'B'],
  ['iceage_c', 'Ice Age', 'C'],
  ['jungle_a', 'Jungle', 'A'],
  ['jungle_b', 'Jungle', 'B'],
  ['jungle_c', 'Jungle', 'C'],
  ['kerningcity_a', 'Kerning City', 'A'],
  ['kerningcity_b', 'Kerning City', 'B'],
  ['kerningcity_c', 'Kerning City', 'C'],
  ['kerningcity_ch', 'Kerning City', 'Wide'],
  ['kritias_a', 'Kritias', 'A'],
  ['kritias_b', 'Kritias', 'B'],
  ['kritias_c', 'Kritias', 'C'],
  ['kritias_d', 'Kritias', 'D'],
  ['kritias_e', 'Kritias', 'E'],
  ['kritias_f', 'Kritias', 'F'],
  ['kritias_g', 'Kritias', 'G'],
  ['kritias_h', 'Kritias', 'H'],
  ['kritias_i', 'Kritias', 'I'],
  ['kritias_ch', 'Kritias', 'Wide'],
  ['kritias_ruin_a', 'Kritias', 'Ruin A'],
  ['kritias_ruin_b', 'Kritias', 'Ruin B'],
  ['kritias_ruin_c', 'Kritias', 'Ruin C'],
  ['lapenta_a', 'Lapenta', 'A'],
  ['blacklapenta_a', 'Lapenta', 'Black'],
  ['bluelapenta_a', 'Lapenta', 'Blue'],
  ['greenlapenta_a', 'Lapenta', 'Green'],
  ['redlapenta_a', 'Lapenta', 'Red A'],
  ['redlapenta_b', 'Lapenta', 'Red B'],
  ['lith_a', 'Lith Harbor', 'A'],
  ['lith_b', 'Lith Harbor', 'B'],
  ['lith_c', 'Lith Harbor', 'C'],
  ['lith_d', 'Lith Harbor', 'D'],
  ['lith_e', 'Lith Harbor', 'E'],
  ['lith_f', 'Lith Harbor', 'F'],
  ['lith_night', 'Lith Harbor', 'Night'],
  ['lith_ch', 'Lith Harbor', 'Wide sky'],
  ['lith_ch_a', 'Lith Harbor', 'Wide underwater'],
  ['rudelhi', 'Ludari', 'A'],
  ['rudelhi_b', 'Ludari', 'B'],
  ['rudelhi_c', 'Ludari', 'C'],
  ['rudelhi_ch', 'Ludari', 'Wide'],
  ['rudi', 'Ludibrium', 'A'],
  ['rudi_b', 'Ludibrium', 'B'],
  ['rudi_c', 'Ludibrium', 'C'],
  ['rudi_ch_a', 'Ludibrium', 'Wide'],
  ['massive', 'Massive', 'A'],
  ['massive_b', 'Massive', 'B'],
  ['minar', 'Minar', 'A'],
  ['minar_b', 'Minar', 'B'],
  ['orient_a', 'Orient', 'A'],
  ['orient_b', 'Orient', 'B'],
  ['orient_c', 'Orient', 'C'],
  ['orient_ch', 'Orient', 'Wide A'],
  ['orient_b_ch', 'Orient', 'Wide B'],
  ['orient_c_ch', 'Orient', 'Wide C'],
  ['orient_d_ch', 'Orient', 'Wide D'],
  ['perion_a', 'Perion', 'A'],
  ['perion_b', 'Perion', 'B'],
  ['perion_c', 'Perion', 'C'],
  ['perion_d', 'Perion', 'D'],
  ['perion_ch', 'Perion', 'Wide'],
  ['pirates_a', 'Pirates', 'A'],
  ['pirates_b', 'Pirates', 'B'],
  ['sf_a', 'SF', 'A'],
  ['sf_b', 'SF', 'B'],
  ['sf_c', 'SF', 'C'],
  ['sf_d', 'SF', 'D'],
  ['sf_e', 'SF', 'E'],
  ['sf_ch', 'SF', 'Wide'],
  ['sky_a', 'Sky', 'A'],
  ['sky_b', 'Sky', 'B'],
  ['tria', 'Tria', 'A'],
  ['tria_b', 'Tria', 'B'],
  ['tria_c', 'Tria', 'C'],
  ['tria_ch', 'Tria', 'Wide'],
  ['turka_a', 'Turka', 'A'],
  ['turka_b', 'Turka', 'B'],
  ['turka_c', 'Turka', 'C'],
  ['turka_d', 'Turka', 'D'],
  ['calive_ch', 'Other', 'Calive'],
  ['dream', 'Other', 'Dream'],
  ['fairy_tale', 'Other', 'Fairy Tale'],
  ['heaven_a', 'Other', 'Heaven'],
  ['indoor_a', 'Other', 'Indoor'],
  ['lava_test', 'Other', 'Lava'],
  ['sw_bg_dark_a', 'Shadow World', 'Dark A'],
  ['sw_bg_dark_b', 'Shadow World', 'Dark B'],
  ['sw_bg_dark_c', 'Shadow World', 'Dark C'],
  ['sw_bg_dark_d', 'Shadow World', 'Dark D'],
  ['sw_bg_dark_ch', 'Shadow World', 'Dark Wide'],
  ['sw_bg_ellinia_a', 'Shadow World', 'Ellinia'],
  ['sw_bg_fairytale', 'Shadow World', 'Fairy Tale'],
  ['sw_bg_henesys_a', 'Shadow World', 'Henesys A'],
  ['sw_bg_henesys_b', 'Shadow World', 'Henesys B'],
  ['sw_bg_iceage_a', 'Shadow World', 'Ice Age A'],
  ['sw_bg_iceage_b', 'Shadow World', 'Ice Age B'],
  ['sw_bg_iceage_c', 'Shadow World', 'Ice Age C'],
  ['sw_bg_kerningcity_a', 'Shadow World', 'Kerning City'],
  ['sw_bg_lith_a', 'Shadow World', 'Lith Harbor A'],
  ['sw_bg_lith_b', 'Shadow World', 'Lith Harbor B'],
  ['sw_bg_massive_a', 'Shadow World', 'Massive'],
  ['sw_bg_perion_a', 'Shadow World', 'Perion'],
  ['sw_bg_rudi_a', 'Shadow World', 'Ludibrium A'],
  ['sw_bg_rudi_b', 'Shadow World', 'Ludibrium B'],
  ['sw_bg_sf_a', 'Shadow World', 'SF A'],
  ['sw_bg_sf_b', 'Shadow World', 'SF B']
];

export const backgrounds: Background[] = table.map(([id, region, label]) => ({
  id,
  file: id.startsWith('sw_bg_') ? id : `bg_${id}`,
  region,
  label
}));
const byId = new Map(backgrounds.map((entry) => [entry.id, entry]));
/** Regions in table order, each with its backgrounds in table order. */
export const backgroundGroups: [region: string, entries: Background[]][] = [
  ...new Set(backgrounds.map((entry) => entry.region))
].map((region) => [region, backgrounds.filter((entry) => entry.region === region)]);

export function findBackground(id: string): Background | undefined {
  return byId.get(id);
}
/** The empty id is the studio backdrop. */
export const backgroundIdSchema = z
  .string()
  .max(40)
  .refine((id) => id === '' || byId.has(id), 'Unknown background');

export function backgroundUrl(base: string, id: string): string | null {
  if (!id) return null;
  const entry = byId.get(id);
  if (!entry) throw new Error(`Unknown background ${id}`);
  return `${base}backgrounds/bg/${entry.file}.png`;
}
export function backgroundThumbnailUrl(base: string, entry: Background): string {
  return `${base}backgrounds/thumbs/${entry.file}.webp`;
}
export function backgroundName(id: string): string {
  const entry = byId.get(id);
  if (!entry) return 'Studio';
  return ['Solid colors', 'Events', 'Other'].includes(entry.region)
    ? entry.label
    : `${entry.region} ${entry.label}`;
}
