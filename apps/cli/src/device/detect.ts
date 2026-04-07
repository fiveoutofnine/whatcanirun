import chalk from 'chalk';

import { warn } from '../utils/log';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface DeviceInfo {
  cpu_model: string;
  cpu_cores: number;
  gpu_model: string;
  gpu_cores: number;
  gpu_count: number;
  ram_gb: number;
  os_name: string;
  os_version: string;
  hostname: string;
}

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------

export function formatSysinfo(device: DeviceInfo): string {
  const gpuPrefix = device.gpu_count > 1 ? `${device.gpu_count}x ` : '';
  const lines = [
    `uname: ${process.platform} ${process.arch}`,
    `cpu: ${device.cpu_model} (${device.cpu_cores} cores)`,
    `gpu: ${gpuPrefix}${device.gpu_model} (${device.gpu_cores} cores)`,
    `ram: ${device.ram_gb} GB`,
    `os: ${device.os_name} ${device.os_version}`,
    `hostname: ${device.hostname}`,
  ];
  return lines.join('\n');
}

const SUPPORTED_TARGETS: ReadonlyArray<{ platform: string; arch: string }> = [
  { platform: 'darwin', arch: 'arm64' },
  { platform: 'linux', arch: 'x64' },
];

export async function detectDevice(): Promise<DeviceInfo> {
  const { platform, arch } = process;
  const supported = SUPPORTED_TARGETS.some((t) => t.platform === platform && t.arch === arch);
  if (!supported) {
    throw new Error(`Unsupported platform: ${chalk.cyan(`${platform}${chalk.dim('/')}${arch}`)}.`);
  }

  const device = platform === 'darwin' ? await detectMacOS() : await detectLinux();
  if (
    !device.cpu_model ||
    !device.gpu_model ||
    !device.ram_gb ||
    device.cpu_model === 'Unknown' ||
    device.gpu_model === 'Unknown' ||
    device.cpu_model === 'None' ||
    device.gpu_model === 'None'
  ) {
    throw new Error('Could not identify device. Ensure system profiling tools are available.');
  }
  return device;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

async function exec(cmd: string[], options?: { quietMissing?: boolean }): Promise<string> {
  try {
    const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' });
    const text = await new Response(proc.stdout).text();
    const code = await proc.exited;
    if (code !== 0) {
      warn(`${chalk.bold.cyan(cmd.join(' '))} exited with code ${code}.`);
      return '';
    }
    return text.trim();
  } catch (e: unknown) {
    if (e instanceof Error && 'code' in e && (e as NodeJS.ErrnoException).code === 'ENOENT') {
      if (!options?.quietMissing) {
        warn(`Command not found: ${chalk.bold.cyan(cmd[0]!)}.`);
      }
    } else {
      warn(
        `${chalk.bold.cyan(cmd.join(' '))} failed: ${e instanceof Error ? e.message : String(e)}`
      );
    }
    return '';
  }
}

async function detectMacOS(): Promise<DeviceInfo> {
  const [cpu, cpuCores, memBytes, osVersion, hostname, gpuRaw] = await Promise.all([
    exec(['sysctl', '-n', 'machdep.cpu.brand_string']),
    exec(['sysctl', '-n', 'hw.ncpu']),
    exec(['sysctl', '-n', 'hw.memsize']),
    exec(['sw_vers', '-productVersion']),
    exec(['hostname']),
    exec(['system_profiler', 'SPDisplaysDataType', '-detailLevel', 'mini']),
  ]);

  let gpu = 'Unknown';
  let gpuCores = 0;
  const chipMatch = gpuRaw.match(/Chipset Model:\s*(.+)/);
  if (chipMatch) {
    gpu = chipMatch[1]!.trim();
  }
  const coresMatch = gpuRaw.match(/Total Number of Cores:\s*(\d+)/);
  if (coresMatch) {
    gpuCores = parseInt(coresMatch[1]!, 10);
  }

  return {
    cpu_model: cpu || 'Unknown',
    cpu_cores: parseInt(cpuCores || '0', 10),
    gpu_model: gpu,
    gpu_cores: gpuCores,
    gpu_count: 1,
    ram_gb: Math.round(parseInt(memBytes || '0', 10) / 1024 / 1024 / 1024),
    os_name: 'macOS',
    os_version: osVersion || 'Unknown',
    hostname: hostname || 'Unknown',
  };
}

async function detectLinux(): Promise<DeviceInfo> {
  const [cpuinfo, meminfo, osRelease, hostname, gpu] = await Promise.all([
    exec(['cat', '/proc/cpuinfo']),
    exec(['cat', '/proc/meminfo']),
    exec(['cat', '/etc/os-release']),
    exec(['hostname']),
    detectLinuxGpuInfo(),
  ]);

  const cpuMatch = cpuinfo.match(/model name\s*:\s*(.+)/);
  const memMatch = meminfo.match(/MemTotal:\s*(\d+)/);
  const osNameMatch = osRelease.match(/PRETTY_NAME="(.+)"/);
  const osVersionMatch = osRelease.match(/VERSION_ID="(.+)"/);

  // Count unique processor entries for CPU core count.
  const cpuCores = (cpuinfo.match(/^processor\s*:/gm) || []).length;

  return {
    cpu_model: cpuMatch?.[1]?.trim() || 'Unknown',
    cpu_cores: cpuCores,
    gpu_model: gpu.model?.trim() || 'None',
    gpu_cores: gpu.cores,
    gpu_count: gpu.count,
    ram_gb: Math.round(parseInt(memMatch?.[1] || '0', 10) / 1024 / 1024),
    os_name: osNameMatch?.[1] || 'Linux',
    os_version: osVersionMatch?.[1] || 'Unknown',
    hostname: hostname || 'Unknown',
  };
}

type LinuxGpuInfo = {
  model?: string;
  cores: number;
  count: number;
};

async function detectLinuxGpuInfo(): Promise<LinuxGpuInfo> {
  const nvidia = await detectLinuxNvidiaGpuInfo();
  if (nvidia) return nvidia;

  const pci = await detectLinuxPciGpuInfo();
  if (pci) return pci;

  return { model: 'None', cores: 0, count: 0 };
}

async function detectLinuxNvidiaGpuInfo(): Promise<LinuxGpuInfo | null> {
  const [namesRaw, coresRaw, countRaw] = await Promise.all([
    exec(['nvidia-smi', '--query-gpu=name', '--format=csv,noheader'], { quietMissing: true }),
    exec(['nvidia-smi', '--query-gpu=cuda_cores', '--format=csv,noheader'], { quietMissing: true }),
    exec(['nvidia-smi', '--query-gpu=count', '--format=csv,noheader'], { quietMissing: true }),
  ]);

  const names = namesRaw
    .split('\n')
    .map((name) => name.trim())
    .filter(Boolean);

  if (names.length === 0) return null;

  const cores = parseInt(coresRaw?.split('\n')[0] || '0', 10);
  const count = parseInt(countRaw?.split('\n')[0] || '0', 10) || names.length;
  return {
    model: names[0]?.trim(),
    cores,
    count,
  };
}

async function detectLinuxPciGpuInfo(): Promise<LinuxGpuInfo | null> {
  const lspci = await exec(['lspci', '-nn']);
  if (!lspci) return null;

  const controllers = lspci
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) =>
        /(?:VGA compatible controller|3D controller|Display controller)/i.test(line) &&
        !/ASPEED/i.test(line)
    );

  if (controllers.length === 0) return null;

  const model = parseLinuxPciGpuModel(controllers[0]!);
  if (!model) return null;

  return {
    model,
    cores: 0,
    count: controllers.length,
  };
}

function parseLinuxPciGpuModel(line: string): string | null {
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
