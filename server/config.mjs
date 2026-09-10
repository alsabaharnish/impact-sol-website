import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const envPath = resolve(projectRoot, '.env');
if (existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envPath);
}

function integerFromEnv(name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

function booleanFromEnv(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  if (['1', 'true', 'yes', 'on'].includes(value.toLowerCase())) return true;
  if (['0', 'false', 'no', 'off'].includes(value.toLowerCase())) return false;
  throw new Error(`${name} must be true or false.`);
}

function normalizeOrigin(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function parseOrigins(value) {
  const entries = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const origins = new Set();
  for (const entry of entries) {
    const origin = normalizeOrigin(entry);
    if (!origin) throw new Error(`Invalid origin in INQUIRY_ALLOWED_ORIGINS: ${entry}`);
    origins.add(origin);
  }
  return origins;
}

export function loadConfig(overrides = {}) {
  const production = (overrides.nodeEnv ?? process.env.NODE_ENV) === 'production';
  const configuredSecret = overrides.ipHashSecret ?? process.env.INQUIRY_IP_HASH_SECRET ?? '';
  const insecureSecret = configuredSecret.length < 32 || configuredSecret === 'replace-with-a-long-random-secret';

  if (production && insecureSecret) {
    throw new Error('INQUIRY_IP_HASH_SECRET must be a unique secret of at least 32 characters in production.');
  }

  const fallbackOrigins = production
    ? ''
    : 'http://localhost:4321,http://127.0.0.1:4321,http://localhost:8788,http://127.0.0.1:8788';
  const allowedOrigins = parseOrigins(
    overrides.allowedOrigins ?? process.env.INQUIRY_ALLOWED_ORIGINS ?? fallbackOrigins,
  );
  const publicOrigin = normalizeOrigin(overrides.publicOrigin ?? process.env.IMPACT_SOL_SITE_URL ?? '');
  if (publicOrigin) allowedOrigins.add(publicOrigin);

  if (production && allowedOrigins.size === 0) {
    throw new Error('Set IMPACT_SOL_SITE_URL or INQUIRY_ALLOWED_ORIGINS in production.');
  }

  return Object.freeze({
    projectRoot,
    nodeEnv: production ? 'production' : 'development',
    host: overrides.host ?? process.env.HOST ?? '127.0.0.1',
    port: overrides.port ?? integerFromEnv('PORT', 8788, { min: 1, max: 65535 }),
    staticRoot: resolve(overrides.staticRoot ?? process.env.STATIC_ROOT ?? resolve(projectRoot, 'dist')),
    databasePath: resolve(
      overrides.databasePath ?? process.env.INQUIRY_DATABASE_PATH ?? resolve(projectRoot, 'runtime-data/inquiries.sqlite'),
    ),
    allowedOrigins,
    trustProxy: overrides.trustProxy ?? booleanFromEnv('TRUST_PROXY', false),
    maintenanceMode: overrides.maintenanceMode ?? booleanFromEnv('MAINTENANCE_MODE', false),
    maxBodyBytes: Math.min(
      overrides.maxBodyBytes ?? integerFromEnv('INQUIRY_MAX_BODY_BYTES', 32 * 1024, { min: 1024, max: 32 * 1024 }),
      32 * 1024,
    ),
    rateLimitWindowSeconds:
      overrides.rateLimitWindowSeconds ??
      integerFromEnv('INQUIRY_RATE_LIMIT_WINDOW_SECONDS', 15 * 60, { min: 60, max: 24 * 60 * 60 }),
    rateLimitMax:
      overrides.rateLimitMax ?? integerFromEnv('INQUIRY_RATE_LIMIT_MAX', 5, { min: 1, max: 100 }),
    retentionDays:
      overrides.retentionDays ?? integerFromEnv('INQUIRY_RETENTION_DAYS', 90, { min: 1, max: 3650 }),
    ipHashSecret: insecureSecret ? randomBytes(32).toString('hex') : configuredSecret,
    ipHashSecretIsEphemeral: insecureSecret,
    resendApiKey: overrides.resendApiKey ?? process.env.RESEND_API_KEY ?? '',
    fromEmail: overrides.fromEmail ?? process.env.INQUIRY_FROM_EMAIL ?? '',
    toEmail: overrides.toEmail ?? process.env.INQUIRY_TO_EMAIL ?? '',
    deliveryIntervalMs:
      overrides.deliveryIntervalMs ?? integerFromEnv('INQUIRY_DELIVERY_INTERVAL_MS', 15_000, { min: 1_000, max: 300_000 }),
    maxDeliveryAttempts:
      overrides.maxDeliveryAttempts ?? integerFromEnv('INQUIRY_MAX_DELIVERY_ATTEMPTS', 8, { min: 1, max: 20 }),
  });
}

