import { describe, expect, test } from 'bun:test';

import {
  lookupAmdIntegratedGpuFromCpuModel,
  normalizeLinuxGpuModel,
  parseLinuxPciGpuModel,
} from './linux-gpu';

describe('parseLinuxPciGpuModel', () => {
  test('prefers the marketed Radeon name when lspci exposes it in brackets', () => {
    const line =
      '05:00.0 VGA compatible controller [0300]: Advanced Micro Devices, Inc. [AMD/ATI] Phoenix3 [AMD Radeon 780M] [1002:15bf] (rev c5)';

    expect(parseLinuxPciGpuModel(line)).toBe('AMD Radeon 780M');
  });
});

describe('normalizeLinuxGpuModel', () => {
  test('replaces AMD APU codenames with the mapped integrated Radeon name', () => {
    expect(
      normalizeLinuxGpuModel({
        cpuModel: 'AMD Ryzen 9 PRO 8945HS w/ Radeon 780M Graphics',
        gpuCount: 1,
        gpuModel: 'Phoenix3',
      })
    ).toBe('AMD Radeon 780M');
  });

  test('replaces generic AMD integrated GPU labels when the CPU model is in the mapping table', () => {
    expect(
      normalizeLinuxGpuModel({
        cpuModel: 'AMD Ryzen 5 PRO 230 w/ Radeon 760M Graphics',
        gpuCount: 1,
        gpuModel: 'AMD Radeon Graphics',
      })
    ).toBe('AMD Radeon 760M');
  });

  test('does not override multi-GPU systems', () => {
    expect(
      normalizeLinuxGpuModel({
        cpuModel: 'AMD Ryzen 9 PRO 8945HS w/ Radeon 780M Graphics',
        gpuCount: 2,
        gpuModel: 'Phoenix3',
      })
    ).toBe('Phoenix3');
  });

  test('keeps the raw GPU model when the AMD CPU is not in the mapping table', () => {
    expect(
      normalizeLinuxGpuModel({
        cpuModel: 'AMD Ryzen 7 5800H with Radeon Graphics',
        gpuCount: 1,
        gpuModel: 'AMD Radeon Graphics',
      })
    ).toBe('AMD Radeon Graphics');
  });
});

describe('lookupAmdIntegratedGpuFromCpuModel', () => {
  test('maps Ryzen PRO 200-series CPUs to the correct marketed iGPU', () => {
    expect(lookupAmdIntegratedGpuFromCpuModel('AMD Ryzen 7 PRO 250 w/ Radeon 780M Graphics')).toBe(
      'AMD Radeon 780M'
    );
    expect(lookupAmdIntegratedGpuFromCpuModel('AMD Ryzen 5 PRO 230 w/ Radeon 760M Graphics')).toBe(
      'AMD Radeon 760M'
    );
  });

  test('maps Ryzen AI CPUs separately from classic Ryzen numbering', () => {
    expect(lookupAmdIntegratedGpuFromCpuModel('AMD Ryzen AI 7 350 with Radeon 860M')).toBe(
      'AMD Radeon 860M'
    );
  });
});
