# @whatcanirun/cli

Standardized local LLM inference benchmarks. Run a model, measure performance, and submit results to [**whatcani.run**](https://whatcani.run).

## Quick start

```bash
# Run a benchmark and submit results
bunx @whatcanirun/cli run --model mlx-community/Qwen3.5-0.8B-MLX-8bit --runtime mlx_lm --submit
```

## Install

```bash
# npm
npm install -g @whatcanirun/cli

# bun
bun install -g @whatcanirun/cli
```

The alias `wcir` is available after installing.

## Usage

To run and submit benchmarks, use the `run` command:

```bash
# Run a benchmark
wcir run --model $MODEL_PATH_OR_HF_PATH --runtime $RUNTIME

# Run and submit results
wcir run --model $MODEL_PATH_OR_HF_PATH --runtime $RUNTIME --submit

# Customize benchmark parameters
wcir run \
  --model $MODEL_PATH_OR_HF_PATH \
  --runtime $RUNTIME \
  --prompt-tokens 2048 \
  --gen-tokens 512 \
  --trials 5 \
  --notes "optional notes attached to the run" \
  --submit
```

`run` saves bundles to `~/.whatcanirun/bundles/*` in case you want to inspect them or validate/submit them later via `validate`/`submit`, respectively. You may also specify the output directory with the `--output` flag:

```bash
# Submit a previously saved bundle
wcir submit $BUNDLE_PATH_OR_BUNDLE_ID

# Validate a bundle
wcir validate $BUNDLE_PATH_OR_BUNDLE_ID
```

> [!INFO]
>  Note that only bundle IDs  will only be searched in the `~/.whatcanirun/bundles/*` directory.

The CLI also comes with a utility command `show` to inspect your device, runtime, or model:

```bash
# Inspect device, runtime, or model info
wcir show device
wcir show runtime $RUNTIME
wcir show model $MODEL_PATH
```

## Authentication (optional)

Authentication is optional. Without it, runs are submitted anonymously. If you want to link runs to your account, login via the `auth` command:

```bash
wcir auth login
```

## Supported runtimes

| Runtime   | Flag        |
| --------- | ----------- |
| MLX       | `mlx_lm`    |
| llama.cpp | `llama.cpp` |

## Development

```bash
bun run dev          # Run src/cli.ts directly
bun run build        # Bundle to dist/cli.js
bun run build:bin    # Compile to standalone binary
bun test             # Run tests
bun run lint         # Lint
```
