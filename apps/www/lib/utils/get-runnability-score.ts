/** Compute a composite runnability score (0–1) from decode, prefill, and memory metrics. */
const getRunnabilityScore = ({
  decodeTpsMean,
  prefillTpsMean,
  peakRssMb,
  ramGb,
  fileSizeBytes,
  runtimeName,
  harnessVersion,
  osName,
}: {
  decodeTpsMean: number;
  prefillTpsMean: number | null;
  peakRssMb: number | null;
  ramGb: number;
  fileSizeBytes: number | null;
  runtimeName: string;
  harnessVersion: string;
  osName: string;
}): number | null => {
  if (prefillTpsMean == null) return null;

  const normalizeDecode = (v: number) => {
    if (v >= 100) return 1;
    if (v >= 40) return 0.8 + (0.2 * (v - 40)) / 60;
    if (v >= 20) return 0.6 + (0.2 * (v - 20)) / 20;
    if (v >= 10) return 0.4 + (0.2 * (v - 10)) / 10;
    if (v >= 5) return 0.2 + (0.2 * (v - 5)) / 5;
    return (0.2 * v) / 5;
  };
  const normalizePrefill = (v: number) => {
    if (v >= 4000) return 1;
    if (v >= 2000) return 0.8 + (0.2 * (v - 2000)) / 2000;
    if (v >= 1000) return 0.6 + (0.2 * (v - 1000)) / 1000;
    if (v >= 500) return 0.4 + (0.2 * (v - 500)) / 500;
    if (v >= 200) return 0.2 + (0.2 * (v - 200)) / 300;
    return (0.2 * v) / 200;
  };

  const decodeScore = normalizeDecode(decodeTpsMean);
  const prefillScore = normalizePrefill(prefillTpsMean);

  const unreliableMemory =
    (runtimeName === 'llama.cpp' && harnessVersion.localeCompare('0.1.16') <= 0) ||
    (osName.toLowerCase() !== 'macos' && harnessVersion.localeCompare('0.1.19') < 0);
  if (unreliableMemory) return 0.65 * decodeScore + 0.35 * prefillScore;

  const estimatedPeakRssMb = (fileSizeBytes || 0) / (1024 * 1024) + 512;
  const effectivePeakRssMb = peakRssMb || estimatedPeakRssMb;
  const memoryScore = Math.max(0, 1 - effectivePeakRssMb / (ramGb * 716.8));

  return 0.45 * decodeScore + 0.25 * prefillScore + 0.3 * memoryScore;
};

export default getRunnabilityScore;
