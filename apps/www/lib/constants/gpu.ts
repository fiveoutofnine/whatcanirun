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
