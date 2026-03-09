# @whatcanirun/cli

Standardized local LLM inference benchmarks.

## Install

```bash
bun install
```

## Usage

```bash
# Run a benchmark
whatcanirun run --model ./models/llama-3.2-1b.gguf --runtime llama.cpp

# Run with options
whatcanirun run \
  --model ./models/llama-3.2-1b.gguf \
  --runtime llama.cpp \
  --scenario chat_long_v1 \
  --quant q4_k_m \
  --trials 10 \
  --warmups 3

# Run without uploading
whatcanirun run --model ./model.gguf --runtime mlx --no-submit

# Upload a previously saved bundle
whatcanirun submit ./bundles/bundle-abc123.zip

# Validate a bundle
whatcanirun validate ./bundles/bundle-abc123.zip

# Inspect device, runtime, or model
whatcanirun show device
whatcanirun show runtime llama.cpp
whatcanirun show model ./models/llama-3.2-1b.gguf
```

The short alias `wcir` is also available.

## Supported Runtimes

| Runtime    | Flag         |
| ---------- | ------------ |
| llama.cpp  | `llama.cpp`  |
| MLX        | `mlx`        |
| vLLM       | `vllm`       |

## Scenarios

| ID               | Description              |
| ---------------- | ------------------------ |
| `chat_short_v1`  | Short chat completion    |
| `chat_long_v1`   | Long chat completion     |

## Canonical Runs

A run is considered **canonical** when all of these hold:

- `batch_size = 1`
- `temperature = 0`
- `top_p = 1`
- `trials >= 5`
- `warmups >= 2`

## Build

```bash
# Bundle for Bun
bun run build

# Compile to standalone binary
bun run build:bin
```

## Lint & Format

```bash
bun run lint
bunx prettier --check .
bunx prettier --write .
```

## Development

```bash
bun run dev          # Runs src/cli.ts directly
bun test             # Run tests
```
