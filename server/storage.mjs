import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const OPTIONAL_COLUMNS = Object.freeze([
  'organization',
  'role',
  'phone',
  'country',
  'subject',
  'partnershipInterest',
  'initiativeName',
  'initiativeStage',
  'supportNeeded',
  'websiteUrl',
  'sourcePath',
]);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function labelFor(field) {
  return field.replace(/([A-Z])/gu, ' $1').replace(/^./u, (character) => character.toUpperCase());
}

function buildInternalMessage(inquiry) {
  const details = [
    ['Inquiry type', inquiry.inquiryType],
    ['Name', inquiry.name],
    ['Email', inquiry.email],
    ...OPTIONAL_COLUMNS.filter((field) => inquiry[field]).map((field) => [labelFor(field), inquiry[field]]),
    ['Message', inquiry.message],
  ];
  const text = details.map(([label, value]) => `${label}: ${value}`).join('\n\n');
  const html = details
    .map(([label, value]) => `<p><strong>${escapeHtml(label)}</strong><br>${escapeHtml(value).replaceAll('\n', '<br>')}</p>`)
    .join('');
  return {
    subject: `[Impact Sol] New ${inquiry.inquiryType} inquiry`,
    text,
    html: `<h1>New website inquiry</h1>${html}`,
  };
}

function buildAcknowledgement() {
  const text = [
    'Thank you for contacting Impact Sol.',
    '',
    'We received your inquiry. Our team will review it and reply if a response is appropriate.',
    '',
    'This acknowledgement does not confirm a partnership, programme place, or service commitment.',
  ].join('\n');
  return {
    subject: 'We received your Impact Sol inquiry',
    text,
    html:
      '<p>Thank you for contacting Impact Sol.</p>' +
      '<p>We received your inquiry. Our team will review it and reply if a response is appropriate.</p>' +
      '<p>This acknowledgement does not confirm a partnership, programme place, or service commitment.</p>',
  };
}

function runTransaction(database, work) {
  database.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    database.exec('COMMIT');
    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export function openStorage(databasePath) {
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true, mode: 0o700 });

  const database = new DatabaseSync(databasePath, {
    enableForeignKeyConstraints: true,
  });
  database.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;
    PRAGMA secure_delete = ON;
  `);
  if (databasePath !== ':memory:') database.exec('PRAGMA journal_mode = WAL;');

  database.exec(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('general', 'partnership', 'maker')),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      organization TEXT,
      role TEXT,
      phone TEXT,
      country TEXT,
      subject TEXT,
      partnership_interest TEXT,
      initiative_name TEXT,
      initiative_stage TEXT,
      support_needed TEXT,
      website_url TEXT,
      source_path TEXT,
      privacy_notice_version TEXT,
      message TEXT NOT NULL,
      received_at INTEGER NOT NULL
    ) STRICT;

    CREATE INDEX IF NOT EXISTS inquiries_email_index ON inquiries(email);
    CREATE INDEX IF NOT EXISTS inquiries_expiry_index ON inquiries(expires_at);

    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      inquiry_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('internal', 'acknowledgement')),
      recipient TEXT,
      subject TEXT NOT NULL,
      text_body TEXT NOT NULL,
      html_body TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'processing', 'delivered', 'failed')),
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      last_attempt_at INTEGER,
      delivered_at INTEGER,
      provider_id TEXT,
      last_error TEXT,
      FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE
    ) STRICT;

    CREATE INDEX IF NOT EXISTS outbox_due_index ON outbox(state, next_attempt_at);

    CREATE TABLE IF NOT EXISTS rate_limits (
      ip_hash TEXT PRIMARY KEY,
      window_started_at INTEGER NOT NULL,
      request_count INTEGER NOT NULL,
      blocked_until INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    ) STRICT;
  `);

  // A terminated process can leave claimed jobs behind. Resend idempotency keys make
  // replay safe if the provider accepted the message before the crash.
  database.prepare("UPDATE outbox SET state = 'pending' WHERE state = 'processing'").run();

  const insertInquiry = database.prepare(`
    INSERT INTO inquiries (
      id, created_at, expires_at, inquiry_type, name, email, organization, role,
      phone, country, subject, partnership_interest, initiative_name,
      initiative_stage, support_needed, website_url, source_path,
      privacy_notice_version, message, received_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertOutbox = database.prepare(`
    INSERT INTO outbox (
      id, inquiry_id, kind, recipient, subject, text_body, html_body,
      state, attempts, next_attempt_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)
  `);
  const selectRateLimit = database.prepare('SELECT * FROM rate_limits WHERE ip_hash = ?');
  const insertRateLimit = database.prepare(`
    INSERT INTO rate_limits (ip_hash, window_started_at, request_count, blocked_until, updated_at)
    VALUES (?, ?, 1, 0, ?)
  `);
  const updateRateLimit = database.prepare(`
    UPDATE rate_limits
    SET window_started_at = ?, request_count = ?, blocked_until = ?, updated_at = ?
    WHERE ip_hash = ?
  `);

  function createInquiry(inquiry, { now = Math.floor(Date.now() / 1000), retentionDays = 90 } = {}) {
    return runTransaction(database, () => {
      const inquiryId = randomUUID();
      const expiry = now + retentionDays * 24 * 60 * 60;
      insertInquiry.run(
        inquiryId,
        now,
        expiry,
        inquiry.inquiryType,
        inquiry.name,
        inquiry.email,
        inquiry.organization ?? null,
        inquiry.role ?? null,
        inquiry.phone ?? null,
        inquiry.country ?? null,
        inquiry.subject ?? null,
        inquiry.partnershipInterest ?? null,
        inquiry.initiativeName ?? null,
        inquiry.initiativeStage ?? null,
        inquiry.supportNeeded ?? null,
        inquiry.websiteUrl ?? null,
        inquiry.sourcePath ?? null,
        inquiry.privacyNoticeVersion ?? null,
        inquiry.message,
        now,
      );

      const internal = buildInternalMessage(inquiry);
      const acknowledgement = buildAcknowledgement();
      const jobs = [
        {
          id: randomUUID(),
          kind: 'internal',
          recipient: null,
          ...internal,
        },
        {
          id: randomUUID(),
          kind: 'acknowledgement',
          recipient: inquiry.email,
          ...acknowledgement,
        },
      ];
      for (const job of jobs) {
        insertOutbox.run(
          job.id,
          inquiryId,
          job.kind,
          job.recipient,
          job.subject,
          job.text,
          job.html,
          now,
          now,
        );
      }
      return { inquiryId, queuedJobs: jobs.length };
    });
  }

  function checkAndRecordRateLimit(ipHash, { now = Math.floor(Date.now() / 1000), windowSeconds, maxRequests }) {
    return runTransaction(database, () => {
      const current = selectRateLimit.get(ipHash);
      if (!current) {
        insertRateLimit.run(ipHash, now, now);
        return { allowed: true, remaining: Math.max(0, maxRequests - 1), retryAfter: 0 };
      }

      const windowExpired = now >= current.window_started_at + windowSeconds;
      if (windowExpired) {
        updateRateLimit.run(now, 1, 0, now, ipHash);
        return { allowed: true, remaining: Math.max(0, maxRequests - 1), retryAfter: 0 };
      }

      const requestCount = current.request_count + 1;
      const allowed = current.blocked_until <= now && requestCount <= maxRequests;
      const blockedUntil = allowed ? 0 : Math.max(current.blocked_until, current.window_started_at + windowSeconds);
      updateRateLimit.run(current.window_started_at, requestCount, blockedUntil, now, ipHash);
      return {
        allowed,
        remaining: Math.max(0, maxRequests - requestCount),
        retryAfter: allowed ? 0 : Math.max(1, blockedUntil - now),
      };
    });
  }

  function claimDueJobs({ now = Math.floor(Date.now() / 1000), limit = 10, maxAttempts = 8 } = {}) {
    return runTransaction(database, () => {
      const jobs = database
        .prepare(`
          SELECT id, inquiry_id, kind, recipient, subject, text_body, html_body, attempts
          FROM outbox
          WHERE state = 'pending' AND next_attempt_at <= ? AND attempts < ?
          ORDER BY created_at ASC
          LIMIT ?
        `)
        .all(now, maxAttempts, limit);
      const claim = database.prepare(`
        UPDATE outbox
        SET state = 'processing', attempts = attempts + 1, last_attempt_at = ?, last_error = NULL
        WHERE id = ? AND state = 'pending'
      `);
      const claimed = [];
      for (const job of jobs) {
        const result = claim.run(now, job.id);
        if (result.changes === 1) claimed.push({ ...job, attempts: job.attempts + 1 });
      }
      return claimed;
    });
  }

  const completeJobStatement = database.prepare(`
    UPDATE outbox
    SET state = 'delivered', delivered_at = ?, provider_id = ?, last_error = NULL
    WHERE id = ? AND state = 'processing'
  `);
  function completeJob(id, providerId, now = Math.floor(Date.now() / 1000)) {
    completeJobStatement.run(now, providerId ?? null, id);
  }

  const failJobStatement = database.prepare(`
    UPDATE outbox
    SET state = ?, next_attempt_at = ?, last_error = ?
    WHERE id = ? AND state = 'processing'
  `);
  function failJob(job, errorCode, { now = Math.floor(Date.now() / 1000), maxAttempts = 8 } = {}) {
    const exhausted = job.attempts >= maxAttempts;
    const delay = Math.min(6 * 60 * 60, 30 * 2 ** Math.max(0, job.attempts - 1));
    failJobStatement.run(exhausted ? 'failed' : 'pending', now + delay, String(errorCode).slice(0, 160), job.id);
  }

  function releaseJob(id) {
    database.prepare("UPDATE outbox SET state = 'pending' WHERE id = ? AND state = 'processing'").run(id);
  }

  function cleanup({ now = Math.floor(Date.now() / 1000), rateLimitMaxAgeSeconds = 2 * 24 * 60 * 60 } = {}) {
    return runTransaction(database, () => {
      const inquiryResult = database.prepare('DELETE FROM inquiries WHERE expires_at <= ?').run(now);
      const rateResult = database.prepare('DELETE FROM rate_limits WHERE updated_at <= ?').run(now - rateLimitMaxAgeSeconds);
      return { inquiriesDeleted: Number(inquiryResult.changes), rateLimitsDeleted: Number(rateResult.changes) };
    });
  }

  function exportByEmail(email) {
    const records = database
      .prepare(`
        SELECT
          id, created_at, expires_at, inquiry_type, name, email, organization, role,
          phone, country, subject, partnership_interest, initiative_name,
          initiative_stage, support_needed, website_url, source_path,
          privacy_notice_version, message, received_at
        FROM inquiries
        WHERE email = ? COLLATE NOCASE
        ORDER BY created_at ASC
      `)
      .all(email);
    const deliveryState = database.prepare(`
      SELECT kind, state, attempts, delivered_at
      FROM outbox
      WHERE inquiry_id = ?
      ORDER BY created_at ASC
    `);
    return records.map((record) => ({ ...record, delivery: deliveryState.all(record.id) }));
  }

  function deleteByEmail(email) {
    return runTransaction(database, () => {
      const count = database.prepare('SELECT count(*) AS count FROM inquiries WHERE email = ? COLLATE NOCASE').get(email);
      database.prepare('DELETE FROM inquiries WHERE email = ? COLLATE NOCASE').run(email);
      return Number(count.count);
    });
  }

  return Object.freeze({
    database,
    createInquiry,
    checkAndRecordRateLimit,
    claimDueJobs,
    completeJob,
    failJob,
    releaseJob,
    cleanup,
    exportByEmail,
    deleteByEmail,
    close: () => database.close(),
  });
}
