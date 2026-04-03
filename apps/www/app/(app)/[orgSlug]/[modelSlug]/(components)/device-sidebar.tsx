'use client';

import { useEffect, useMemo } from 'react';

import { ChevronDown } from 'lucide-react';
import { useQueryState } from 'nuqs';

import DeviceCombobox from '@/components/templates/device-combobox';
import { Button } from '@/components/ui';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ChipOption = {
  chipId: string;
  cpu: string;
  cpuCores: number;
  gpu: string;
  gpuCores: number;
  ramGb: number;
  modelCount: number;
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const detectHardware = () => {
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

  const cores = navigator.hardwareConcurrency || null;
  const ram = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || null;

  return { gpu, cores, ram };
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const DeviceSidebar: React.FC<{ chips: ChipOption[] }> = ({ chips }) => {
  const defaultDevice = useMemo(() => {
    const sorted = [...chips].sort((a, b) => b.modelCount - a.modelCount);
    return sorted[0]?.chipId ?? '';
  }, [chips]);

  const [device, setDevice] = useQueryState('device', {
    defaultValue: defaultDevice,
    shallow: false,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('device')) return;

    const hw = detectHardware();
    if (!hw.gpu) return;

    let candidates = chips.filter((c) => hw.gpu!.toLowerCase().includes(c.gpu.toLowerCase()));
    if (candidates.length === 0) return;

    if (hw.cores) {
      const coreMatch = candidates.filter((c) => c.cpuCores === hw.cores);
      if (coreMatch.length > 0) candidates = coreMatch;
    }

    if (hw.ram) {
      const ramMatch = candidates.filter((c) => c.ramGb >= hw.ram!);
      if (ramMatch.length > 0) candidates = ramMatch;
      candidates.sort((a, b) => a.ramGb - b.ramGb);
    }

    candidates.sort((a, b) => b.modelCount - a.modelCount);
    setDevice(candidates[0].chipId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(
    () => chips.find((c) => c.chipId === device) ?? chips[0],
    [chips, device],
  );

  const isApple = selected?.gpu.toLowerCase().startsWith('apple');

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-gray-12">Device</span>
      <DeviceCombobox devices={chips} value={device} onSelect={setDevice}>
        <Button variant="outline" size="sm" className="w-full justify-between">
          <span className="line-clamp-1 text-left">
            {selected ? `${selected.gpu} (${selected.ramGb} GB)` : 'Select device'}
          </span>
          <ChevronDown className="ml-1 size-3.5 shrink-0 text-gray-11" />
        </Button>
      </DeviceCombobox>
      {selected ? (
        <div className="flex flex-col gap-0.5 text-xs text-gray-11">
          {isApple ? (
            <>
              <span>
                {selected.cpuCores}-core CPU / {selected.gpuCores}-core GPU
              </span>
              <span>{selected.ramGb} GB unified memory</span>
            </>
          ) : (
            <>
              <span>
                {selected.cpu} ({selected.cpuCores} cores)
              </span>
              {selected.gpuCores > 0 ? (
                <span>
                  {selected.gpu} ({selected.gpuCores} cores)
                </span>
              ) : null}
              <span>{selected.ramGb} GB RAM</span>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default DeviceSidebar;
