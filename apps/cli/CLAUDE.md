# whatcanirun

## Overview

CLI tool for standardized local LLM inference benchmarks. Built with Bun and citty. Published as `whatcanirun` on npm (bin aliases: `whatcanirun`, `wcir`).

## Commands

```
whatcanirun run       Run a benchmark (model + runtime), optionally submit results
whatcanirun show      Inspect device, runtime, or model info
whatcanirun submit    Upload a previously saved bundle
whatcanirun validate  Validate a bundle
whatcanirun auth      Login/logout (optional, for linking runs to an account)
whatcanirun version   Print version
```

## Architecture

Entry point: `src/cli.ts` — registers subcommands via citty's `defineCommand`.

```
src/
├── cli.ts              Entry point
├── commands/           Subcommand definitions (one file per command)
├── runtime/            Runtime adapters (RuntimeAdapter interface)
│   ├── types.ts        RuntimeAdapter, BenchResult, BenchTrial interfaces
│   ├── resolve.ts      Registry mapping runtime names → adapters
│   ├── mlx.ts          MLX (mlx_lm) adapter
│   └── llamacpp.ts     llama.cpp adapter
├── device/             Hardware detection (DeviceInfo)
├── model/              Model resolution and inspection (ModelInfo)
├── bundle/             Bundle creation (zip) and validation
├── upload/             API client for submitting bundles
├── auth/               Token storage (~/.whatcanirun/auth.json)
└── utils/
    ├── bin.ts          Detects how the CLI was invoked for help text
    ├── log.ts          Colored output helpers and Spinner class
    └── id.ts           Bundle ID generation, default paths
```

## Key patterns

- Runtime adapters implement `RuntimeAdapter` (detect + benchmark). New runtimes go in `src/runtime/` and get registered in `resolve.ts`.
- Bundles are zip files containing `manifest.json`, `results.json`, and `sysinfo.txt`. Schema types come from `@whatcanirun/shared`.
- Auth is optional — token stored at `~/.whatcanirun/auth.json`, bundles at `~/.whatcanirun/bundles/`.
- API base URL is configurable via `WCIR_API_URL` env var (defaults to `https://whatcani.run`).

## Development

```bash
bun run dev          # Run src/cli.ts directly
bun run build        # Bundle to dist/cli.js
bun run build:bin    # Compile to standalone binary
bun test
bun run lint
```
