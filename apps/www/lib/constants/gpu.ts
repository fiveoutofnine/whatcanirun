// -----------------------------------------------------------------------------
// GPU VRAM lookup (GB)
// -----------------------------------------------------------------------------

export const GPU_VRAM: Record<string, number> = {
  // NVIDIA Blackwell
  b200: 192,
  b100: 192,
  gb200: 192,
  gb300: 288,
  // NVIDIA GeForce RTX 50-series (desktop)
  'geforce rtx 5090': 32,
  'geforce rtx 5080': 16,
  'geforce rtx 5070 ti': 16,
  'geforce rtx 5070': 12,
  'geforce rtx 5060 ti': 16,
  // NVIDIA GeForce RTX 50-series (laptop)
  'geforce rtx 5090 laptop gpu': 24,
  'geforce rtx 5080 laptop gpu': 16,
  'geforce rtx 5070 ti laptop gpu': 12,
  'geforce rtx 5070 laptop gpu': 8,
  // NVIDIA GeForce RTX 40-series (desktop)
  'geforce rtx 4090': 24,
  'geforce rtx 4080 super': 16,
  'geforce rtx 4080': 16,
  'geforce rtx 4070 ti super': 16,
  'geforce rtx 4070 ti': 12,
  'geforce rtx 4070 super': 12,
  'geforce rtx 4070': 12,
  'geforce rtx 4060 ti': 8,
  'geforce rtx 4060': 8,
  // NVIDIA GeForce RTX 40-series (laptop)
  'geforce rtx 4090 laptop gpu': 16,
  'geforce rtx 4080 laptop gpu': 12,
  'geforce rtx 4070 laptop gpu': 8,
  'geforce rtx 4060 laptop gpu': 8,
  'geforce rtx 4050 laptop gpu': 6,
  // NVIDIA GeForce RTX 30-series (desktop)
  'geforce rtx 3090 ti': 24,
  'geforce rtx 3090': 24,
  'geforce rtx 3080 ti': 12,
  'geforce rtx 3080': 10,
  'geforce rtx 3070 ti': 8,
  'geforce rtx 3070': 8,
  'geforce rtx 3060 ti': 8,
  'geforce rtx 3060': 12,
  // NVIDIA GeForce RTX 30-series (laptop)
  'geforce rtx 3080 ti laptop gpu': 16,
  'geforce rtx 3080 laptop gpu': 8,
  'geforce rtx 3070 ti laptop gpu': 8,
  'geforce rtx 3070 laptop gpu': 8,
  'geforce rtx 3060 laptop gpu': 6,
  'geforce rtx 3050 ti laptop gpu': 4,
  'geforce rtx 3050 laptop gpu': 4,
  // NVIDIA GeForce RTX 20-series (desktop)
  'geforce rtx 2080 ti': 11,
  'geforce rtx 2080 super': 8,
  'geforce rtx 2080': 8,
  'geforce rtx 2070 super': 8,
  'geforce rtx 2070': 8,
  'geforce rtx 2060 super': 8,
  'geforce rtx 2060': 6,
  // NVIDIA GeForce GTX 16-series (laptop)
  'geforce gtx 1650 ti with max-q design': 4,
  // NVIDIA A-series (data center)
  'a100 80gb': 80,
  a100: 40,
  'a800 80gb': 80,
  a800: 40,
  a40: 48,
  a30: 24,
  a16: 16,
  a10g: 24,
  a10: 24,
  a2: 16,
  // NVIDIA professional (RTX)
  'rtx a6000': 48,
  'rtx a5500': 24,
  'rtx a5000': 24,
  'rtx a4500': 20,
  'rtx a4000': 16,
  'rtx a2000': 6,
  'rtx 6000 ada': 48,
  'rtx 5880 ada': 48,
  'rtx 5000 ada': 32,
  'rtx 4500 ada': 24,
  'rtx 4000 ada': 20,
  'rtx 4000 sff ada': 20,
  'rtx 2000 ada': 16,
  // NVIDIA professional (RTX PRO Blackwell)
  'rtx pro 6000': 96,
  'rtx pro 5000': 48,
  'rtx pro 4500': 32,
  'rtx pro 4000': 24,
  'rtx pro 2000': 16,
  // NVIDIA H-series (data center)
  'h100 80gb': 80,
  h100: 80,
  h200: 141,
  h800: 80,
  // NVIDIA L-series (data center)
  l40s: 48,
  l40: 48,
  l4: 24,
  // AMD Radeon RX 7000-series
  'radeon rx 7900 xtx': 24,
  'radeon rx 7900 xt': 20,
  'radeon rx 7900 gre': 16,
  'radeon rx 7800 xt': 16,
  'radeon rx 7700 xt': 12,
  'radeon rx 7600 xt': 16,
  'radeon rx 7600': 8,
  // AMD Radeon RX 6000-series
  'radeon rx 6950 xt': 16,
  'radeon rx 6900 xt': 16,
  'radeon rx 6800 xt': 16,
  'radeon rx 6800': 16,
  'radeon rx 6700 xt': 12,
  'radeon rx 6600 xt': 8,
  'radeon rx 6600': 8,
};

// Pre-sort keys by length (longest first) so "4080 super" matches before "4080".
const GPU_VRAM_ENTRIES = Object.entries(GPU_VRAM).sort((a, b) => b[0].length - a[0].length);

/** Look up VRAM by matching the GPU name (case-insensitive, longest match first). */
export function getVramGb(gpu: string): number | null {
  const lower = gpu.toLowerCase();
  for (const [key, vram] of GPU_VRAM_ENTRIES) {
    if (lower.includes(key)) return vram;
  }
  return null;
}

// -----------------------------------------------------------------------------
// GPU series ranking (higher = more powerful series)
// -----------------------------------------------------------------------------

const GPU_SERIES: [RegExp, number][] = [
  // NVIDIA data center (newest first)
  [/\b(b\d|gb\d)/i, 20], // Blackwell (B200, GB200, GB300)
  [/\bh\d/i, 19], // Hopper (H100, H200, H800)
  [/\bl\d/i, 18], // Lovelace DC (L40S, L40, L4)
  [/\ba\d/i, 17], // Ampere DC (A100, A40, etc.)
  // NVIDIA professional
  [/rtx pro/i, 16], // RTX PRO Blackwell
  [/rtx \d+.*ada/i, 15], // RTX Ada generation
  [/rtx a\d/i, 14], // RTX Ampere professional
  // NVIDIA GeForce desktop
  [/geforce rtx 50\d{2}(?!.*laptop)/i, 13],
  [/geforce rtx 40\d{2}(?!.*laptop)/i, 11],
  [/geforce rtx 30\d{2}(?!.*laptop)/i, 9],
  [/geforce rtx 20\d{2}(?!.*laptop)/i, 7],
  // NVIDIA GeForce laptop (one rank below desktop counterpart)
  [/geforce rtx 50\d{2}.*laptop/i, 12],
  [/geforce rtx 40\d{2}.*laptop/i, 10],
  [/geforce rtx 30\d{2}.*laptop/i, 8],
  // AMD Radeon
  [/radeon rx 7\d/i, 6],
  [/radeon rx 6\d/i, 5],
];

/** Get a series rank for a GPU (higher = more powerful series). */
export function getGpuSeriesRank(gpu: string): number {
  for (const [pattern, rank] of GPU_SERIES) {
    if (pattern.test(gpu)) return rank;
  }
  return 0;
}

// -----------------------------------------------------------------------------
// Manufacturer labels
// -----------------------------------------------------------------------------

export const MANUFACTURER_LABEL: Record<string, string> = {
  nvidia: 'NVIDIA',
  amd: 'AMD',
  intel: 'Intel',
  apple: 'Apple',
};
