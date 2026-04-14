#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BATCH_ROOT = Path.home() / ".whatcanirun" / "batches"
BOOTSTRAP_SCRIPT = REPO_ROOT / "scripts" / "bootstrap_gpu_host.sh"


@dataclass
class ModelSpec:
    model: str
    runtime: str = "llama.cpp"
    prompt_tokens: int = 4096
    gen_tokens: int = 1024
    trials: int = 10
    notes: str | None = None

    @classmethod
    def from_raw(
        cls,
        raw: str | dict[str, Any],
        *,
        default_runtime: str,
        default_prompt_tokens: int,
        default_gen_tokens: int,
        default_trials: int,
        default_notes: str | None,
    ) -> "ModelSpec":
        if isinstance(raw, str):
            return cls(
                model=raw,
                runtime=default_runtime,
                prompt_tokens=default_prompt_tokens,
                gen_tokens=default_gen_tokens,
                trials=default_trials,
                notes=default_notes,
            )

        if not isinstance(raw, dict):
            raise TypeError(f"Unsupported model entry: {raw!r}")

        model = first_non_empty(raw, "model", "source", "ref")
        if not model:
            raise ValueError(f"Model entry is missing 'model': {raw!r}")

        return cls(
            model=model,
            runtime=raw.get("runtime", default_runtime),
            prompt_tokens=int(raw.get("prompt_tokens", default_prompt_tokens)),
            gen_tokens=int(raw.get("gen_tokens", default_gen_tokens)),
            trials=int(raw.get("trials", default_trials)),
            notes=raw.get("notes", default_notes),
        )


def first_non_empty(data: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def read_specs_file(
    path: Path,
    *,
    default_runtime: str,
    default_prompt_tokens: int,
    default_gen_tokens: int,
    default_trials: int,
    default_notes: str | None,
) -> list[ModelSpec]:
    if not path.exists():
        raise FileNotFoundError(f"Model sources file does not exist: {path}")

    suffix = path.suffix.lower()
    if suffix == ".json":
        raw_items = json.loads(path.read_text())
        if not isinstance(raw_items, list):
            raise ValueError(f"Expected a JSON array in {path}")
    else:
        raw_items = []
        for line in path.read_text().splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            if suffix == ".jsonl":
                raw_items.append(json.loads(stripped))
            else:
                raw_items.append(stripped)

    specs = [
        ModelSpec.from_raw(
            raw_item,
            default_runtime=default_runtime,
            default_prompt_tokens=default_prompt_tokens,
            default_gen_tokens=default_gen_tokens,
            default_trials=default_trials,
            default_notes=default_notes,
        )
        for raw_item in raw_items
    ]

    if not specs:
        raise ValueError(f"No model sources found in {path}")

    return specs


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-").lower()
    return slug[:80] or "model"


def detect_cli_command() -> list[str]:
    override = os.environ.get("WCIR_BATCH_CLI")
    if override:
        return shlex.split(override)

    dist_cli = REPO_ROOT / "apps" / "cli" / "dist" / "cli.js"
    if dist_cli.exists():
        return ["bun", str(dist_cli)]

    src_cli = REPO_ROOT / "apps" / "cli" / "src" / "cli.ts"
    if src_cli.exists():
        return ["bun", str(src_cli)]

    return ["wcir"]


def resolve_command_path(command: str) -> Path | None:
    if "/" in command:
        candidate = Path(command)
        if not candidate.is_absolute():
            candidate = REPO_ROOT / candidate
        return candidate if candidate.exists() else None

    resolved = shutil.which(command)
    return Path(resolved) if resolved else None


def run_command(command: list[str], *, cwd: Path) -> None:
    print(f"$ {shlex.join(command)}", flush=True)
    result = subprocess.run(command, cwd=str(cwd), check=False)
    if result.returncode != 0:
        raise RuntimeError(f"Command failed with exit code {result.returncode}: {shlex.join(command)}")


def find_single_bundle(output_dir: Path) -> Path:
    bundles = sorted(output_dir.glob("*.zip"))
    if not bundles:
        raise FileNotFoundError(f"No bundle was created in {output_dir}")
    return bundles[-1]


def detect_gpu_info() -> str:
    try:
        return subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total,driver_version",
                "--format=csv,noheader",
            ],
            text=True,
        ).strip()
    except Exception as exc:
        return f"nvidia-smi unavailable: {exc}"


def run_bootstrap() -> None:
    if not BOOTSTRAP_SCRIPT.exists():
        raise FileNotFoundError(f"Bootstrap script not found: {BOOTSTRAP_SCRIPT}")
    run_command(["bash", str(BOOTSTRAP_SCRIPT)], cwd=REPO_ROOT)


def validate_requirements(specs: list[ModelSpec], cli_command: list[str]) -> None:
    missing: list[str] = []
    missing_notes: list[str] = []

    if not cli_command:
        missing.append("CLI command")
    else:
        cli_binary = resolve_command_path(cli_command[0])
        if cli_binary is None:
            missing.append(cli_command[0])

        for arg in cli_command[1:]:
            if not arg.endswith((".js", ".ts")):
                continue

            script_path = Path(arg)
            if not script_path.is_absolute():
                script_path = REPO_ROOT / script_path
            if not script_path.exists():
                missing.append(str(script_path))

    runtimes = {spec.runtime for spec in specs}
    if "llama.cpp" in runtimes:
        if resolve_command_path("nvidia-smi") is None:
            missing.append("nvidia-smi")
            missing_notes.append(
                "nvidia-smi comes from the host NVIDIA driver stack, so use a GPU-enabled host image or provider runtime where it already works."
            )
        if resolve_command_path("llama-cli") is None:
            missing.append("llama-cli")
        if resolve_command_path("llama-bench") is None:
            missing.append("llama-bench")

    if any(spec.runtime == "mlx_lm" for spec in specs):
        if resolve_command_path("python3") is None and resolve_command_path("python") is None:
            missing.append("python3")

    if resolve_command_path("bun") is None and cli_command[0] == "bun":
        missing.append("bun")

    if not missing:
        return

    details = "\n".join(f"- {item}" for item in sorted(set(missing)))
    guidance = f"Run `bash {BOOTSTRAP_SCRIPT}` first."
    note_block = ""
    if missing_notes:
        note_block = "\n" + "\n".join(f"- {note}" for note in missing_notes)
    raise SystemExit(f"Missing required tools:\n{details}\n{guidance}{note_block}")


def run_batch(
    specs: list[ModelSpec],
    *,
    cli_command: list[str],
    submit: bool,
    reward: bool,
    continue_on_error: bool,
    batch_label: str | None,
    batch_root: Path,
) -> dict[str, Any]:
    batch_id = batch_label or datetime.now(UTC).strftime("batch-%Y%m%d-%H%M%S")
    batch_dir = batch_root / batch_id
    batch_dir.mkdir(parents=True, exist_ok=True)

    gpu_info = detect_gpu_info()
    print(f"Batch ID: {batch_id}", flush=True)
    print(f"Host GPU info:\n{gpu_info}\n", flush=True)

    results: list[dict[str, Any]] = []
    for index, spec in enumerate(specs, start=1):
        started_at = time.time()
        output_dir = batch_dir / f"{index:03d}-{slugify(spec.model)}"
        output_dir.mkdir(parents=True, exist_ok=True)

        try:
            print(f"[{index}/{len(specs)}] Benchmarking {spec.model}", flush=True)
            run_command(
                cli_command
                + [
                    "run",
                    "--model",
                    spec.model,
                    "--runtime",
                    spec.runtime,
                    "--prompt-tokens",
                    str(spec.prompt_tokens),
                    "--gen-tokens",
                    str(spec.gen_tokens),
                    "--trials",
                    str(spec.trials),
                    "--output",
                    str(output_dir),
                ]
                + (["--notes", spec.notes] if spec.notes else []),
                cwd=REPO_ROOT,
            )

            bundle_path = find_single_bundle(output_dir)
            if submit:
                submit_command = cli_command + ["submit", str(bundle_path)]
                if reward:
                    submit_command.append("--reward")
                run_command(submit_command, cwd=REPO_ROOT)

            result = {
                "model": spec.model,
                "runtime": spec.runtime,
                "status": "submitted" if submit else "benchmarked",
                "bundle_path": str(bundle_path),
                "duration_seconds": round(time.time() - started_at, 2),
            }
            print(
                f"[{index}/{len(specs)}] Completed {spec.model} in {result['duration_seconds']}s\n",
                flush=True,
            )
            results.append(result)
        except Exception as exc:
            result = {
                "model": spec.model,
                "runtime": spec.runtime,
                "status": "failed",
                "error": str(exc),
                "duration_seconds": round(time.time() - started_at, 2),
            }
            print(
                f"[{index}/{len(specs)}] Failed {spec.model}: {exc}\n",
                file=sys.stderr,
                flush=True,
            )
            results.append(result)
            if not continue_on_error:
                break

    summary = {
        "batch_id": batch_id,
        "gpu_info": gpu_info,
        "submitted": submit,
        "reward": reward,
        "cli_command": cli_command,
        "results": results,
    }
    summary_path = batch_dir / "summary.json"
    summary_path.write_text(json.dumps(summary, indent=2) + "\n")

    return {
        "batch_id": batch_id,
        "summary_path": str(summary_path),
        "results": results,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Batch benchmark and submit model sources on the current machine."
    )
    parser.add_argument("--model-sources", required=True, help="Path to .txt, .json, or .jsonl file")
    parser.add_argument("--runtime", default="llama.cpp", help="Default runtime for entries")
    parser.add_argument("--prompt-tokens", type=int, default=4096, help="Default prompt token count")
    parser.add_argument("--gen-tokens", type=int, default=1024, help="Default generation token count")
    parser.add_argument("--trials", type=int, default=10, help="Default trial count")
    parser.add_argument("--notes", default="", help="Default notes for every run")
    parser.add_argument("--max-models", type=int, default=0, help="Only process the first N models")
    parser.add_argument("--batch-label", default="", help="Optional batch label")
    parser.add_argument(
        "--batch-root",
        default=str(DEFAULT_BATCH_ROOT),
        help="Directory where per-batch outputs and summary.json are written",
    )
    parser.add_argument(
        "--cli",
        default="",
        help="Override the CLI command, e.g. 'bun apps/cli/dist/cli.js' or 'wcir'",
    )
    parser.add_argument(
        "--no-submit",
        action="store_true",
        help="Benchmark only; do not call the submit command",
    )
    parser.add_argument(
        "--reward",
        action="store_true",
        help="Pass --reward when submitting",
    )
    parser.add_argument(
        "--stop-on-error",
        action="store_true",
        help="Abort the batch on the first failed model",
    )
    parser.add_argument(
        "--bootstrap",
        action="store_true",
        help="Run scripts/bootstrap_gpu_host.sh before starting the batch",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.bootstrap:
        run_bootstrap()

    specs = read_specs_file(
        Path(args.model_sources).expanduser(),
        default_runtime=args.runtime,
        default_prompt_tokens=args.prompt_tokens,
        default_gen_tokens=args.gen_tokens,
        default_trials=args.trials,
        default_notes=args.notes or None,
    )
    if args.max_models > 0:
        specs = specs[: args.max_models]

    cli_command = shlex.split(args.cli) if args.cli else detect_cli_command()
    validate_requirements(specs, cli_command)
    print(f"Using CLI command: {shlex.join(cli_command)}", flush=True)
    print(f"Submitting {len(specs)} model(s) on the current host GPU.", flush=True)

    result = run_batch(
        specs,
        cli_command=cli_command,
        submit=not args.no_submit,
        reward=args.reward,
        continue_on_error=not args.stop_on_error,
        batch_label=args.batch_label or None,
        batch_root=Path(args.batch_root).expanduser(),
    )
    print(json.dumps(result, indent=2), flush=True)


if __name__ == "__main__":
    main()
