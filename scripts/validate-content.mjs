import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = join(projectRoot, 'src', 'content');

const rules = {
  global: {
    minimum: 1,
    maximum: 1,
    requiredSlugs: ['site'],
    required: [
      'workingName',
      'shortName',
      'status',
      'statusDisclosure',
      'launchLocale',
      'banglaReady',
      'contactEmailFallback',
      'contactEmailNote',
    ],
  },
  offerings: {
    minimum: 1,
    required: [
      'slug',
      'title',
      'summary',
      'detail',
      'intendedFor',
      'problem',
      'provides',
      'exclusions',
      'process',
      'expectedOutputs',
      'modelNote',
      'status',
      'sortOrder',
    ],
  },
  products: {
    minimum: 1,
    requiredSlugs: ['chokro'],
    required: [
      'slug',
      'name',
      'tagline',
      'summary',
      'stage',
      'publicAvailability',
      'ownershipStatus',
      'ownershipNote',
      'relationshipLabel',
      'intendedUsers',
      'currentCapabilities',
      'currentLimitations',
      'geography',
      'lastUpdated',
      'privacyStatus',
      'supportStatus',
      'representativeVisual',
      'screenshots',
      'seo',
      'primaryCta',
      'sortOrder',
    ],
  },
  faqs: {
    minimum: 1,
    required: ['slug', 'question', 'answer', 'category', 'sortOrder'],
  },
  people: {
    minimum: 0,
    required: ['name', 'role', 'group', 'bio', 'publicationStatus', 'sortOrder'],
  },
  partners: {
    minimum: 0,
    required: ['name', 'relationship', 'description', 'permissionReference', 'sortOrder'],
  },
  legal: {
    minimum: 3,
    requiredSlugs: ['accessibility', 'privacy', 'terms'],
    required: ['slug', 'title', 'description', 'status', 'lastReviewed', 'body'],
  },
};

const forbiddenKeys = new Set([
  'metric',
  'metrics',
  'testimonial',
  'testimonials',
  'partnerLogos',
  'certifications',
]);

const forbiddenCopy = [
  /\blorem ipsum\b/i,
  /\b(?:tbd|tbc|todo)\b/i,
  /\bplaceholder(?: copy| text)?\b/i,
  /\bworld[- ]?leading\b/i,
  /\bindustry[- ]?leading\b/i,
  /\baward[- ]?winning\b/i,
  /\bproven impact\b/i,
  /\bguaranteed (?:impact|results?|outcomes?)\b/i,
  /\bcertified sustainable\b/i,
  /\bcarbon[- ]?neutral\b/i,
  /\bfirst product (?:by|from) impact sol\b/i,
  /\b(?:available|live) now\b/i,
];

const unsupportedMetric =
  /\b\d+(?:\.\d+)?\s*(?:%|percent|users?|customers?|partners?|projects?|tonnes?|tons?|kilograms?|kg|co2e?|trees?|communities?|countries?|transactions?)\b/i;

const routedCollections = new Set(['offerings', 'products', 'faqs', 'legal']);

const errors = [];
const loaded = new Map();

async function jsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...(await jsonFiles(path)));
    else if (extname(entry.name) === '.json') paths.push(path);
  }
  return paths.sort();
}

function visit(value, path, callback) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, `${path}[${index}]`, callback));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      callback(key, child, `${path}.${key}`);
      visit(child, `${path}.${key}`, callback);
    }
  }
}

for (const [collection, rule] of Object.entries(rules)) {
  const directory = join(contentRoot, collection);
  let files = [];
  try {
    files = await jsonFiles(directory);
  } catch (error) {
    if (rule.minimum === 0 && error.code === 'ENOENT') {
      loaded.set(collection, []);
      continue;
    }
    errors.push(`${collection}: collection directory cannot be read (${error.message})`);
    continue;
  }

  if (files.length < rule.minimum) {
    errors.push(`${collection}: expected at least ${rule.minimum} JSON file(s), found ${files.length}`);
  }
  if (rule.maximum && files.length > rule.maximum) {
    errors.push(`${collection}: expected no more than ${rule.maximum} JSON file(s), found ${files.length}`);
  }

  const records = [];
  for (const file of files) {
    const label = relative(projectRoot, file);
    let value;
    try {
      value = JSON.parse(await readFile(file, 'utf8'));
    } catch (error) {
      errors.push(`${label}: invalid JSON (${error.message})`);
      continue;
    }

    if (!value || Array.isArray(value) || typeof value !== 'object') {
      errors.push(`${label}: the file must contain one JSON object`);
      continue;
    }

    for (const key of rule.required) {
      if (!(key in value) || value[key] === '' || value[key] === null) {
        errors.push(`${label}: missing required field "${key}"`);
      }
    }

    visit(value, label, (key, child, childPath) => {
      if (forbiddenKeys.has(key)) errors.push(`${childPath}: high-risk claim field is not allowed`);
      if (typeof child === 'string') {
        for (const pattern of forbiddenCopy) {
          if (pattern.test(child)) errors.push(`${childPath}: contains prohibited placeholder or claim copy`);
        }
      }
    });

    if (['offerings', 'products', 'faqs'].includes(collection)) {
      visit(value, label, (_key, child, childPath) => {
        if (typeof child === 'string' && unsupportedMetric.test(child)) {
          errors.push(`${childPath}: contains a numerical outcome claim without an evidence field`);
        }
      });
    }

    // Only collections whose slug addresses something — a route or a lookup
    // in read.ts — need the filename to match it. People and partners render
    // as a grid with no per-record route, and the CMS legitimately renames a
    // file (`-1`) when a slug collides, which would otherwise break the build.
    if (value.slug && routedCollections.has(collection)) {
      const filename = file.slice(file.lastIndexOf('/') + 1, -5);
      if (filename !== value.slug) {
        errors.push(`${label}: filename must match slug "${value.slug}.json"`);
      }
    }

    records.push({ file: label, value });
  }

  const ordered = records.filter(({ value }) => Number.isInteger(value.sortOrder));
  const seenOrders = new Set();
  for (const { file, value } of ordered) {
    if (seenOrders.has(value.sortOrder)) {
      errors.push(`${file}: sortOrder ${value.sortOrder} is duplicated in ${collection}`);
    }
    seenOrders.add(value.sortOrder);
  }

  for (const requiredSlug of rule.requiredSlugs ?? []) {
    const found = records.some(({ file, value }) => {
      const filename = file.slice(file.lastIndexOf('/') + 1, -5);
      return value.slug === requiredSlug || filename === requiredSlug;
    });
    if (!found) errors.push(`${collection}: required record "${requiredSlug}" is missing`);
  }

  loaded.set(collection, records);
}

for (const { file, value: product } of loaded.get('products') ?? []) {
  const makesLaunchClaim =
    product.stage === 'live' ||
    product.publicAvailability === true ||
    product.ownershipStatus === 'documented';
  if (makesLaunchClaim && !product.evidenceReference) {
    errors.push(`${file}: live, available or documented-ownership status requires evidenceReference`);
  }
  if (product.primaryCta === 'register-interest' && product.publicAvailability === true) {
    errors.push(`${file}: register-interest and publicAvailability cannot both describe the primary state`);
  }
  if (product.relationshipLabel === 'endorsed' && product.ownershipStatus !== 'documented') {
    errors.push(`${file}: an endorsed relationship requires documented ownership or licence`);
  }
  if (product.seo?.indexable === true && product.publicAvailability !== true) {
    errors.push(`${file}: an unavailable product cannot be independently indexable`);
  }
}

for (const { file, value: person } of loaded.get('people') ?? []) {
  if (person.publicationStatus === 'approved' && !person.consentReference) {
    errors.push(`${file}: publishing a person requires a recorded consentReference`);
  }

  // An empty portrait object is how Decap represents "none supplied".
  if (person.photo?.path && !String(person.photo.path).startsWith('/')) {
    errors.push(`${file}: photo.path must be a site-absolute path`);
  }
  if (person.photo?.path && !person.photo.alt) {
    errors.push(`${file}: a portrait requires photo.alt`);
  }
  if (!['withheld', 'approved'].includes(person.publicationStatus)) {
    errors.push(`${file}: publicationStatus must be "withheld" or "approved"`);
  }
}

for (const { file, value: partner } of loaded.get('partners') ?? []) {
  if (!partner.permissionReference) {
    errors.push(`${file}: naming a partner requires a written permissionReference`);
  }
  if (partner.logo?.path && !partner.logo.alt) {
    errors.push(`${file}: a partner logo requires logo.alt`);
  }
  if (!['proposed', 'active'].includes(partner.relationship)) {
    errors.push(`${file}: relationship must be "proposed" or "active"`);
  }
}

for (const { file, value: offering } of loaded.get('offerings') ?? []) {
  if (offering.status === 'available' && !offering.evidenceReference) {
    errors.push(`${file}: an available offering requires evidenceReference`);
  }
}

for (const { file, value: settings } of loaded.get('global') ?? []) {
  if (settings.launchLocale !== 'en') errors.push(`${file}: launchLocale must remain "en" for this release`);
  if (settings.banglaReady !== true) errors.push(`${file}: banglaReady must remain true`);
  if ((settings.status === 'operating' || settings.approvedDomain) && !settings.evidenceReference) {
    errors.push(`${file}: operating status or an approved domain requires evidenceReference`);
  }
  if (!String(settings.contactEmailNote ?? '').toLowerCase().includes('provisional')) {
    errors.push(`${file}: contactEmailNote must identify the fallback address as provisional`);
  }
}

for (const { file, value: document } of loaded.get('legal') ?? []) {
  if (document.status === 'approved' && !document.approvalReference) {
    errors.push(`${file}: approved legal copy requires approvalReference`);
  }
  if (document.status === 'working-draft' && !document.body.toLowerCase().includes('working draft')) {
    errors.push(`${file}: working-draft copy must disclose that status in its body`);
  }
}

if (errors.length) {
  console.error('Content validation failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const summary = [...loaded.entries()]
    .map(([collection, records]) => `${collection}=${records.length}`)
    .join(', ');
  console.log(`Content validation passed (${summary}).`);
}
