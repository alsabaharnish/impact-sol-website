import { gzipSync } from 'node:zlib';
import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = join(projectRoot, 'dist');
const errors = [];

const requiredPages = [
  'index.html',
  'about/index.html',
  'about/leadership/index.html',
  'about/partners/index.html',
  'get-involved/partnership/index.html',
  'get-involved/maker/index.html',
  'what-we-do/index.html',
  'products/index.html',
  'products/chokro/index.html',
  'impact/index.html',
  'get-involved/index.html',
  'contact/index.html',
  'thank-you/index.html',
  'privacy/index.html',
  'terms/index.html',
  'accessibility/index.html',
  '404.html',
  '500.html',
  'maintenance/index.html',
  'assets/brand/impact-sol-social-card.png',
  'robots.txt',
  'sitemap.xml',
];

for (const page of requiredPages) {
  if (!existsSync(join(distRoot, page))) errors.push(`missing required build output: ${page}`);
}

async function filesBelow(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await filesBelow(path)));
    else found.push(path);
  }
  return found;
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`, 'iu'))?.[1] ?? null;
}

function destinationFile(pathname) {
  if (pathname === '/') return join(distRoot, 'index.html');
  const clean = pathname.replace(/^\//u, '');
  if (pathname.endsWith('/')) return join(distRoot, clean, 'index.html');
  if (extname(pathname)) return join(distRoot, clean);
  const directoryIndex = join(distRoot, clean, 'index.html');
  return existsSync(directoryIndex) ? directoryIndex : join(distRoot, `${clean}.html`);
}

function idsIn(html) {
  return new Set([...html.matchAll(/\sid=["']([^"']+)["']/giu)].map((match) => match[1]));
}

const files = existsSync(distRoot) ? await filesBelow(distRoot) : [];
const htmlFiles = files.filter((path) => extname(path) === '.html');
const htmlByFile = new Map();
const titles = new Map();
const descriptions = new Map();

for (const file of htmlFiles) {
  const relative = file.slice(distRoot.length + 1);
  const html = await readFile(file, 'utf8');
  htmlByFile.set(file, html);

  if (relative.startsWith('admin/')) continue;
  const title = html.match(/<title>([\s\S]*?)<\/title>/iu)?.[1]?.trim();
  const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/iu)?.[1]?.trim();
  const h1Count = (html.match(/<h1(?:\s|>)/giu) ?? []).length;
  const canonicalCount = (html.match(/<link\s+rel=["']canonical["']/giu) ?? []).length;

  if (!title) errors.push(`${relative}: missing page title`);
  if (!description) errors.push(`${relative}: missing meta description`);
  if (h1Count !== 1) errors.push(`${relative}: expected one h1, found ${h1Count}`);
  if (canonicalCount !== 1) errors.push(`${relative}: expected one canonical link, found ${canonicalCount}`);
  if (title) {
    if (titles.has(title)) errors.push(`${relative}: duplicate title also used by ${titles.get(title)}`);
    titles.set(title, relative);
  }
  if (description) {
    if (descriptions.has(description)) errors.push(`${relative}: duplicate description also used by ${descriptions.get(description)}`);
    descriptions.set(description, relative);
  }

  for (const tag of html.match(/<img\b[^>]*>/giu) ?? []) {
    if (!attribute(tag, 'width') || !attribute(tag, 'height')) {
      errors.push(`${relative}: image is missing explicit width or height`);
    }
    if (attribute(tag, 'alt') === null) errors.push(`${relative}: image is missing alt text`);
  }

  const inlineScripts = html.match(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/giu) ?? [];
  for (const tag of inlineScripts) {
    if (!/type=["']application\/ld\+json["']/iu.test(tag)) {
      errors.push(`${relative}: unexpected inline executable script`);
      continue;
    }
    const payload = tag.replace(/^<script[^>]*>/iu, '').replace(/<\/script>$/iu, '');
    try {
      JSON.parse(payload);
    } catch {
      errors.push(`${relative}: invalid JSON-LD`);
    }
  }
}

const expectedForms = new Map([
  ['contact/index.html', ['impact-sol-general']],
  ['get-involved/partnership/index.html', ['impact-sol-partnership']],
  ['get-involved/maker/index.html', ['impact-sol-maker']],
]);
const detectedFormNames = new Set();

for (const [relative, expectedNames] of expectedForms) {
  const file = join(distRoot, relative);
  const html = htmlByFile.get(file) ?? (existsSync(file) ? await readFile(file, 'utf8') : '');
  for (const formName of expectedNames) {
    const escapedName = formName.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const formTag = html.match(new RegExp(`<form\\b(?=[^>]*\\bname=["']${escapedName}["'])[^>]*>`, 'iu'))?.[0];
    if (!formTag) {
      errors.push(`${relative}: missing Netlify form ${formName}`);
      continue;
    }
    detectedFormNames.add(formName);
    if (!/\bmethod=["']post["']/iu.test(formTag)) errors.push(`${relative}: ${formName} must use POST`);
    if (!/\bdata-netlify=["']true["']/iu.test(formTag)) errors.push(`${relative}: ${formName} is missing data-netlify`);
    if (!/\bdata-netlify-honeypot=["']companyWebsite["']/iu.test(formTag)) {
      errors.push(`${relative}: ${formName} is missing its Netlify honeypot declaration`);
    }
    if (!new RegExp(`<input\\b(?=[^>]*\\bname=["']form-name["'])(?=[^>]*\\bvalue=["']${escapedName}["'])[^>]*>`, 'iu').test(html)) {
      errors.push(`${relative}: ${formName} is missing its AJAX form-name field`);
    }
    if (!/<input\b(?=[^>]*\bname=["']companyWebsite["'])[^>]*>/iu.test(html)) {
      errors.push(`${relative}: ${formName} is missing its honeypot field`);
    }
  }
}

if (detectedFormNames.size !== 3) {
  errors.push(`expected three uniquely named Netlify forms, found ${detectedFormNames.size}`);
}

for (const [file, html] of htmlByFile) {
  const relative = file.slice(distRoot.length + 1);
  if (relative.startsWith('admin/')) continue;
  const currentIds = idsIn(html);
  for (const tag of html.match(/<a\b[^>]*>/giu) ?? []) {
    const href = attribute(tag, 'href');
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) continue;
    const parsed = new URL(href, 'https://build.invalid/');
    let targetFile = file;
    if (parsed.pathname !== '/') targetFile = destinationFile(parsed.pathname);
    else if (!href.startsWith('#')) targetFile = destinationFile('/');

    if (!existsSync(targetFile)) {
      errors.push(`${relative}: broken internal link ${href}`);
      continue;
    }
    if (parsed.hash) {
      const targetHtml = targetFile === file ? html : (htmlByFile.get(targetFile) ?? (await readFile(targetFile, 'utf8')));
      const targetIds = targetFile === file ? currentIds : idsIn(targetHtml);
      const targetId = decodeURIComponent(parsed.hash.slice(1));
      if (!targetIds.has(targetId)) errors.push(`${relative}: missing anchor target ${href}`);
    }
  }
}

const marketingFiles = htmlFiles.filter((path) => !path.includes(`${join('', 'admin')}/`));
for (const file of marketingFiles) {
  const relative = file.slice(distRoot.length + 1);
  const html = htmlByFile.get(file);
  const localAssets = new Set();
  for (const tag of html.match(/<(?:script|link|img)\b[^>]*>/giu) ?? []) {
    const reference = attribute(tag, 'src') ?? attribute(tag, 'href');
    if (!reference || !reference.startsWith('/')) continue;
    const asset = destinationFile(new URL(reference, 'https://build.invalid').pathname);
    if (existsSync(asset) && extname(asset) !== '.html') localAssets.add(asset);
  }
  let compressedBytes = gzipSync(Buffer.from(html)).length;
  for (const asset of localAssets) compressedBytes += gzipSync(await readFile(asset)).length;
  const limit = relative === 'index.html' ? 1.5 * 1024 * 1024 : 1.0 * 1024 * 1024;
  if (compressedBytes > limit) {
    errors.push(`${relative}: estimated compressed first load ${compressedBytes} exceeds ${limit} bytes`);
  }
}

const scriptPath = join(distRoot, 'scripts', 'site.js');
if (existsSync(scriptPath)) {
  const compressedJavaScript = gzipSync(await readFile(scriptPath)).length;
  if (compressedJavaScript > 200 * 1024) {
    errors.push(`public JavaScript ${compressedJavaScript} bytes exceeds 200 KiB compressed`);
  }
}

const robots = existsSync(join(distRoot, 'robots.txt'))
  ? await readFile(join(distRoot, 'robots.txt'), 'utf8')
  : '';
if (robots && !/Disallow:\s*\//u.test(robots)) {
  errors.push('non-production robots.txt must block crawling');
}

for (const path of files) {
  const info = await stat(path);
  if (info.size > 1.5 * 1024 * 1024) {
    errors.push(`${path.slice(distRoot.length + 1)}: individual file exceeds 1.5 MiB`);
  }
}

if (errors.length) {
  console.error('Built-site checks failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Built-site checks passed (${htmlFiles.length} HTML documents, ${files.length} total files).`);
}
