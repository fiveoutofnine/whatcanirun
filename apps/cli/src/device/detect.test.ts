import { afterEach, describe, expect, test } from 'bun:test';

import { detectDevice } from './detect';

type SpawnResponse = {
  code?: number;
  stderr?: string;
  stdout?: string;
};

const originalPlatform = process.platform;
const originalArch = process.arch;
const originalSpawn = Bun.spawn;

function toStream(text: string): NonNullable<Response['body']> {
  return new Response(text).body as NonNullable<Response['body']>;
}

function setProcessTarget(platform: NodeJS.Platform, arch: string) {
  Object.defineProperty(process, 'platform', { value: platform });
  Object.defineProperty(process, 'arch', { value: arch });
}

function mockSpawn(responses: Record<string, SpawnResponse>) {
  Bun.spawn = ((cmd: string[]) => {
    const key = cmd.join(' ');
    const response = responses[key];
    if (!response) {
      const error = new Error(`Command not found: ${key}`) as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      throw error;
    }

    return {
      exited: Promise.resolve(response.code ?? 0),
      stderr: toStream(response.stderr ?? ''),
      stdout: toStream(response.stdout ?? ''),
    } as unknown as ReturnType<typeof Bun.spawn>;
  }) as typeof Bun.spawn;
}

afterEach(() => {
  setProcessTarget(originalPlatform, originalArch);
  Bun.spawn = originalSpawn;
});

describe('detectDevice', () => {
  test('detects AMD GPUs on Linux without nvidia-smi', async () => {
    setProcessTarget('linux', 'x64');

    mockSpawn({
      'cat /proc/cpuinfo': {
        stdout: [
          'processor\t: 0',
          'model name\t: AMD Ryzen 9 7950X3D 16-Core Processor',
          'processor\t: 1',
        ].join('\n'),
      },
      'cat /proc/meminfo': {
        stdout: 'MemTotal:       66060288 kB',
      },
      'cat /etc/os-release': {
        stdout: 'PRETTY_NAME="Ubuntu 24.04.2 LTS"\nVERSION_ID="24.04"',
      },
      hostname: {
        stdout: 'phoenix',
      },
      'lspci -nn': {
        stdout:
          '03:00.0 VGA compatible controller [0300]: Advanced Micro Devices, Inc. [AMD/ATI] Navi 31 [Radeon RX 7900 XTX] [1002:744c] (rev c8)',
      },
    });

    await expect(detectDevice()).resolves.toEqual({
      cpu_cores: 2,
      cpu_model: 'AMD Ryzen 9 7950X3D 16-Core Processor',
      gpu_cores: 0,
      gpu_count: 1,
      gpu_model: 'Radeon RX 7900 XTX',
      hostname: 'phoenix',
      os_name: 'Ubuntu 24.04.2 LTS',
      os_version: '24.04',
      ram_gb: 63,
    });
  });

  test('keeps NVIDIA detection on Linux when nvidia-smi is available', async () => {
    setProcessTarget('linux', 'x64');

    mockSpawn({
      'cat /proc/cpuinfo': {
        stdout: ['processor\t: 0', 'model name\t: Intel(R) Xeon(R) CPU', 'processor\t: 1'].join(
          '\n'
        ),
      },
      'cat /proc/meminfo': {
        stdout: 'MemTotal:       33554432 kB',
      },
      'cat /etc/os-release': {
        stdout: 'PRETTY_NAME="Ubuntu 22.04.5 LTS"\nVERSION_ID="22.04"',
      },
      hostname: {
        stdout: 'hopper',
      },
      'nvidia-smi --query-gpu=name --format=csv,noheader': {
        stdout: 'NVIDIA H100 80GB HBM3\n',
      },
      'nvidia-smi --query-gpu=count --format=csv,noheader': {
        stdout: '1\n',
      },
    });

    await expect(detectDevice()).resolves.toEqual({
      cpu_cores: 2,
      cpu_model: 'Intel(R) Xeon(R) CPU',
      gpu_cores: 0,
      gpu_count: 1,
      gpu_model: 'NVIDIA H100 80GB HBM3',
      hostname: 'hopper',
      os_name: 'Ubuntu 22.04.5 LTS',
      os_version: '22.04',
      ram_gb: 32,
    });
  });
});
