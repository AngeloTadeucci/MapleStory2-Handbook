import { PUBLIC_MODELS_URL } from '$env/static/public';

export function getImageUrl(path: string): string {
  return `${PUBLIC_MODELS_URL}${path.replace(/^\//, '')}`;
}
