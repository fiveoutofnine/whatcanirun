# @whatcanirun/cli

## Overview

CLI tool for standardized local LLM inference benchmarks. Built with Bun and citty.

## Commands

```
bun run src/cli.ts run       # Run a benchmark
bun run src/cli.ts submit    # Upload an existing bundle
bun run src/cli.ts validate  # Validate a bundle locally
bun run src/cli.ts show      # Display device/runtime/model info
bun run src/cli.ts version   # Print version
```

## Build & Test

```
bun install          # Install dependencies (run from monorepo root)
bun run dev          # Run CLI in dev mode
bun run build        # Bundle for Bun
bun run build:bin    # Compile to standalone binary
bun test             # Run tests
```

## Lint & Format

```
bun run lint         # ESLint (typescript-eslint + eslint-plugin-prettier)
bunx prettier --check .   # Check formatting
bunx prettier --write .   # Fix formatting
```

Prettier is the single source of truth for formatting. ESLint delegates formatting rules to `prettier/prettier`.

## Project Structure

```
src/
├── cli.ts                 # Entry point (citty)
├── commands/              # CLI subcommands
│   ├── run.ts             # Run benchmark, collect metrics, create bundle
│   ├── submit.ts          # Upload bundle to API
│   ├── validate.ts        # Validate bundle zip
│   ├── show.ts            # Inspect device/runtime/model
│   └── version.ts         # Print version
├── bundle/                # Bundle creation and validation
│   ├── create.ts          # Create zip bundles (manifest + results + logs)
│   ├── schema.ts          # Manifest/Results types and validators
│   └── validate.ts        # Validate existing bundles
├── device/detect.ts       # macOS/Linux hardware detection
├── metrics/               # Benchmark measurement
│   ├── collector.ts       # Per-trial token streaming and timing
│   ├── aggregator.ts      # p50/p95/mean across trials
│   └── memory.ts          # RSS memory tracking
├── model/resolve.ts       # Model path resolution and inspection
├── runtime/               # Runtime adapters
│   ├── types.ts           # RuntimeAdapter interface, TokenEvent, GenerateOpts
│   ├── resolve.ts         # Runtime name → adapter mapping
│   ├── llamacpp.ts        # llama.cpp adapter
│   ├── mlx.ts             # MLX adapter
│   └── vllm.ts            # vLLM adapter
├── scenarios/             # Benchmark scenarios
│   ├── types.ts           # ScenarioDefinition interface
│   └── registry.ts        # Scenario loading from fixtures
├── upload/client.ts       # API upload client
└── utils/
    ├── id.ts              # Bundle ID generation
    └── log.ts             # Styled console output
```

## Conventions

- TypeScript strict mode, Bun runtime
- Single quotes, trailing commas, 100 char print width
- Import sorting via `@trivago/prettier-plugin-sort-imports`: third-party first, then `@/`, then relative
- Use `unknown` for catch clauses, not `any` — narrow with `instanceof Error`
- Errors use `process.exit(1)` in commands; throw in library code
- Bundle schema version: `0.1.0`, task: `llm.generate.v1`
