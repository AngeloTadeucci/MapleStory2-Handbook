import { PUBLIC_MODELS_URL } from '$env/static/public';
import { env } from '$env/dynamic/public';

export function getImageUrl(path: string): string {
  const base = (env.PUBLIC_IMAGES_URL || PUBLIC_MODELS_URL).replace(/\/?$/, '/');
  return `${base}${path.replace(/^\//, '')}`;
}
