import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadConfig } from './config.mjs';
import { openStorage } from './storage.mjs';

function usage() {
  console.error([
    'Usage:',
    '  node server/records.mjs export --email person@example.com [--output ./export.json]',
    '  node server/records.mjs delete --email person@example.com --confirm-email person@example.com',
  ].join('\n'));
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

const command = process.argv[2];
const email = option('--email')?.trim().toLowerCase();
if (!['export', 'delete'].includes(command) || !email || !email.includes('@')) {
  usage();
  process.exitCode = 2;
} else {
  const config = loadConfig();
  const storage = openStorage(config.databasePath);
  try {
    if (command === 'export') {
      const payload = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          email,
          records: storage.exportByEmail(email),
        },
        null,
        2,
      );
      const output = option('--output');
      if (output) {
        const outputPath = resolve(output);
        await writeFile(outputPath, `${payload}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
        console.info(`Export written to ${outputPath}`);
      } else {
        process.stdout.write(`${payload}\n`);
      }
    } else {
      const confirmation = option('--confirm-email')?.trim().toLowerCase();
      if (confirmation !== email) {
        console.error('Deletion cancelled: --confirm-email must exactly match --email.');
        process.exitCode = 2;
      } else {
        const deleted = storage.deleteByEmail(email);
        console.info(`Deleted ${deleted} inquiry record(s) and their queued delivery records.`);
      }
    }
  } finally {
    storage.close();
  }
}

