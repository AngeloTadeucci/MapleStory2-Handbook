import type { Handle } from '@sveltejs/kit';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN'
};

function applyHeaders(headers: Headers) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
}

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  try {
    applyHeaders(response.headers);
    return response;
  } catch {
    // Responses from fetch or Response.redirect have immutable headers. Copy into a fresh response.
  }

  try {
    const headers = new Headers(response.headers);
    applyHeaders(headers);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch {
    // Not every response can be rebuilt, for example Response.error. Send it as it is.
    return response;
  }
};
