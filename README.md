# whatcanirun

Find the best AI models you can run locally, and benchmark them on your hardware.

- **Website**: [whatcani.run](https://whatcani.run) — browse models, filter by device, and view community benchmark results
- **CLI**: `whatcanirun` ([npm](https://www.npmjs.com/package/whatcanirun)) — run standardized local LLM benchmarks and submit results

## Monorepo Structure

| Path | Description |
| --- | --- |
| [`apps/www`](apps/www) | Next.js web app powering [whatcani.run](https://whatcani.run) |
| [`apps/cli`](apps/cli) | CLI benchmarking tool (`whatcanirun` / `wcir`) |
| [`packages/shared`](packages/shared) | Shared types, schemas, and utilities |

## Getting Started

This project uses [Bun](https://bun.sh) and [Turborepo](https://turbo.build/repo).

```bash
git clone https://github.com/fiveoutofnine/whatcanirun.git
cd whatcanirun
bun install
```

### CLI

```bash
cd apps/cli
bun run build
whatcanirun run     # Run a benchmark
whatcanirun show    # Inspect device, runtime, or model info
whatcanirun submit  # Upload a saved bundle
```

### Web App

See [`apps/www/README.md`](apps/www/README.md) for environment setup and local development instructions.

```bash
cd apps/www
cp .env.sample .env  # fill in env vars
bun run dev
```

## Batch Runner

The CLI now supports host-local batch benchmarking directly via `whatcanirun batch` or by passing `--model-sources` to the top-level command.

Example:

```bash
bunx whatcanirun@latest \
  --model-sources "bartowski/Llama-3.2-3B-Instruct-GGUF:Llama-3.2-3B-Instruct-Q4_K_M.gguf,Qwen/Qwen2.5-7B-Instruct-GGUF:qwen2.5-7b-instruct-q4_k_m.gguf"
```

On Linux x64 NVIDIA hosts, the CLI can auto-install build dependencies and a managed `llama.cpp` runtime for this workflow. That is the intended path for rented GeForce machines such as Vast.ai 4090/5090 instances.

> [!NOTE]
> The CLI can prepare user-space dependencies, but it does not install NVIDIA drivers. `nvidia-smi` must already work on the host image/runtime.

## Scripts

From the repo root:

```bash
bun run build      # Build all apps/packages
bun run lint       # Lint
bun run format     # Format
bun run typecheck  # Type-check
bun run test       # Run tests
```
