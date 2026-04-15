export type LinuxGpuModelNormalizationInput = {
  cpuModel: string;
  gpuCount: number;
  gpuModel?: string;
};

const AMD_APU_CODENAME_PATTERN =
  /\b(?:phoenix\s*\d*|hawk point|rembrandt|cezanne|renoir|mendocino|vangogh|van gogh|yellow carp)\b/iu;

const GENERIC_AMD_GPU_PATTERN = /^(?:amd\s+)?radeon(?:\(tm\))?\s+graphics$/iu;

// Curated from AMD product specs for APUs that frequently show internal codenames under Linux.
const AMD_RYZEN_GPU_BY_CPU_TOKEN: Record<string, string> = {
  '8945HS': 'AMD Radeon 780M',
  '8845HS': 'AMD Radeon 780M',
  '8840HS': 'AMD Radeon 780M',
  '8840U': 'AMD Radeon 780M',
  '8745HS': 'AMD Radeon 780M',
  '8700G': 'AMD Radeon 780M',
  '8700GE': 'AMD Radeon 780M',
  '7940HS': 'AMD Radeon 780M',
  '7940U': 'AMD Radeon 780M',
  '7840HS': 'AMD Radeon 780M',
  '7840U': 'AMD Radeon 780M',
  '270': 'AMD Radeon 780M',
  '260': 'AMD Radeon 780M',
  '250': 'AMD Radeon 780M',
  '8645HS': 'AMD Radeon 760M',
  '8640HS': 'AMD Radeon 760M',
  '8640U': 'AMD Radeon 760M',
  '8600G': 'AMD Radeon 760M',
  '8600GE': 'AMD Radeon 760M',
  '7640HS': 'AMD Radeon 760M',
  '7640U': 'AMD Radeon 760M',
  '240': 'AMD Radeon 760M',
  '230': 'AMD Radeon 760M',
  '8540U': 'AMD Radeon 740M',
  '8440U': 'AMD Radeon 740M',
  '8500G': 'AMD Radeon 740M',
  '8500GE': 'AMD Radeon 740M',
  '8300G': 'AMD Radeon 740M',
  '8300GE': 'AMD Radeon 740M',
  '7540HS': 'AMD Radeon 740M',
  '7540U': 'AMD Radeon 740M',
  '7440U': 'AMD Radeon 740M',
  '220': 'AMD Radeon 740M',
  '210': 'AMD Radeon 740M',
};

const AMD_RYZEN_AI_GPU_BY_CPU_TOKEN: Record<string, string> = {
  '375': 'AMD Radeon 890M',
  '370': 'AMD Radeon 890M',
  '365': 'AMD Radeon 880M',
  '360': 'AMD Radeon 880M',
  '350': 'AMD Radeon 860M',
  '340': 'AMD Radeon 840M',
};

export function parseLinuxPciGpuModel(line: string): string | null {
  const bracketValues = [...line.matchAll(/\[([^\]]+)\]/g)]
    .map((match) => match[1]?.trim() ?? '')
    .filter(Boolean);

  const preferred = [...bracketValues]
    .reverse()
    .find(
      (value) =>
        !/^[\da-f]{4}$/i.test(value) &&
        !/^[\da-f]{4}:[\da-f]{4}$/i.test(value) &&
        !/^(AMD\/ATI|NVIDIA Corporation|Intel Corporation)$/i.test(value)
    );

  if (preferred) return preferred;

  const [, description = ''] = line.split(/:\s+/, 2);
  const cleaned = description
    .replace(/\s*\([^)]*\)\s*$/u, '')
    .replace(/\s*\[[\da-f]{4}(?::[\da-f]{4})?\]\s*/giu, ' ')
    .replace(
      /^(?:NVIDIA Corporation|Advanced Micro Devices, Inc\. \[AMD\/ATI\]|Advanced Micro Devices, Inc\.|AMD\/ATI|Intel Corporation)\s+/iu,
      ''
    )
    .replace(/\s+/gu, ' ')
    .trim();

  return cleaned || null;
}

export function normalizeLinuxGpuModel({
  cpuModel,
  gpuCount,
  gpuModel,
}: LinuxGpuModelNormalizationInput): string {
  const trimmedGpuModel = gpuModel?.trim();

  if (!trimmedGpuModel) return 'None';
  if (gpuCount !== 1) return trimmedGpuModel;
  if (
    !AMD_APU_CODENAME_PATTERN.test(trimmedGpuModel) &&
    !GENERIC_AMD_GPU_PATTERN.test(trimmedGpuModel)
  ) {
    return trimmedGpuModel;
  }

  return lookupAmdIntegratedGpuFromCpuModel(cpuModel) ?? trimmedGpuModel;
}

export function lookupAmdIntegratedGpuFromCpuModel(cpuModel: string): string | null {
  const normalizedCpuModel = normalizeAmdCpuModel(cpuModel);

  if (!normalizedCpuModel.startsWith('RYZEN')) return null;
  if (normalizedCpuModel.includes('RYZEN AI')) {
    const aiToken = normalizedCpuModel.match(/\b(\d{3})\b/u)?.[1];
    return aiToken ? AMD_RYZEN_AI_GPU_BY_CPU_TOKEN[aiToken] ?? null : null;
  }

  const cpuToken = normalizedCpuModel.match(/\b(\d{4}(?:HS|HX|H|U|GE|G)|\d{3})\b/u)?.[1];
  return cpuToken ? AMD_RYZEN_GPU_BY_CPU_TOKEN[cpuToken] ?? null : null;
}

function normalizeAmdCpuModel(cpuModel: string): string {
  return cpuModel
    .replace(/^AMD\s+/iu, '')
    .replace(/\(TM\)|™|®/giu, '')
    .replace(/\b(?:w\/|with)\s+.+$/iu, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .toUpperCase();
}
