import { useMemo } from 'react';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const APPLE_CAPPED_DEVICE_MEMORY_FLOOR_GB = 32;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type DetectableDevice = {
  chipId: string;
  cpuCores: number;
  gpu: string;
  ramGb: number;
  modelCount?: number;
};

type DetectedHardware = {
  cores: number | null;
  gpu: string | null;
  ram: number | null;
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const detectHardware = (): DetectedHardware => {
  let gpu: string | null = null;

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');

    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');

      if (ext) {
        const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
        const match = renderer.match(/:\s*(.+?),\s*(?:Unspecified|Version)/);
        gpu = match?.[1]?.trim() ?? renderer;
      }
    }
  } catch {
    /* noop */
  }

  return {
    cores: navigator.hardwareConcurrency || null,
    gpu,
    ram: (navigator as Navigator & { deviceMemory?: number }).deviceMemory || null,
  };
};

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

const useDetectedDevice = <T extends DetectableDevice>(devices: T[]) => {
  return useMemo(() => {
    if (typeof window === 'undefined') return null;

    const hw = detectHardware();

    if (!hw.gpu) return null;

    let candidates = devices.filter((device) =>
      hw.gpu!.toLowerCase().includes(device.gpu.toLowerCase()),
    );

    if (candidates.length === 0) return null;

    if (hw.cores) {
      const coreMatch = candidates.filter((device) => device.cpuCores === hw.cores);
      if (coreMatch.length > 0) candidates = coreMatch;
    }

    const reportedRam = hw.ram;

    if (reportedRam) {
      const ramMatch = candidates.filter((device) => device.ramGb >= reportedRam);
      if (ramMatch.length > 0) candidates = ramMatch;
    }

    const ramValues = candidates.map((device) => device.ramGb);
    const minCandidateRam = Math.min(...ramValues);
    const maxCandidateRam = Math.max(...ramValues);
    const isAppleDeviceMatch = candidates.every((device) =>
      device.gpu.toLowerCase().startsWith('apple'),
    );
    const cappedAppleRamTarget =
      isAppleDeviceMatch &&
      reportedRam &&
      reportedRam >= APPLE_CAPPED_DEVICE_MEMORY_FLOOR_GB &&
      maxCandidateRam > reportedRam
        ? Math.min(reportedRam * 2, maxCandidateRam)
        : null;
    const preferLargestAppleRam =
      isAppleDeviceMatch && maxCandidateRam > minCandidateRam && !reportedRam;

    candidates.sort((a, b) => {
      if (cappedAppleRamTarget && a.ramGb !== b.ramGb) {
        const aDelta = Math.abs(a.ramGb - cappedAppleRamTarget);
        const bDelta = Math.abs(b.ramGb - cappedAppleRamTarget);
        if (aDelta !== bDelta) return aDelta - bDelta;
        return a.ramGb - b.ramGb;
      }
      if (preferLargestAppleRam && a.ramGb !== b.ramGb) return b.ramGb - a.ramGb;
      if (reportedRam && a.ramGb !== b.ramGb) return a.ramGb - b.ramGb;
      return (b.modelCount ?? 0) - (a.modelCount ?? 0);
    });

    return candidates[0] ?? null;
  }, [devices]);
};

export default useDetectedDevice;
