# whatcanirun

Find the best AI models you can run locally, and benchmark them on your hardware.

- **Website**: [whatcani.run](https://whatcani.run) — browse models, filter by device, and view community benchmark results
- **CLI**: `whatcanirun` ([npm](https://www.npmjs.com/package/whatcanirun)) — run standardized local LLM benchmarks and submit results

## Monorepo Structure

| Path | Description |
| --- | --- |
| [`apps/www`](apps/www) | Next.js web app powering [whatcani.run](https://whatcani.run) |
| [`apps/cli`](apps/cli) | CLI benchmarking tool (`whatcanirun` / `wcir`) |
| [`apps/evals`](apps/evals) | Modal GGUF capability evaluation and task-specific Pareto reports |
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

### Capability Evaluations

See [`apps/evals/README.md`](apps/evals/README.md) for the pinned model grid, Modal setup,
and evaluation/report commands. Validate the plan without launching cloud jobs:

```bash
bun run --filter @whatcanirun/evals validate
```

## Scripts

From the repo root:

```bash
bun run build      # Build all apps/packages
bun run lint       # Lint
bun run format     # Format
bun run typecheck  # Type-check
bun run test       # Run tests
```
