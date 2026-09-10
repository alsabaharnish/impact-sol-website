import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createDeliveryWorker } from '../server/delivery.mjs';
import { openStorage } from '../server/storage.mjs';
import { validateInquiry } from '../server/validation.mjs';

const validInquiry = Object.freeze({
  inquiryType: 'general',
  name: '  Samira Rahman  ',
  email: 'SAMIRA@EXAMPLE.COM',
  message: 'I would like to understand how we might collaborate on a local initiative.',
  subject: 'General question',
  sourcePath: '/contact/',
  privacyNoticeVersion: '2026-09-09',
});

test('validates and normalises the public inquiry contract', () => {
  const result = validateInquiry(validInquiry);
  assert.equal(result.ok, true);
  assert.equal(result.value.name, 'Samira Rahman');
  assert.equal(result.value.email, 'samira@example.com');
  assert.equal(result.value.sourcePath, '/contact/');
});

test('supports all three inquiry routes', () => {
  const routes = [
    validInquiry,
    {
      ...validInquiry,
      inquiryType: 'partnership',
      organization: 'Example Foundation',
      role: 'Programme lead',
      country: 'Bangladesh',
      partnershipInterest: 'A responsible local research collaboration',
    },
    {
      ...validInquiry,
      inquiryType: 'maker',
      initiativeName: 'Example Studio',
      role: 'Recycled-material maker',
      country: 'Bangladesh',
      initiativeStage: 'testing',
      supportNeeded: 'A clearer digital route to suitable customers',
    },
  ];
  for (const route of routes) {
    const result = validateInquiry(route);
    assert.equal(result.ok, true, route.inquiryType);
  }
});

test('requires the route-specific context shown by each public form', () => {
  const general = validateInquiry({ ...validInquiry, subject: '' });
  assert.equal(general.ok, false);
  assert.equal(typeof general.errors.subject, 'string');

  const partnership = validateInquiry({ ...validInquiry, inquiryType: 'partnership' });
  assert.equal(partnership.ok, false);
  assert.deepEqual(
    ['organization', 'role', 'country', 'partnershipInterest'].filter((field) => partnership.errors[field]),
    ['organization', 'role', 'country', 'partnershipInterest'],
  );

  const maker = validateInquiry({ ...validInquiry, inquiryType: 'maker' });
  assert.equal(maker.ok, false);
  assert.deepEqual(
    ['initiativeName', 'role', 'country', 'initiativeStage', 'supportNeeded'].filter(
      (field) => maker.errors[field],
    ),
    ['initiativeName', 'role', 'country', 'initiativeStage', 'supportNeeded'],
  );
});

test('returns field-level validation errors without accepting malformed input', () => {
  const result = validateInquiry({
    inquiryType: 'unknown',
    name: 'x',
    email: 'not-an-email',
    message: 'short',
    websiteUrl: 'javascript:alert(1)',
    sourcePath: 'https://example.com/contact',
  });
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), [
    'email',
    'inquiryType',
    'message',
    'name',
    'sourcePath',
    'websiteUrl',
  ]);
});

test('silently classifies a populated honeypot as spam', () => {
  const result = validateInquiry({ ...validInquiry, companyWebsite: 'https://spam.invalid' });
  assert.equal(result.ok, false);
  assert.equal(result.spam, true);
  assert.deepEqual(result.errors, {});
});

test('stores submissions and both email jobs atomically', () => {
  const storage = openStorage(':memory:');
  try {
    const inquiry = validateInquiry(validInquiry).value;
    const created = storage.createInquiry(inquiry, { now: 1_800_000_000, retentionDays: 30 });
    assert.match(created.inquiryId, /^[0-9a-f-]{36}$/u);
    assert.equal(created.queuedJobs, 2);
    assert.equal(storage.database.prepare('SELECT count(*) AS total FROM inquiries').get().total, 1);
    assert.equal(storage.database.prepare('SELECT count(*) AS total FROM outbox').get().total, 2);
  } finally {
    storage.close();
  }
});

test('persists hash-only rate limits across database reopen', () => {
  const directory = mkdtempSync(join(tmpdir(), 'impact-sol-rate-'));
  const databasePath = join(directory, 'inquiries.sqlite');
  let storage = openStorage(databasePath);
  assert.equal(
    storage.checkAndRecordRateLimit('hashed-address', { now: 100, windowSeconds: 60, maxRequests: 2 }).allowed,
    true,
  );
  storage.close();

  storage = openStorage(databasePath);
  try {
    assert.equal(
      storage.checkAndRecordRateLimit('hashed-address', { now: 101, windowSeconds: 60, maxRequests: 2 }).allowed,
      true,
    );
    const blocked = storage.checkAndRecordRateLimit('hashed-address', {
      now: 102,
      windowSeconds: 60,
      maxRequests: 2,
    });
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.retryAfter, 58);
    const row = storage.database.prepare('SELECT * FROM rate_limits').get();
    assert.equal(row.ip_hash, 'hashed-address');
    assert.equal(Object.hasOwn(row, 'ip_address'), false);
  } finally {
    storage.close();
  }
});

test('exports and deletes records by canonical email with cascading outbox deletion', () => {
  const storage = openStorage(':memory:');
  try {
    storage.createInquiry(validateInquiry(validInquiry).value);
    const records = storage.exportByEmail('SAMIRA@example.com');
    assert.equal(records.length, 1);
    assert.equal(records[0].delivery.length, 2);
    assert.equal(storage.deleteByEmail('samira@example.com'), 1);
    assert.equal(storage.exportByEmail('samira@example.com').length, 0);
    assert.equal(storage.database.prepare('SELECT count(*) AS total FROM outbox').get().total, 0);
  } finally {
    storage.close();
  }
});

test('delivers queued alerts and sends an acknowledgement without echoing the submitted message', async () => {
  const storage = openStorage(':memory:');
  const inquiry = validateInquiry(validInquiry).value;
  storage.createInquiry(inquiry);
  const requests = [];
  const config = {
    resendApiKey: 'test-key',
    fromEmail: 'Impact Sol <forms@example.com>',
    toEmail: 'team@example.com',
    maxDeliveryAttempts: 3,
    deliveryIntervalMs: 60_000,
  };
  const worker = createDeliveryWorker({
    storage,
    config,
    logger: { warn() {} },
    fetchImpl: async (_url, options) => {
      requests.push({ headers: options.headers, body: JSON.parse(options.body) });
      return new Response(JSON.stringify({ id: `provider-${requests.length}` }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });
  try {
    const result = await worker.runOnce();
    assert.equal(result.processed, 2);
    assert.equal(requests.length, 2);
    assert.deepEqual(requests.map((request) => request.body.to[0]), ['team@example.com', 'samira@example.com']);
    assert.match(requests[0].body.text, /local initiative/u);
    assert.doesNotMatch(requests[1].body.text, /local initiative/u);
    assert.match(requests[0].headers['Idempotency-Key'], /^impact-sol-inquiry-/u);
    assert.equal(storage.database.prepare("SELECT count(*) AS total FROM outbox WHERE state = 'delivered'").get().total, 2);
  } finally {
    storage.close();
  }
});

test('returns failed provider deliveries to the durable retry queue', async () => {
  const storage = openStorage(':memory:');
  storage.createInquiry(validateInquiry(validInquiry).value);
  const worker = createDeliveryWorker({
    storage,
    config: {
      resendApiKey: 'test-key',
      fromEmail: 'forms@example.com',
      toEmail: 'team@example.com',
      maxDeliveryAttempts: 3,
      deliveryIntervalMs: 60_000,
    },
    logger: { warn() {} },
    fetchImpl: async () => new Response('', { status: 503 }),
  });
  try {
    await worker.runOnce();
    const states = storage.database
      .prepare('SELECT state, attempts, last_error FROM outbox ORDER BY kind')
      .all()
      .map((row) => ({ ...row }));
    assert.deepEqual(states, [
      { state: 'pending', attempts: 1, last_error: 'provider_http_503' },
      { state: 'pending', attempts: 1, last_error: 'provider_http_503' },
    ]);
  } finally {
    storage.close();
  }
});
