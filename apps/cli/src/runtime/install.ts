import { APP_DIR_NAME } from '@whatcanirun/shared';
import chalk from 'chalk';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';

const APP_HOME = join(homedir(), APP_DIR_NAME);
const RUNTIMES_DIR = join(APP_HOME, 'runtimes');
const MANAGED_LLAMA_CPP_DIR = join(RUNTIMES_DIR, 'llama.cpp');
const MANAGED_LLAMA_CPP_SRC_DIR = join(MANAGED_LLAMA_CPP_DIR, 'src');
const MANAGED_LLAMA_CPP_BUILD_DIR = join(MANAGED_LLAMA_CPP_DIR, 'build');
const MANAGED_LLAMA_CPP_BIN_DIR = join(MANAGED_LLAMA_CPP_BUILD_DIR, 'bin');

const BUILD_SYSTEM_PACKAGES = {
  apt: [
    'build-essential',
    'ca-certificates',
    'cmake',
    'git',
    'pkg-config',
    'python3',
    'unzip',
    'zip',
  ],
  dnf: [
    'ca-certificates',
    'cmake',
    'gcc',
    'gcc-c++',
    'git',
    'make',
    'pkgconf-pkg-config',
    'python3',
    'unzip',
    'zip',
  ],
  yum: [
    'ca-certificates',
    'cmake',
    'gcc',
    'gcc-c++',
    'git',
    'make',
    'pkgconfig',
    'python3',
    'unzip',
    'zip',
  ],
  pacman: [
    'base-devel',
    'ca-certificates',
    'cmake',
    'git',
    'pkgconf',
    'python',
    'unzip',
    'zip',
  ],
} as const;

type PackageManager = keyof typeof BUILD_SYSTEM_PACKAGES;
type NvidiaArchHint = { arch: string; patterns: RegExp[] };

interface CommandResult {
  code: number;
  stderr: string;
  stdout: string;
}

const NVIDIA_ARCH_HINTS: NvidiaArchHint[] = [
  { arch: '120', patterns: [/rtx 5090/i, /rtx 5080/i, /rtx 5070/i] },
  { arch: '90', patterns: [/h100/i, /h200/i, /gh200/i] },
  { arch: '89', patterns: [/rtx 4090/i, /rtx 4080/i, /rtx 4070/i, /rtx 4060/i, /l4/i, /l40/i] },
  { arch: '86', patterns: [/rtx 3090/i, /rtx 3080/i, /rtx 3070/i, /rtx 3060/i, /a10/i, /a16/i, /a40/i] },
  { arch: '80', patterns: [/a100/i, /a30/i] },
  { arch: '75', patterns: [/t4/i] },
];

function getEnvWithPath(extra?: Record<string, string>): Record<string, string> {
  return { ...process.env, ...extra };
}

async function runCommand(
  cmd: string[],
  opts?: {
    cwd?: string;
    env?: Record<string, string>;
  }
): Promise<CommandResult> {
  const proc = Bun.spawn(cmd, {
    cwd: opts?.cwd,
    env: getEnvWithPath(opts?.env),
    stderr: 'pipe',
    stdout: 'pipe',
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, stdout: stdout.trim(), stderr: stderr.trim() };
}

function getFailureText(result: CommandResult): string {
  return result.stderr || result.stdout || `exit code ${result.code}`;
}

function findCommand(binary: string): string | null {
  const paths = (process.env.PATH || '').split(delimiter);
  for (const base of paths) {
    if (!base) continue;
    const candidate = join(base, binary);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function needsPrivilegeEscalation(): boolean {
  return typeof process.getuid === 'function' && process.getuid() !== 0;
}

function withPrivileges(cmd: string[]): string[] {
  if (!needsPrivilegeEscalation()) return cmd;
  if (!findCommand('sudo')) {
    throw new Error(
      `Installing system packages requires ${chalk.cyan('sudo')} or a root shell on this host.`
    );
  }
  return ['sudo', ...cmd];
}

function detectPackageManager(): PackageManager | null {
  if (findCommand('apt-get')) return 'apt';
  if (findCommand('dnf')) return 'dnf';
  if (findCommand('yum')) return 'yum';
  if (findCommand('pacman')) return 'pacman';
  return null;
}

function inferCudaArchitectureFromGpuNames(gpuNames: string[]): string | null {
  for (const gpuName of gpuNames) {
    for (const hint of NVIDIA_ARCH_HINTS) {
      if (hint.patterns.some((pattern) => pattern.test(gpuName))) {
        return hint.arch;
      }
    }
  }
  return null;
}

async function installSystemPackages(): Promise<void> {
  const manager = detectPackageManager();
  if (!manager) {
    throw new Error(
      'Could not find a supported package manager. Install cmake, git, a C/C++ toolchain, python3, zip, and unzip manually.'
    );
  }

  if (manager === 'apt') {
    const update = await runCommand(withPrivileges(['apt-get', 'update']));
    if (update.code !== 0) throw new Error(`apt-get update failed: ${getFailureText(update)}`);
    const install = await runCommand(
      withPrivileges(['apt-get', 'install', '-y', ...BUILD_SYSTEM_PACKAGES.apt])
    );
    if (install.code !== 0) {
      throw new Error(`apt-get install failed: ${getFailureText(install)}`);
    }
    return;
  }

  if (manager === 'dnf') {
    const install = await runCommand(
      withPrivileges(['dnf', 'install', '-y', ...BUILD_SYSTEM_PACKAGES.dnf])
    );
    if (install.code !== 0) throw new Error(`dnf install failed: ${getFailureText(install)}`);
    return;
  }

  if (manager === 'yum') {
    const install = await runCommand(
      withPrivileges(['yum', 'install', '-y', ...BUILD_SYSTEM_PACKAGES.yum])
    );
    if (install.code !== 0) throw new Error(`yum install failed: ${getFailureText(install)}`);
    return;
  }

  const install = await runCommand(
    withPrivileges(['pacman', '-Sy', '--noconfirm', ...BUILD_SYSTEM_PACKAGES.pacman])
  );
  if (install.code !== 0) throw new Error(`pacman install failed: ${getFailureText(install)}`);
}

async function getCudaArchitectures(): Promise<string | null> {
  const fromEnv = process.env.WCIR_CUDA_ARCHITECTURES?.trim();
  if (fromEnv) return fromEnv;

  const gpuName = process.env.WCIR_GPU_NAME?.toLowerCase();
  if (gpuName) {
    const fromGpuName = inferCudaArchitectureFromGpuNames([gpuName]);
    if (fromGpuName) return fromGpuName;
  }

  if (!findCommand('nvidia-smi')) return null;

  const query = await runCommand(['nvidia-smi', '--query-gpu=name', '--format=csv,noheader']);
  if (query.code !== 0) return null;

  const gpuNames = query.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return inferCudaArchitectureFromGpuNames(gpuNames);
}

async function getLlamaCppBuildArgs(): Promise<string[]> {
  const args = ['-DGGML_CUDA=ON', '-DGGML_CUDA_DISABLE_GRAPHS=ON', '-DCMAKE_BUILD_TYPE=Release'];
  const cudaArchitectures = await getCudaArchitectures();
  if (cudaArchitectures) {
    args.push(`-DCMAKE_CUDA_ARCHITECTURES=${cudaArchitectures}`);
  }
  return args;
}

function getManagedLlamaCppSourceRef(): string {
  return process.env.WCIR_LLAMA_CPP_REF?.trim() || 'master';
}

async function cloneOrUpdateLlamaCpp(): Promise<void> {
  mkdirSync(MANAGED_LLAMA_CPP_DIR, { recursive: true });
  const ref = getManagedLlamaCppSourceRef();

  if (!existsSync(join(MANAGED_LLAMA_CPP_SRC_DIR, '.git'))) {
    rmSync(MANAGED_LLAMA_CPP_SRC_DIR, { force: true, recursive: true });
    const clone = await runCommand([
      'git',
      'clone',
      '--depth=1',
      '--branch',
      ref,
      'https://github.com/ggml-org/llama.cpp',
      MANAGED_LLAMA_CPP_SRC_DIR,
    ]);
    if (clone.code !== 0) throw new Error(`git clone failed: ${getFailureText(clone)}`);
    return;
  }

  const fetch = await runCommand(
    ['git', '-C', MANAGED_LLAMA_CPP_SRC_DIR, 'fetch', '--depth=1', 'origin', ref],
    { env: { GIT_TERMINAL_PROMPT: '0' } }
  );
  if (fetch.code !== 0) throw new Error(`git fetch failed: ${getFailureText(fetch)}`);

  const reset = await runCommand([
    'git',
    '-C',
    MANAGED_LLAMA_CPP_SRC_DIR,
    'reset',
    '--hard',
    'FETCH_HEAD',
  ]);
  if (reset.code !== 0) throw new Error(`git reset failed: ${getFailureText(reset)}`);
}

async function configureAndBuildLlamaCpp(): Promise<void> {
  mkdirSync(MANAGED_LLAMA_CPP_BUILD_DIR, { recursive: true });
  const buildArgs = await getLlamaCppBuildArgs();

  const configure = await runCommand([
    'cmake',
    '-S',
    MANAGED_LLAMA_CPP_SRC_DIR,
    '-B',
    MANAGED_LLAMA_CPP_BUILD_DIR,
    ...buildArgs,
  ]);
  if (configure.code !== 0) throw new Error(`cmake configure failed: ${getFailureText(configure)}`);

  const build = await runCommand(
    [
      'cmake',
      '--build',
      MANAGED_LLAMA_CPP_BUILD_DIR,
      '--config',
      'Release',
      '--target',
      'llama-cli',
      'llama-bench',
      '-j1',
    ],
    {
      env: {
        CMAKE_BUILD_PARALLEL_LEVEL: '1',
      },
    }
  );
  if (build.code !== 0) throw new Error(`cmake build failed: ${getFailureText(build)}`);
}

async function ensureBaseToolchain(): Promise<void> {
  const required = ['c++', 'cmake', 'git', 'make', 'zip', 'unzip'];
  const missing = required.filter((cmd) => !findCommand(cmd));
  if (missing.length > 0) {
    await installSystemPackages();
  }
}

export function canManageLlamaCppRuntime(): boolean {
  return process.platform === 'linux' && process.arch === 'x64';
}

export function getManagedLlamaCppPaths(): { bench: string; cli: string } {
  return {
    cli: join(MANAGED_LLAMA_CPP_BIN_DIR, 'llama-cli'),
    bench: join(MANAGED_LLAMA_CPP_BIN_DIR, 'llama-bench'),
  };
}

export function hasManagedLlamaCpp(): boolean {
  const bins = getManagedLlamaCppPaths();
  return existsSync(bins.cli) && existsSync(bins.bench);
}

export async function ensureManagedLlamaCppInstalled(options?: { force?: boolean }): Promise<void> {
  if (!canManageLlamaCppRuntime()) {
    throw new Error(
      `${chalk.cyan('whatcanirun')} can only auto-install ${chalk.cyan('llama.cpp')} on Linux x64 hosts today.`
    );
  }

  if (!options?.force && hasManagedLlamaCpp()) return;

  if (!findCommand('nvidia-smi')) {
    throw new Error(
      `${chalk.cyan('nvidia-smi')} is not available. Start from a GPU host image where the NVIDIA driver stack is already installed.`
    );
  }

  await ensureBaseToolchain();
  await cloneOrUpdateLlamaCpp();
  await configureAndBuildLlamaCpp();
}
