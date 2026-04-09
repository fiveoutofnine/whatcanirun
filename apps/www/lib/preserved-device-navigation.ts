// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

type Listener = () => void;

const listeners = new Set<Listener>();
const MODEL_ROUTE_BLOCKLIST = new Set(['api', 'cli-auth', 'docs', 'legal', 'login', 'models', 'runs']);
const SINGLE_SEGMENT_PRESERVE_ROUTES = new Set(['device']);
const TARGET_BLOCKLIST = ['/api', '/cli-auth', '/login'];

let navigationDevice: string | null = null;

export const subscribePreservedNavigationDevice = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getPreservedNavigationDevice = () => navigationDevice;

export const setPreservedNavigationDevice = (device: string | null) => {
  if (navigationDevice === device) return;
  navigationDevice = device;
  listeners.forEach((listener) => listener());
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

export const isExternalHref = (href: string) =>
  /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');

export const shouldPreserveDeviceForPath = (pathname: string | null) => {
  if (!pathname) return false;
  if (pathname === '/') return true;

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 1) return SINGLE_SEGMENT_PRESERVE_ROUTES.has(segments[0] ?? '');
  if (segments.length < 2) return false;

  return !MODEL_ROUTE_BLOCKLIST.has(segments[0] ?? '');
};

const shouldPreserveDeviceForTarget = (pathname: string) =>
  !TARGET_BLOCKLIST.some((blocked) => pathname === blocked || pathname.startsWith(`${blocked}/`));

export const withDeviceSearchParam = (href: string, device: string) => {
  if (isExternalHref(href) || href.startsWith('#')) return href;

  const url = new URL(href, 'http://whatcani.run');
  if (!shouldPreserveDeviceForTarget(url.pathname) || url.searchParams.has('device')) return href;

  url.searchParams.set('device', device);
  return `${url.pathname}${url.search}${url.hash}`;
};
