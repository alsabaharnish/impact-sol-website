import globalSettings from '../content/global/site.json';

export const siteConfig = {
  name: globalSettings.workingName,
  shortName: globalSettings.shortName,
  locale: globalSettings.launchLocale,
  defaultDescription:
    'Impact Sol. is building practical products and partnerships for eco-conscious enterprise and a greener, more inclusive economy.',
  contactEmail:
    import.meta.env.PUBLIC_CONTACT_EMAIL?.trim() || globalSettings.contactEmailFallback,
  status: globalSettings.status === 'being-established' ? 'Being established' : 'Operating',
  statusDisclosure: globalSettings.statusDisclosure,
  banglaReady: globalSettings.banglaReady,
  confirmedIdentity:
    globalSettings.status === 'operating' &&
    Boolean(globalSettings.approvedDomain) &&
    Boolean(globalSettings.evidenceReference),
  lastReviewed: '2026-09-09',
} as const;

export const primaryNavigation = [
  { href: '/about/', label: 'About' },
  { href: '/what-we-do/', label: 'What we do' },
  { href: '/products/', label: 'Products' },
  { href: '/impact/', label: 'Purpose & approach' },
  { href: '/get-involved/', label: 'Get involved' },
  { href: '/contact/', label: 'Contact' },
] as const;

export const publicRoutes = [
  '/',
  '/about/',
  '/what-we-do/',
  '/products/',
  '/products/chokro/',
  '/impact/',
  '/get-involved/',
  '/contact/',
  '/privacy/',
  '/terms/',
  '/accessibility/',
] as const;

export type PublicRoute = (typeof publicRoutes)[number];
