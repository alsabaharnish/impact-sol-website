import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const slug = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a lowercase, hyphenated slug.');

const evidence = z.string().min(3).max(500).nullable().optional();

const offerings = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/offerings' }),
  schema: z
    .object({
      slug,
      title: z.string().min(3).max(80),
      summary: z.string().min(30).max(220),
      detail: z.string().min(60).max(700),
      intendedFor: z.array(z.string().min(2).max(80)).min(1).max(6),
      problem: z.string().min(40).max(500),
      provides: z.array(z.string().min(10).max(180)).min(1).max(6),
      exclusions: z.array(z.string().min(10).max(180)).min(1).max(6),
      process: z.string().min(40).max(500),
      expectedOutputs: z.array(z.string().min(10).max(180)).min(1).max(6),
      modelNote: z.string().min(40).max(500),
      status: z.enum(['proposed', 'available']),
      evidenceReference: evidence,
      sortOrder: z.number().int().min(1).max(99),
    })
    .superRefine((offering, context) => {
      if (offering.status === 'available' && !offering.evidenceReference) {
        context.addIssue({
          code: 'custom',
          path: ['evidenceReference'],
          message: 'An available offering requires an approval or evidence reference.',
        });
      }
    }),
});

const products = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/products' }),
  schema: z
    .object({
      slug,
      name: z.string().min(2).max(80),
      tagline: z.string().min(20).max(160),
      summary: z.string().min(40).max(500),
      stage: z.enum(['concept', 'working-prototype', 'pilot', 'live']),
      publicAvailability: z.boolean(),
      ownershipStatus: z.enum(['unconfirmed', 'documented']),
      ownershipNote: z.string().min(20).max(400),
      relationshipLabel: z.enum(['proposed', 'endorsed']),
      intendedUsers: z.array(z.string().min(2).max(100)).min(1).max(8),
      currentCapabilities: z.array(z.string().min(10).max(240)).min(1).max(12),
      currentLimitations: z.array(z.string().min(10).max(260)).min(1).max(12),
      geography: z.string().min(20).max(240),
      lastUpdated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      privacyStatus: z.string().min(20).max(300),
      supportStatus: z.string().min(20).max(300),
      representativeVisual: z.object({
        path: z.string().startsWith('/'),
        alt: z.string().max(240),
        caption: z.string().min(20).max(400),
        rightsStatus: z.enum(['provisional', 'approved']),
      }),
      screenshots: z
        .array(
          z.object({
            path: z.string().startsWith('/'),
            alt: z.string().min(5).max(240),
            caption: z.string().min(10).max(400),
            rightsReference: z.string().min(3).max(300),
          }),
        )
        .max(8),
      seo: z.object({
        title: z.string().min(10).max(65),
        description: z.string().min(50).max(170),
        indexable: z.boolean(),
      }),
      evidenceReference: evidence,
      primaryCta: z.enum(['register-interest', 'learn-more']),
      productUrl: z.url().nullable().optional(),
      sortOrder: z.number().int().min(1).max(99),
    })
    .superRefine((product, context) => {
      const makesLaunchClaim =
        product.stage === 'live' ||
        product.publicAvailability ||
        product.ownershipStatus === 'documented';

      if (makesLaunchClaim && !product.evidenceReference) {
        context.addIssue({
          code: 'custom',
          path: ['evidenceReference'],
          message:
            'Live, public-availability, and documented-ownership claims require an approval or evidence reference.',
        });
      }
      if (product.relationshipLabel === 'endorsed' && product.ownershipStatus !== 'documented') {
        context.addIssue({
          code: 'custom',
          path: ['relationshipLabel'],
          message: 'An endorsed relationship requires documented ownership or licence.',
        });
      }
      if (product.seo.indexable && !product.publicAvailability) {
        context.addIssue({
          code: 'custom',
          path: ['seo', 'indexable'],
          message: 'A product marked unavailable cannot be independently indexable.',
        });
      }
    }),
});

const faqs = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/faqs' }),
  schema: z.object({
    slug,
    question: z.string().min(10).max(140),
    answer: z.string().min(30).max(900),
    category: z.enum(['organisation', 'work', 'products', 'partnerships', 'access']),
    sortOrder: z.number().int().min(1).max(99),
  }),
});

const global = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/global' }),
  schema: z
    .object({
      workingName: z.string().min(2).max(80),
      shortName: z.string().min(2).max(80),
      status: z.enum(['being-established', 'operating']),
      statusDisclosure: z.string().min(30).max(300),
      launchLocale: z.literal('en'),
      banglaReady: z.boolean(),
      contactEmailFallback: z.email(),
      contactEmailNote: z.string().min(20).max(300),
      approvedDomain: z.url().nullable().optional(),
      evidenceReference: evidence,
      socialLinks: z
        .array(
          z.object({
            label: z.string().min(2).max(40),
            url: z.url(),
          }),
        )
        .max(8)
        .default([]),
    })
    .superRefine((settings, context) => {
      if ((settings.status === 'operating' || settings.approvedDomain) && !settings.evidenceReference) {
        context.addIssue({
          code: 'custom',
          path: ['evidenceReference'],
          message: 'Operating-status and approved-domain claims require an evidence reference.',
        });
      }
    }),
});

const legal = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/legal' }),
  schema: z
    .object({
      slug,
      title: z.string().min(3).max(90),
      description: z.string().min(30).max(240),
      status: z.enum(['working-draft', 'reviewed', 'approved']),
      lastReviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      body: z.string().min(120).max(8000),
      approvalReference: evidence,
    })
    .superRefine((document, context) => {
      if (document.status === 'approved' && !document.approvalReference) {
        context.addIssue({
          code: 'custom',
          path: ['approvalReference'],
          message: 'Approved policy copy requires a recorded approval reference.',
        });
      }
    }),
});

export const collections = { offerings, products, faqs, global, legal };
