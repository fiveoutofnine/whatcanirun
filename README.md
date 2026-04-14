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

There is a standalone batch helper at [`scripts/batch_submit.py`](scripts/batch_submit.py) for benchmarking a list of model sources on the current machine and submitting each bundle to [whatcani.run](https://whatcani.run).

For fresh Linux GPU hosts such as Vast.ai instances, there is also a bootstrap helper at [`scripts/bootstrap_gpu_host.sh`](scripts/bootstrap_gpu_host.sh) that installs Bun, repo dependencies, a local `wcir` wrapper, and builds `llama.cpp` with CUDA.

Accepted model-source formats:

- `.txt`: one model source per line, `#` comments allowed
- `.json`: array of strings or objects with `model`, `runtime`, `prompt_tokens`, `gen_tokens`, `trials`, `notes`
- `.jsonl`: one JSON object per line using the same object shape

Example:

```bash
bash scripts/bootstrap_gpu_host.sh

python3 scripts/batch_submit.py \
  --model-sources scripts/model_sources.example.json
```

Or let the batch runner invoke bootstrap first:

```bash
python3 scripts/batch_submit.py \
  --bootstrap \
  --model-sources scripts/model_sources.example.json
```

By default the script uses the repo-local CLI via `bun apps/cli/src/cli.ts` or `bun apps/cli/dist/cli.js`, runs one model at a time on the host GPU, and submits each saved bundle via `wcir submit`.

> [!NOTE]
> Because the benchmarks run on the current host, this is the path to use for GeForce cards like a 4090 or 5090. The CLI will record the actual detected GPU in each submitted run.

> [!NOTE]
> `scripts/bootstrap_gpu_host.sh` verifies `nvidia-smi` but does not install NVIDIA drivers. On providers like Vast.ai, you still need to start from a GPU-enabled image or runtime where the NVIDIA driver stack is already working.

## Scripts

From the repo root:

```bash
bun run build      # Build all apps/packages
bun run lint       # Lint
bun run format     # Format
bun run typecheck  # Type-check
bun run test       # Run tests
```
