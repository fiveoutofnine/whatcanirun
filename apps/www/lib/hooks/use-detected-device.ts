import { useMemo } from 'react';

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

    if (hw.ram) {
      const ramMatch = candidates.filter((device) => device.ramGb >= hw.ram!);
      if (ramMatch.length > 0) candidates = ramMatch;
      candidates.sort((a, b) => a.ramGb - b.ramGb);
    }

    candidates.sort((a, b) => (b.modelCount ?? 0) - (a.modelCount ?? 0));

    return candidates[0] ?? null;
  }, [devices]);
};

export default useDetectedDevice;
