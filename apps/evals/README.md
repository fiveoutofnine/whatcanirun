# Capability evaluations

`apps/evals` owns the Python/Modal capability runner, pinned model grid, task suite,
graders, and report generation. Website APIs and presentation belong in `apps/www`.

This benchmark answers a different question from whatcani.run's local hardware runs:

- Modal measures whether each exact GGUF solves the same tasks.
- whatcani.run supplies observed speed, memory, fit, and context data for the Mac.
- `benchmark.py report` joins the two by artifact SHA-256 and calculates the task-specific
  Pareto frontier. A repo ID plus filename is only a fallback identity.

The checked-in first pass compares four Qwen3.8-27B Unsloth quants against Qwen3.5 9B and
4B at Q8. Every filename, Hugging Face revision, LFS SHA-256, byte size, and the llama.cpp
commit are pinned in `models.json`.

## Method

The `screening` round runs 120 objectively graded tasks once with greedy decoding. The
suite has 30 tasks each for multi-step reasoning, strict JSON output, structured tool calls,
and instruction following. It is a fast developer-workload screen, not a universal
intelligence score.

The `finalists` round reruns selected candidates with temperature 0.6 and three fixed seeds.
The report includes pass@1, a 95% Wilson interval, per-category results, and reliability—the
share of tasks passed at every seed. Cloud latency is recorded only for diagnostics and is
never treated as Mac performance.

## Run end to end

Validate the complete pinned plan without installing anything:

```bash
cd apps/evals
python3 benchmark.py validate
```

Authenticate Modal once if this machine has never used it:

```bash
uvx --from modal==1.5.4 modal setup
```

Run all six candidates. Modal fans them out to L40S containers, downloads each immutable
GGUF into a persistent Volume, starts one pinned llama-server per model, runs all tasks, grades
them, and writes local result JSON:

```bash
uvx --from modal==1.5.4 modal run modal_app.py --round screening
```

Run only the finalists with three sampling seeds:

```bash
uvx --from modal==1.5.4 modal run modal_app.py \
  --round finalists \
  --candidates qwen3.8-27b-ud-q3-k-xl,qwen3.8-27b-ud-q4-k-m
```

Join a completed round to whatcani.run. On macOS the report command derives the exact device
chip ID automatically:

```bash
python3 benchmark.py report \
  --results results/developer-screening-v1/screening \
  --output results/developer-screening-v1/frontier.json
```

This writes both machine-readable JSON and a Markdown table. Use `--performance export.json`
to report against a saved `/api/v0/performance` response, or `--device '<chip ID>'` to target a
different machine.

## Reproducibility contract

A result is comparable only when these fields match:

- artifact SHA-256, repository ID, filename, and immutable Hugging Face revision;
- llama.cpp commit and GGUF-provided Jinja chat template;
- thinking/reasoning template arguments;
- context length, flash attention, GPU layers, and K/V cache types;
- temperature, top-p, top-k, min-p, output limit, and seed;
- screening-suite SHA-256.

The current whatcani.run performance bundles predate explicit KV-cache fields. The join marks
their KV compatibility as `unknown` instead of claiming an exact match. Capability and local
hardware results remain separate fields in the report.

## Custom task data

The built-in suite is generated in `screening_suite.py`, so every expected answer is
deterministic and reviewable. `python3 benchmark.py suite` emits its JSONL form. Task graders
support exact text, exact JSON, regex, required substrings, and exact structured tool calls.
Add workload-specific cases to the generator—or load a private task list in a follow-up—without
changing the pinned inference or model identity contract.

## Workspace commands

The private `@whatcanirun/evals` Bun workspace wraps the Python commands; it has no
JavaScript runtime dependencies. From the repository root:

```bash
bun run --filter @whatcanirun/evals validate
bun run --filter @whatcanirun/evals test
bun run --filter @whatcanirun/evals eval --round screening
bun run --filter @whatcanirun/evals report \
  --results results/developer-screening-v1/screening \
  --output results/developer-screening-v1/frontier.json
```

These commands run inside `apps/evals`, including relative result paths. `bun run test`
also runs the evaluator's offline tests through Turborepo; it never launches Modal jobs.
