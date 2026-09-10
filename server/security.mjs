export function contentSecurityPolicy({ cms = false, scriptHashes = [] } = {}) {
  const scriptSources = ["'self'", ...scriptHashes];
  const styleSources = ["'self'"];
  const imageSources = ["'self'", 'data:'];
  const connectSources = ["'self'"];
  const workerSources = ["'self'"];

  // The editor is deliberately isolated at /admin/. Decap currently loads from
  // a pinned CDN URL and injects styles at runtime; the public site needs neither.
  if (cms) {
    scriptSources.push("'unsafe-inline'", 'https://unpkg.com');
    styleSources.push("'unsafe-inline'");
    imageSources.push('https:');
    connectSources.push('https://api.github.com', 'https://api.netlify.com');
    workerSources.push('blob:');
  }

  return [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSources.join(' ')}`,
    `style-src ${styleSources.join(' ')}`,
    `img-src ${imageSources.join(' ')}`,
    "font-src 'self' data:",
    `connect-src ${connectSources.join(' ')}`,
    "media-src 'self'",
    `worker-src ${workerSources.join(' ')}`,
    "manifest-src 'self'",
  ].join('; ');
}

export function requestUsesHttps(request, config) {
  if (request.socket?.encrypted) return true;
  if (!config.trustProxy) return false;
  return String(request.headers['x-forwarded-proto'] ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase() === 'https';
}

export function applySecurityHeaders(request, response, config) {
  response.setHeader('Content-Security-Policy', contentSecurityPolicy());
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  );
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('X-Frame-Options', 'DENY');
  if (requestUsesHttps(request, config)) {
    response.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
}

export function originAllowed(request, config) {
  const fetchSite = String(request.headers['sec-fetch-site'] ?? '').toLowerCase();
  const rawOrigin = request.headers.origin;
  if (!rawOrigin) return fetchSite !== 'cross-site';
  try {
    return config.allowedOrigins.has(new URL(rawOrigin).origin);
  } catch {
    return false;
  }
}

export function applyCors(request, response, config) {
  const rawOrigin = request.headers.origin;
  if (!rawOrigin) return;
  try {
    const origin = new URL(rawOrigin).origin;
    if (!config.allowedOrigins.has(origin)) return;
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  } catch {
    // Invalid origins are rejected by the request handler.
  }
}
