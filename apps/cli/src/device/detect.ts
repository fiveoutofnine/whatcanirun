// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface DeviceInfo {
  cpu_model: string;
  gpu_model: string;
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
    `cpu: ${device.cpu_model}`,
    `gpu: ${device.gpu_model}`,
    `ram: ${device.ram_gb} GB`,
    `os: ${device.os_name} ${device.os_version}`,
    `hostname: ${device.hostname}`,
  ];
  return lines.join('\n');
}

export async function detectDevice(): Promise<DeviceInfo> {
  if (process.platform === 'darwin') return detectMacOS();
  if (process.platform === 'linux') return detectLinux();
  throw new Error(`Unsupported platform: ${process.platform}`);
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
      console.warn(`Warning: \`${cmd.join(' ')}\` exited with code ${code}`);
      return '';
    }
    return text.trim();
  } catch (e: unknown) {
    if (e instanceof Error && 'code' in e && (e as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn(`Warning: command not found: ${cmd[0]}`);
    } else {
      console.warn(
        `Warning: \`${cmd.join(' ')}\` failed: ${e instanceof Error ? e.message : String(e)}`
      );
    }
    return '';
  }
}

async function detectMacOS(): Promise<DeviceInfo> {
  const [cpu, memBytes, osVersion, hostname, gpuRaw] = await Promise.all([
    exec(['sysctl', '-n', 'machdep.cpu.brand_string']),
    exec(['sysctl', '-n', 'hw.memsize']),
    exec(['sw_vers', '-productVersion']),
    exec(['hostname']),
    exec(['system_profiler', 'SPDisplaysDataType', '-detailLevel', 'mini']),
  ]);

  let gpu = 'Unknown';
  const chipMatch = gpuRaw.match(/Chipset Model:\s*(.+)/);
  if (chipMatch) {
    gpu = chipMatch[1]!.trim();
  }

  return {
    cpu_model: cpu || 'Unknown',
    gpu_model: gpu,
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
    exec(['nvidia-smi', '--query-gpu=name', '--format=csv,noheader']),
  ]);

  const cpuMatch = cpuinfo.match(/model name\s*:\s*(.+)/);
  const memMatch = meminfo.match(/MemTotal:\s*(\d+)/);
  const osNameMatch = osRelease.match(/PRETTY_NAME="(.+)"/);
  const osVersionMatch = osRelease.match(/VERSION_ID="(.+)"/);

  return {
    cpu_model: cpuMatch?.[1]?.trim() || 'Unknown',
    gpu_model: gpu?.split('\n')[0]?.trim() || 'None',
    ram_gb: Math.round(parseInt(memMatch?.[1] || '0', 10) / 1024 / 1024),
    os_name: osNameMatch?.[1] || 'Linux',
    os_version: osVersionMatch?.[1] || 'Unknown',
    hostname: hostname || 'Unknown',
  };
}
