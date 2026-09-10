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

export interface NavItem {
  href: string;
  label: string;
  children?: readonly NavItem[];
}

export const primaryNavigation: readonly NavItem[] = [
  {
    href: '/about/',
    label: 'About',
    children: [
      { href: '/about/', label: 'About Impact Sol.' },
      { href: '/about/leadership/', label: 'Executive & Strategic Leadership' },
      { href: '/about/partners/', label: 'Our Partners' },
    ],
  },
  { href: '/what-we-do/', label: 'What we do' },
  {
    href: '/products/',
    label: 'Products',
    children: [
      { href: '/products/', label: 'All products' },
      { href: '/products/chokro/', label: 'Chokro' },
    ],
  },
  { href: '/impact/', label: 'Purpose & approach' },
  {
    href: '/get-involved/',
    label: 'Get involved',
    children: [
      { href: '/get-involved/', label: 'Choose a pathway' },
      { href: '/get-involved/partnership/', label: 'Propose a partnership' },
      { href: '/get-involved/maker/', label: 'Register maker or initiative interest' },
    ],
  },
  { href: '/contact/', label: 'Contact' },
];

export const publicRoutes = [
  '/',
  '/about/',
  '/about/leadership/',
  '/about/partners/',
  '/what-we-do/',
  '/products/',
  '/products/chokro/',
  '/impact/',
  '/get-involved/',
  '/get-involved/partnership/',
  '/get-involved/maker/',
  '/contact/',
  '/privacy/',
  '/terms/',
  '/accessibility/',
] as const;

export type PublicRoute = (typeof publicRoutes)[number];
