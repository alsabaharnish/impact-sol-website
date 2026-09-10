import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createRequestHandler } from '../server/app.mjs';
import { openStorage } from '../server/storage.mjs';

const allowedOrigin = 'https://www.impact-sol.test';
const validPayload = Object.freeze({
  inquiryType: 'partnership',
  name: 'Amina Chowdhury',
  email: 'amina@example.com',
  organization: 'Example Foundation',
  role: 'Programme lead',
  country: 'Bangladesh',
  partnershipInterest: 'A responsible local research collaboration',
  message: 'We would like to discuss a responsible collaboration with your team.',
  sourcePath: '/get-involved/',
  privacyNoticeVersion: '2026-09-09',
});

async function fixture(t, overrides = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'impact-sol-http-'));
  const staticRoot = join(directory, 'dist');
  await mkdir(join(staticRoot, 'about'), { recursive: true });
  await mkdir(join(staticRoot, 'admin'), { recursive: true });
  await writeFile(
    join(staticRoot, 'index.html'),
    '<h1>Impact Sol</h1><script type="application/ld+json">{"name":"Impact Sol"}</script>',
  );
  await writeFile(join(staticRoot, 'about', 'index.html'), '<h1>About</h1>');
  await writeFile(
    join(staticRoot, 'admin', 'index.html'),
    '<h1>Editor</h1><script src="https://unpkg.com/decap-cms@3.16.1/dist/decap-cms.js"></script>',
  );
  await writeFile(join(staticRoot, '404.html'), '<h1>Not found</h1>');
  await writeFile(join(staticRoot, '500.html'), '<h1>Server error</h1>');
  const storage = openStorage(':memory:');
  const config = {
    staticRoot,
    allowedOrigins: new Set([allowedOrigin]),
    trustProxy: false,
    maintenanceMode: false,
    maxBodyBytes: 32 * 1024,
    rateLimitWindowSeconds: 15 * 60,
    rateLimitMax: 20,
    ipHashSecret: 'a-secure-test-secret-that-is-long-enough',
    retentionDays: 90,
    ...overrides,
  };
  const deliveryWorker = { runOnce: async () => ({ processed: 0 }) };
  const handler = createRequestHandler({
    config,
    storage,
    deliveryWorker,
    logger: { info() {}, error() {} },
  });
  const server = createServer((request, response) => void handler(request, response));
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  t.after(async () => {
    await new Promise((resolveClose) => server.close(resolveClose));
    storage.close();
  });
  return { baseUrl, storage };
}

function submit(baseUrl, payload, options = {}) {
  return fetch(`${baseUrl}/api/inquiries`, {
    method: 'POST',
    headers: {
      Origin: allowedOrigin,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  });
}

test('accepts a valid inquiry and persists it before returning', async (t) => {
  const { baseUrl, storage } = await fixture(t);
  const response = await submit(baseUrl, validPayload);
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), {
    ok: true,
    message: 'Thank you. Your inquiry has been received.',
  });
  assert.equal(storage.exportByEmail(validPayload.email).length, 1);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('x-request-id'), /^[0-9a-f-]{36}$/u);
});

test('supports progressively enhanced URL-encoded forms', async (t) => {
  const { baseUrl, storage } = await fixture(t);
  const body = new URLSearchParams({
    ...validPayload,
    inquiryType: 'maker',
    initiativeName: 'Example Studio',
    role: 'Recycled-material maker',
    initiativeStage: 'testing',
    supportNeeded: 'A clearer digital route to suitable customers',
  });
  const response = await fetch(`${baseUrl}/api/inquiries`, {
    method: 'POST',
    headers: {
      Origin: allowedOrigin,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  assert.equal(response.status, 202);
  assert.equal(storage.exportByEmail(validPayload.email)[0].inquiry_type, 'maker');
});

test('rejects unapproved browser origins before reading or storing the form', async (t) => {
  const { baseUrl, storage } = await fixture(t);
  const response = await submit(baseUrl, validPayload, { headers: { Origin: 'https://attacker.invalid' } });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'REQUEST_REJECTED');
  assert.equal(storage.exportByEmail(validPayload.email).length, 0);
});

test('returns accessible field errors for invalid input without requiring a consent checkbox', async (t) => {
  const { baseUrl } = await fixture(t);
  const response = await submit(baseUrl, { ...validPayload, email: 'bad' });
  assert.equal(response.status, 422);
  const body = await response.json();
  assert.equal(body.code, 'VALIDATION_FAILED');
  assert.equal(typeof body.errors.email, 'string');
  assert.equal(Object.hasOwn(body.errors, 'privacyConsent'), false);
});

test('returns a generic success for honeypot traffic without storing it', async (t) => {
  const { baseUrl, storage } = await fixture(t);
  const response = await submit(baseUrl, { ...validPayload, companyWebsite: 'spam value' });
  assert.equal(response.status, 202);
  assert.equal((await response.json()).ok, true);
  assert.equal(storage.exportByEmail(validPayload.email).length, 0);
});

test('enforces the 32 KiB body ceiling', async (t) => {
  const { baseUrl } = await fixture(t);
  const response = await submit(baseUrl, 'x'.repeat(32 * 1024 + 1));
  assert.equal(response.status, 413);
  assert.equal((await response.json()).code, 'BODY_TOO_LARGE');
});

test('persists and enforces the per-address rate limit', async (t) => {
  const { baseUrl } = await fixture(t, { rateLimitMax: 1 });
  assert.equal((await submit(baseUrl, validPayload)).status, 202);
  const response = await submit(baseUrl, { ...validPayload, email: 'another@example.com' });
  assert.equal(response.status, 429);
  assert.equal((await response.json()).code, 'TOO_MANY_REQUESTS');
  assert.ok(Number(response.headers.get('retry-after')) > 0);
});

test('serves static output with hardened headers, canonical slash redirects, and a custom 404', async (t) => {
  const { baseUrl } = await fixture(t);
  const home = await fetch(baseUrl);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Impact Sol/u);
  assert.match(home.headers.get('content-security-policy'), /object-src 'none'/u);
  assert.match(home.headers.get('content-security-policy'), /base-uri 'none'/u);
  assert.match(home.headers.get('content-security-policy'), /frame-ancestors 'none'/u);
  assert.match(home.headers.get('content-security-policy'), /'sha256-[A-Za-z0-9+/=]+'/u);
  assert.doesNotMatch(home.headers.get('content-security-policy'), /unsafe-inline/u);
  assert.doesNotMatch(home.headers.get('content-security-policy'), /unpkg\.com/u);
  assert.equal(home.headers.get('x-content-type-options'), 'nosniff');

  const admin = await fetch(`${baseUrl}/admin/`);
  assert.equal(admin.status, 200);
  assert.match(admin.headers.get('content-security-policy'), /unsafe-inline/u);
  assert.match(admin.headers.get('content-security-policy'), /https:\/\/unpkg\.com/u);

  const redirect = await fetch(`${baseUrl}/about`, { redirect: 'manual' });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), '/about/');

  const missing = await fetch(`${baseUrl}/does-not-exist`);
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /Not found/u);
});
