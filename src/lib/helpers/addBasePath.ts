import { base } from '$app/paths';

/**
 * Constructs a URL by concatenating a base URL with a specific path.
 * @param {string} path The specific path to append to the base URL.
 * @return {string} The constructed URL.
 */
export const url = (path: string): string => {
  return `${base}${path}`;
};
