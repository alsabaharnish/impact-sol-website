/**
 * Copies the Inter variable face into public/fonts/ so the site serves its
 * own typeface. Without it the font stack falls through to Helvetica or
 * Segoe UI, where every weight above 500 renders identically and the
 * design's five-step hierarchy collapses to regular + bold.
 *
 *   npm install --save-dev @fontsource-variable/inter
 *   npm run fonts
 *
 * The file is gitignored by default; commit it or let CI run this script.
 */
import { copyFile, mkdir, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(projectRoot, 'public', 'fonts', 'inter-variable.woff2');

const candidates = [
  'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  'node_modules/@fontsource-variable/inter/files/inter-latin-standard-normal.woff2',
  'node_modules/inter-ui/variable/InterVariable.woff2',
];

const exists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

if (await exists(target)) {
  console.log('Inter variable face already present at public/fonts/.');
  process.exit(0);
}

for (const candidate of candidates) {
  const source = join(projectRoot, candidate);
  if (!(await exists(source))) continue;
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
  console.log(`Copied ${candidate} -> public/fonts/inter-variable.woff2`);
  process.exit(0);
}

console.error(
  'No Inter variable source found. Install one, then rerun:\n' +
    '  npm install --save-dev @fontsource-variable/inter\n' +
    '  npm run fonts\n\n' +
    'Until then the site renders in a fallback face and the weight scale\n' +
    'flattens. Nothing else breaks.',
);
process.exitCode = 1;
