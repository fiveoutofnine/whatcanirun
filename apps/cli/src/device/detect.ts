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
  ram_gb: number;
  os_name: string;
  os_version: string;
  hostname: string;
}

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------

export function formatSysinfo(device: DeviceInfo): string {
  const lines = [
    `uname: ${process.platform} ${process.arch}`,
    `cpu: ${device.cpu_model} (${device.cpu_cores} cores)`,
    `gpu: ${device.gpu_model} (${device.gpu_cores} cores)`,
    `ram: ${device.ram_gb} GB`,
    `os: ${device.os_name} ${device.os_version}`,
    `hostname: ${device.hostname}`,
  ];
  return lines.join('\n');
}

export async function detectDevice(): Promise<DeviceInfo> {
  if (process.platform === 'darwin') return detectMacOS();
  if (process.platform === 'linux') return detectLinux();
  throw new Error(`Unsupported platform: ${chalk.cyan(process.platform)}.`);
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

async function exec(cmd: string[]): Promise<string> {
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
      warn(`Command not found: ${chalk.bold.cyan(cmd[0]!)}.`);
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
    ram_gb: Math.round(parseInt(memBytes || '0', 10) / 1024 / 1024 / 1024),
    os_name: 'macOS',
    os_version: osVersion || 'Unknown',
    hostname: hostname || 'Unknown',
  };
}

async function detectLinux(): Promise<DeviceInfo> {
  const [cpuinfo, meminfo, osRelease, hostname, gpu, gpuCoresRaw] = await Promise.all([
    exec(['cat', '/proc/cpuinfo']),
    exec(['cat', '/proc/meminfo']),
    exec(['cat', '/etc/os-release']),
    exec(['hostname']),
    exec(['nvidia-smi', '--query-gpu=name', '--format=csv,noheader']),
    exec(['nvidia-smi', '--query-gpu=count', '--format=csv,noheader']),
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
    gpu_model: gpu?.split('\n')[0]?.trim() || 'None',
    gpu_cores: parseInt(gpuCoresRaw || '0', 10),
    ram_gb: Math.round(parseInt(memMatch?.[1] || '0', 10) / 1024 / 1024),
    os_name: osNameMatch?.[1] || 'Linux',
    os_version: osVersionMatch?.[1] || 'Unknown',
    hostname: hostname || 'Unknown',
  };
}
