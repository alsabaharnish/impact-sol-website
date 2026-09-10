import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import {
  applyCors,
  applySecurityHeaders,
  contentSecurityPolicy,
  originAllowed,
} from './security.mjs';
import { validateInquiry } from './validation.mjs';

const MIME_TYPES = Object.freeze({
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
});

class RequestBodyError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function json(response, status, payload, headers = {}) {
  const body = Buffer.from(JSON.stringify(payload));
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    ...headers,
  });
  response.end(body);
}

function publicError(response, status, message, code, errors) {
  json(response, status, {
    ok: false,
    message,
    code,
    ...(errors ? { errors } : {}),
  });
}

function readRequestBody(request, maxBytes) {
  return new Promise((resolveBody, rejectBody) => {
    const declaredLength = request.headers['content-length'];
    if (declaredLength !== undefined) {
      const length = Number(declaredLength);
      if (!Number.isSafeInteger(length) || length < 0) {
        rejectBody(new RequestBodyError(400, 'INVALID_CONTENT_LENGTH'));
        request.resume();
        return;
      }
      if (length > maxBytes) {
        rejectBody(new RequestBodyError(413, 'BODY_TOO_LARGE'));
        request.resume();
        return;
      }
    }

    const chunks = [];
    let total = 0;
    let settled = false;
    request.on('data', (chunk) => {
      if (settled) return;
      total += chunk.length;
      if (total > maxBytes) {
        settled = true;
        chunks.length = 0;
        rejectBody(new RequestBodyError(413, 'BODY_TOO_LARGE'));
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (settled) return;
      settled = true;
      resolveBody(Buffer.concat(chunks, total).toString('utf8'));
    });
    request.on('aborted', () => {
      if (settled) return;
      settled = true;
      rejectBody(new RequestBodyError(400, 'REQUEST_ABORTED'));
    });
    request.on('error', () => {
      if (settled) return;
      settled = true;
      rejectBody(new RequestBodyError(400, 'REQUEST_READ_ERROR'));
    });
  });
}

async function parseBody(request, maxBytes) {
  const encoding = String(request.headers['content-encoding'] ?? 'identity').toLowerCase();
  if (encoding !== 'identity') throw new RequestBodyError(415, 'UNSUPPORTED_CONTENT_ENCODING');

  const mediaType = String(request.headers['content-type'] ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (!['application/json', 'application/x-www-form-urlencoded'].includes(mediaType)) {
    throw new RequestBodyError(415, 'UNSUPPORTED_MEDIA_TYPE');
  }

  const raw = await readRequestBody(request, maxBytes);
  if (!raw) throw new RequestBodyError(400, 'EMPTY_BODY');
  try {
    if (mediaType === 'application/json') return JSON.parse(raw);
    return Object.fromEntries(new URLSearchParams(raw));
  } catch {
    throw new RequestBodyError(400, 'INVALID_BODY');
  }
}

function clientAddress(request, config) {
  if (config.trustProxy) {
    const forwarded = String(request.headers['x-forwarded-for'] ?? '')
      .split(',')[0]
      .trim();
    if (forwarded && forwarded.length <= 128) return forwarded;
  }
  return request.socket.remoteAddress ?? 'unknown';
}

function hashClientAddress(request, config) {
  return createHmac('sha256', config.ipHashSecret).update(clientAddress(request, config)).digest('hex');
}

function safePathname(rawUrl) {
  try {
    const pathname = decodeURIComponent(new URL(rawUrl, 'http://internal.invalid').pathname);
    if (pathname.includes('\0') || pathname.includes('\\')) return null;
    return pathname;
  } catch {
    return null;
  }
}

function insideRoot(root, candidate) {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot === '' || (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== '..' && !isAbsolute(pathFromRoot));
}

async function regularFile(path) {
  try {
    const details = await stat(path);
    return details.isFile() ? details : null;
  } catch {
    return null;
  }
}

function inlineScriptHashes(html) {
  return [...html.matchAll(/<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/giu)]
    .map((match) => `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`);
}

async function sendFile(request, response, config, path, status = 200, extraHeaders = {}) {
  const body = await readFile(path);
  const extension = extname(path).toLowerCase();
  const isHtml = extension === '.html';
  const isImmutableAsset = path.includes(`${sep}_astro${sep}`);
  if (isHtml) {
    const html = body.toString('utf8');
    const pathname = safePathname(request.url);
    response.setHeader(
      'Content-Security-Policy',
      contentSecurityPolicy({
        cms: pathname === '/admin/' || pathname === '/admin/index.html',
        scriptHashes: inlineScriptHashes(html),
      }),
    );
  }
  response.writeHead(status, {
    'Content-Type': MIME_TYPES[extension] ?? 'application/octet-stream',
    'Content-Length': body.length,
    'Cache-Control': isHtml ? 'no-cache' : isImmutableAsset ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
    ...extraHeaders,
  });
  response.end(request.method === 'HEAD' ? undefined : body);
}

async function sendFallbackPage(request, response, config, name, statusCode, fallbackText) {
  const options = [resolve(config.staticRoot, name, 'index.html'), resolve(config.staticRoot, `${name}.html`)];
  for (const option of options) {
    if (await regularFile(option)) {
      await sendFile(request, response, config, option, statusCode, { 'Cache-Control': 'no-store' });
      return;
    }
  }
  const body = Buffer.from(`<!doctype html><html lang="en"><meta charset="utf-8"><title>${statusCode}</title><body><main><h1>${fallbackText}</h1></main></body></html>`);
  response.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
  });
  response.end(request.method === 'HEAD' ? undefined : body);
}

async function serveStatic(request, response, config) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD');
    await sendFallbackPage(request, response, config, '404', 405, 'Method not allowed');
    return;
  }

  const pathname = safePathname(request.url);
  if (!pathname) {
    await sendFallbackPage(request, response, config, '404', 400, 'Bad request');
    return;
  }
  const candidate = resolve(config.staticRoot, `.${pathname}`);
  if (!insideRoot(config.staticRoot, candidate)) {
    await sendFallbackPage(request, response, config, '404', 404, 'Page not found');
    return;
  }

  const search = new URL(request.url, 'http://internal.invalid').search;
  const options = pathname.endsWith('/')
    ? [resolve(candidate, 'index.html')]
    : extname(pathname)
      ? [candidate]
      : [resolve(candidate, 'index.html'), `${candidate}.html`];

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (!(await regularFile(option))) continue;
    if (!pathname.endsWith('/') && index === 0 && option.endsWith(`${sep}index.html`)) {
      response.writeHead(308, { Location: `${pathname}/${search}` });
      response.end();
      return;
    }
    await sendFile(request, response, config, option);
    return;
  }

  await sendFallbackPage(request, response, config, '404', 404, 'Page not found');
}

export function createRequestHandler({ config, storage, deliveryWorker, logger = console }) {
  return async function requestHandler(request, response) {
    const requestId = randomUUID();
    response.setHeader('X-Request-Id', requestId);
    applySecurityHeaders(request, response, config);
    applyCors(request, response, config);

    try {
      const pathname = safePathname(request.url);
      if (pathname === '/healthz') {
        json(response, 200, { status: 'ok' });
        return;
      }

      if (config.maintenanceMode) {
        response.setHeader('Retry-After', '3600');
        await sendFallbackPage(request, response, config, 'maintenance', 503, 'Temporarily unavailable');
        return;
      }

      if (pathname === '/api/inquiries') {
        if (request.method === 'OPTIONS') {
          if (!originAllowed(request, config)) {
            publicError(response, 403, 'This request could not be accepted.', 'REQUEST_REJECTED');
            return;
          }
          response.writeHead(204, {
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '600',
            'Cache-Control': 'no-store',
          });
          response.end();
          return;
        }
        if (request.method !== 'POST') {
          response.setHeader('Allow', 'POST, OPTIONS');
          publicError(response, 405, 'This request method is not supported.', 'METHOD_NOT_ALLOWED');
          return;
        }
        if (!originAllowed(request, config)) {
          publicError(response, 403, 'This request could not be accepted.', 'REQUEST_REJECTED');
          return;
        }

        const rate = storage.checkAndRecordRateLimit(hashClientAddress(request, config), {
          windowSeconds: config.rateLimitWindowSeconds,
          maxRequests: config.rateLimitMax,
        });
        if (!rate.allowed) {
          response.setHeader('Retry-After', String(rate.retryAfter));
          publicError(
            response,
            429,
            'Too many requests. Please wait before trying again.',
            'TOO_MANY_REQUESTS',
          );
          return;
        }

        let body;
        try {
          body = await parseBody(request, config.maxBodyBytes);
        } catch (error) {
          if (error instanceof RequestBodyError) {
            const message = error.status === 413
              ? 'The submitted form is too large.'
              : error.status === 415
                ? 'Submit the form using a supported format.'
                : 'The submitted form could not be read.';
            publicError(response, error.status, message, error.code);
            return;
          }
          throw error;
        }

        const result = validateInquiry(body);
        if (result.spam) {
          json(response, 202, {
            ok: true,
            message: 'Thank you. Your inquiry has been received.',
          });
          return;
        }
        if (!result.ok) {
          publicError(
            response,
            422,
            'Please check the highlighted fields and try again.',
            'VALIDATION_FAILED',
            result.errors,
          );
          return;
        }

        const stored = storage.createInquiry(result.value, { retentionDays: config.retentionDays });
        queueMicrotask(() => void deliveryWorker.runOnce());
        logger.info?.('Inquiry accepted.', {
          requestId,
          inquiryId: stored.inquiryId,
          inquiryType: result.value.inquiryType,
        });
        json(response, 202, {
          ok: true,
          message: 'Thank you. Your inquiry has been received.',
        });
        return;
      }

      if (pathname?.startsWith('/api/')) {
        publicError(response, 404, 'The requested endpoint was not found.', 'NOT_FOUND');
        return;
      }

      await serveStatic(request, response, config);
    } catch (error) {
      logger.error?.('Request failed.', {
        requestId,
        error: error?.name ?? 'Error',
      });
      if (!response.headersSent) {
        await sendFallbackPage(request, response, config, '500', 500, 'Something went wrong');
      } else {
        response.destroy();
      }
    }
  };
}
