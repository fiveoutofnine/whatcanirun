# whatcanirun

Standardized local LLM inference benchmarks. Run a model, measure performance, and submit results to [**whatcani.run**](https://whatcani.run).

## Quick start

```bash
bunx whatcanirun@latest
```

## Install

```bash
# npm
npm install -g whatcanirun

# bun
bun install -g whatcanirun
```

The alias `wcir` is available after installing.

## Usage

To run and submit benchmarks, use the interactive mode or `run` command:

```bash
# Interactive mode
wcir

# Run a benchmark
wcir run --model $MODEL_PATH_OR_HF_REFERENCE --runtime $RUNTIME

# Run and submit results
wcir run --model $MODEL_PATH_OR_HF_REFERENCE --runtime $RUNTIME --submit

# Customize benchmark parameters
wcir run \
  --model $MODEL_PATH_OR_HF_REFERENCE \
  --runtime $RUNTIME \
  --prompt-tokens 4096 \
  --gen-tokens 1024 \
  --trials 5 \
  --notes "optional notes attached to the run" \
  --submit
```

> [!NOTE]
> If it's not a model path, `MODEL_PATH_OR_HF_REFERENCE` must be in the format `{org}/{repo}` for `mlx_lm` and `{org}/{repo}:{file}.gguf` for `llama.cpp`.

`run` saves bundles to `~/.whatcanirun/bundles/*` in case you want to inspect them or validate/submit them later via `validate`/`submit`, respectively. You may also specify the output directory with the `--output` flag:

```bash
# Submit a previously saved bundle
wcir submit $BUNDLE_PATH_OR_BUNDLE_ID

# Validate a bundle
wcir validate $BUNDLE_PATH_OR_BUNDLE_ID
```

> [!NOTE]
> Note that only bundle IDs  will only be searched in the `~/.whatcanirun/bundles/*` directory.

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
