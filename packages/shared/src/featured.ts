// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export const FEATURED_RUNTIMES = ['mlx_lm', 'llama.cpp'] as const;
export const FEATURED_DEVICE_TYPES = ['apple', 'gpu', 'cpu'] as const;

export type FeaturedRuntime = (typeof FEATURED_RUNTIMES)[number];
export type FeaturedDeviceType = (typeof FEATURED_DEVICE_TYPES)[number];
export type FeaturedDeviceTarget = `${FeaturedDeviceType}/${string}`;

export interface FeaturedModel {
  displayName: string;
  hfRepoId: string;
  hfFileName?: string;
  runtime: FeaturedRuntime;
}

export interface FeaturedWishlistEntry extends FeaturedModel {
  modelRef: string;
  deviceTypes: readonly FeaturedDeviceType[];
}

export interface FeaturedDeviceInfo {
  cpu?: string | null;
  gpu?: string | null;
  gpuCount?: number | null;
  osName?: string | null;
}

export interface FeaturedWishlistInput {
  deviceTypes: readonly FeaturedDeviceType[];
  displayName: string;
  hfRepoId: string;
}

export interface FeaturedMlxInput extends FeaturedWishlistInput {}

export interface FeaturedGgufInput extends FeaturedWishlistInput {
  hfFileName: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const GPU_VENDOR_PREFIX = /^(?:nvidia(?: corporation)?|advanced micro devices,? inc\.?(?: \[amd\/ati\])?|amd\/ati|intel(?: corporation)?|apple)\s+/i;
const TRAILING_PCI_CODES = /\s*\[[\da-f]{4}(?::[\da-f]{4})?\]\s*/gi;
const APPLE_CHIP_PATTERN = /\b(?:apple\s+)?(m\d+)(?:[\s-]*(ultra|max|pro))?\b/i;

// -----------------------------------------------------------------------------
// Type guards
// -----------------------------------------------------------------------------

export function isFeaturedRuntime(value: string | null | undefined): value is FeaturedRuntime {
  return FEATURED_RUNTIMES.includes(value as FeaturedRuntime);
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

export function getFeaturedModelRef(model: Pick<FeaturedModel, 'hfRepoId' | 'hfFileName'>): string {
  return model.hfFileName ? `${model.hfRepoId}:${model.hfFileName}` : model.hfRepoId;
}

export function toFeaturedModel(entry: FeaturedWishlistEntry): FeaturedModel {
  return {
    displayName: entry.displayName,
    hfRepoId: entry.hfRepoId,
    ...(entry.hfFileName ? { hfFileName: entry.hfFileName } : {}),
    runtime: entry.runtime,
  };
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[®™©]/g, '')
    .replace(/\((?:r|tm|c)\)/gi, '')
    .replace(TRAILING_PCI_CODES, ' ')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .toLowerCase();
}

function normalizeAppleTarget(value: string): string {
  const match = value.trim().match(APPLE_CHIP_PATTERN);
  if (!match) return slugify(value.replace(/^apple[\s-]+/i, ''));
  const chip = match[1]!.toLowerCase();
  const tier = match[2]?.toLowerCase();
  return tier ? `${chip}-${tier}` : chip;
}

function normalizeGpuTarget(value: string): string {
  return slugify(
    value
      .trim()
      .replace(/^\d+x\s+/i, '')
      .replace(GPU_VENDOR_PREFIX, ''),
  );
}

function normalizeCpuTarget(value: string): string {
  return slugify(value.trim().replace(/^\d+x\s+/i, ''));
}

function getAppleChipTarget(cpu?: string | null, gpu?: string | null): FeaturedDeviceTarget | null {
  const candidate = [gpu, cpu].filter(Boolean).join(' ');
  if (!candidate) return null;
  const match = candidate.match(APPLE_CHIP_PATTERN);
  if (!match) return null;
  return `apple/${normalizeAppleTarget(match[0])}`;
}

function hasUsableGpu(gpu?: string | null): gpu is string {
  if (!gpu) return false;
  return !/^(?:none|unknown|n\/a)$/i.test(gpu.trim());
}

function createFeaturedEntry(
  displayName: string,
  hfRepoId: string,
  runtime: FeaturedRuntime,
  deviceTypes: readonly FeaturedDeviceType[],
  hfFileName?: string,
): FeaturedWishlistEntry {
  return {
    displayName,
    hfRepoId,
    ...(hfFileName ? { hfFileName } : {}),
    runtime,
    modelRef: getFeaturedModelRef({ hfRepoId, hfFileName }),
    deviceTypes: [...deviceTypes],
  };
}

// -----------------------------------------------------------------------------
// DSL
// -----------------------------------------------------------------------------

export function apple(): FeaturedDeviceType {
  return 'apple';
}

export function gpu(): FeaturedDeviceType {
  return 'gpu';
}

export function cpu(): FeaturedDeviceType {
  return 'cpu';
}

export function featuredMlx({
  deviceTypes,
  displayName,
  hfRepoId,
}: FeaturedMlxInput): FeaturedWishlistEntry {
  return createFeaturedEntry(displayName, hfRepoId, 'mlx_lm', deviceTypes);
}

export function featuredGguf({
  deviceTypes,
  displayName,
  hfFileName,
  hfRepoId,
}: FeaturedGgufInput): FeaturedWishlistEntry {
  return createFeaturedEntry(displayName, hfRepoId, 'llama.cpp', deviceTypes, hfFileName);
}

export function defineFeaturedWishlist(
  entries: readonly FeaturedWishlistEntry[],
): readonly FeaturedWishlistEntry[] {
  const seen = new Set<string>();

  return Object.freeze(
    entries.map((entry) => {
      for (const deviceType of entry.deviceTypes) {
        const key = `${entry.runtime}::${entry.modelRef}::${deviceType}`;
        if (seen.has(key)) {
          throw new Error(`Duplicate featured wishlist tuple: ${key}`);
        }
        seen.add(key);
      }

      return Object.freeze({
        ...entry,
        deviceTypes: Object.freeze([...entry.deviceTypes]),
      });
    }),
  );
}

// -----------------------------------------------------------------------------
// Normalization
// -----------------------------------------------------------------------------

export function normalizeFeaturedDeviceTarget(
  device: FeaturedDeviceInfo,
): FeaturedDeviceTarget | null {
  const appleTarget = getAppleChipTarget(device.cpu, device.gpu);
  if (appleTarget) return appleTarget;

  if (hasUsableGpu(device.gpu)) {
    return `gpu/${normalizeGpuTarget(device.gpu)}`;
  }

  if (device.cpu?.trim()) {
    return `cpu/${normalizeCpuTarget(device.cpu)}`;
  }

  return null;
}

export function getFeaturedDeviceType(target: FeaturedDeviceTarget): FeaturedDeviceType {
  return target.split('/', 1)[0] as FeaturedDeviceType;
}
