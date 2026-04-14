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

## Batch Usage

To benchmark a batch of models from source strings, pass `--model-sources`. On Linux x64 NVIDIA hosts, the CLI will auto-install a managed `llama.cpp` runtime if one is not already available.

```bash
# Comma-separated model source strings
bunx whatcanirun@latest \
  --model-sources "bartowski/Llama-3.2-3B-Instruct-GGUF:Llama-3.2-3B-Instruct-Q4_K_M.gguf,Qwen/Qwen2.5-7B-Instruct-GGUF:qwen2.5-7b-instruct-q4_k_m.gguf"

# Or use an input file
bunx whatcanirun@latest batch \
  --model-sources ./models.json
```

Accepted `--model-sources` formats:

- path to `.txt`, `.json`, or `.jsonl`
- JSON array string
- comma-separated source strings
- newline-separated source strings

Example `models.json`:

```json
[
  "bartowski/Llama-3.2-3B-Instruct-GGUF:Llama-3.2-3B-Instruct-Q4_K_M.gguf",
  {
    "model": "Qwen/Qwen2.5-7B-Instruct-GGUF:qwen2.5-7b-instruct-q4_k_m.gguf",
    "trials": 5,
    "notes": "vast 5090"
  }
]
```

The batch command writes per-run bundles and a `summary.json` under `~/.whatcanirun/batches/<batch-id>/`.

> [!NOTE]
> Auto-install requires a Linux x64 host with a working NVIDIA driver stack already present. `whatcanirun` can install build tools and build `llama.cpp`, but it does not install GPU drivers; `nvidia-smi` must already work.

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
