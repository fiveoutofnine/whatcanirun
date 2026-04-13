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

export interface FeaturedWishlistGoals {
  minimumDistinctDevices: number;
  minimumRunsPerDevice: number;
  priority: number;
}

export interface FeaturedWishlistEntry extends FeaturedModel, FeaturedWishlistGoals {
  fileSizeBytes?: number;
  modelRef: string;
  deviceTypes: readonly FeaturedDeviceType[];
}

export interface FeaturedDeviceInfo {
  cpu?: string | null;
  gpu?: string | null;
  gpuCount?: number | null;
  ramGb?: number | null;
  osName?: string | null;
}

export interface FeaturedWishlistInput extends Partial<FeaturedWishlistGoals> {
  deviceTypes: readonly FeaturedDeviceType[];
  displayName: string;
  fileSizeBytes?: number;
  hfRepoId: string;
}

export interface FeaturedMlxInput extends FeaturedWishlistInput {}

export interface FeaturedGgufInput extends FeaturedWishlistInput {
  hfFileName: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const DEFAULT_FEATURED_PRIORITY = 1;
const DEFAULT_MINIMUM_DISTINCT_DEVICES = 4;
const DEFAULT_MINIMUM_RUNS_PER_DEVICE = 2;
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

function normalizeFeaturedGoal(
  value: number | undefined,
  {
    fallback,
    minimum,
    name,
  }: {
    fallback: number;
    minimum: number;
    name: string;
  },
): number {
  const normalized = value ?? fallback;

  if (!Number.isInteger(normalized) || normalized < minimum) {
    throw new Error(`Invalid featured wishlist ${name}: ${String(value)}`);
  }

  return normalized;
}

function normalizeFeaturedFileSizeBytes(value: number | undefined): number | undefined {
  if (value == null) return undefined;

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Invalid featured wishlist fileSizeBytes: ${String(value)}`);
  }

  return value;
}

function createFeaturedEntry(
  input: FeaturedWishlistInput & {
    runtime: FeaturedRuntime;
    hfFileName?: string;
  },
): FeaturedWishlistEntry {
  const minimumDistinctDevices = normalizeFeaturedGoal(input.minimumDistinctDevices, {
    fallback: DEFAULT_MINIMUM_DISTINCT_DEVICES,
    minimum: 0,
    name: 'minimumDistinctDevices',
  });
  const minimumRunsPerDevice = normalizeFeaturedGoal(input.minimumRunsPerDevice, {
    fallback: DEFAULT_MINIMUM_RUNS_PER_DEVICE,
    minimum: 1,
    name: 'minimumRunsPerDevice',
  });
  const priority = normalizeFeaturedGoal(input.priority, {
    fallback: DEFAULT_FEATURED_PRIORITY,
    minimum: 1,
    name: 'priority',
  });
  const fileSizeBytes = normalizeFeaturedFileSizeBytes(input.fileSizeBytes);

  return {
    displayName: input.displayName,
    ...(fileSizeBytes ? { fileSizeBytes } : {}),
    hfRepoId: input.hfRepoId,
    ...(input.hfFileName ? { hfFileName: input.hfFileName } : {}),
    runtime: input.runtime,
    modelRef: getFeaturedModelRef({ hfRepoId: input.hfRepoId, hfFileName: input.hfFileName }),
    deviceTypes: [...input.deviceTypes],
    minimumDistinctDevices,
    minimumRunsPerDevice,
    priority,
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
  fileSizeBytes,
  hfRepoId,
  minimumDistinctDevices,
  minimumRunsPerDevice,
  priority,
}: FeaturedMlxInput): FeaturedWishlistEntry {
  return createFeaturedEntry({
    deviceTypes,
    displayName,
    fileSizeBytes,
    hfRepoId,
    minimumDistinctDevices,
    minimumRunsPerDevice,
    priority,
    runtime: 'mlx_lm',
  });
}

export function featuredGguf({
  deviceTypes,
  displayName,
  fileSizeBytes,
  hfFileName,
  hfRepoId,
  minimumDistinctDevices,
  minimumRunsPerDevice,
  priority,
}: FeaturedGgufInput): FeaturedWishlistEntry {
  return createFeaturedEntry({
    deviceTypes,
    displayName,
    fileSizeBytes,
    hfFileName,
    hfRepoId,
    minimumDistinctDevices,
    minimumRunsPerDevice,
    priority,
    runtime: 'llama.cpp',
  });
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
    const normalizedGpu = normalizeGpuTarget(device.gpu);
    if (normalizedGpu) {
      return `gpu/${normalizedGpu}`;
    }
  }

  if (device.cpu?.trim()) {
    const normalizedCpu = normalizeCpuTarget(device.cpu);
    if (normalizedCpu) {
      return `cpu/${normalizedCpu}`;
    }
  }

  return null;
}

export function getFeaturedDeviceType(target: FeaturedDeviceTarget): FeaturedDeviceType {
  const separatorIndex = target.indexOf('/');
  return (separatorIndex >= 0 ? target.slice(0, separatorIndex) : target) as FeaturedDeviceType;
}
