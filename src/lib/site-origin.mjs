const reservedHostname = /(?:^|\.)(?:example\.(?:com|net|org)|localhost)$/u;
const reservedSuffix = /\.(?:example|invalid|local|test)$/u;

const isPrivateIpv4 = (hostname) => {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u.exec(hostname);
  if (!match) return false;

  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) return true;
  const [first, second, third] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
  );
};

/**
 * Only a public HTTPS origin is safe to advertise to crawlers. Documentation,
 * loopback and private-network hosts are deliberately treated as previews.
 *
 * @param {URL} origin
 */
export const isPublicProductionOrigin = (origin) => {
  const hostname = origin.hostname.toLowerCase().replace(/^\[|\]$/gu, '');
  const isPrivateIpv6 =
    hostname.includes(':') &&
    (hostname === '::' ||
      hostname === '::1' ||
      hostname.startsWith('2001:db8:') ||
      hostname.startsWith('fc') ||
      hostname.startsWith('fd') ||
      /^fe[89ab]/u.test(hostname));

  return (
    origin.protocol === 'https:' &&
    !origin.username &&
    !origin.password &&
    !reservedHostname.test(hostname) &&
    !reservedSuffix.test(hostname) &&
    !isPrivateIpv4(hostname) &&
    !isPrivateIpv6
  );
};
