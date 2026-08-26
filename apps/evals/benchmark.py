"""Validation, objective grading, aggregation, and Pareto reporting."""

from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path
from typing import Any

from screening_suite import build_screening_tasks, suite_sha256


SHA40 = re.compile(r"^[0-9a-f]{40}$")
SHA64 = re.compile(r"^[0-9a-f]{64}$")
REPO_ID = re.compile(r"^[\w.-]+/[\w.-]+$")
GRADER_TYPES = {"exact", "json_exact", "regex", "contains_all", "tool_call"}


def load_config(path: str | Path) -> dict[str, Any]:
    with Path(path).open(encoding="utf-8") as file:
        config = json.load(file)
    errors = validate_config(config)
    if errors:
        raise ValueError("Invalid benchmark config:\n- " + "\n- ".join(errors))
    return config


def validate_config(config: Any) -> list[str]:
    if not isinstance(config, dict):
        return ["config must be an object"]

    errors: list[str] = []
    if config.get("schema_version") != "1":
        errors.append("schema_version must be '1'")
    if not isinstance(config.get("benchmark_id"), str) or not config["benchmark_id"]:
        errors.append("benchmark_id must be a non-empty string")

    engine = config.get("engine")
    if not isinstance(engine, dict):
        errors.append("engine must be an object")
    else:
        if engine.get("name") != "llama.cpp":
            errors.append("engine.name must be 'llama.cpp'")
        if not SHA40.fullmatch(str(engine.get("commit", ""))):
            errors.append("engine.commit must be a 40-character git SHA")

    inference = config.get("inference")
    if not isinstance(inference, dict):
        errors.append("inference must be an object")
    else:
        if not isinstance(inference.get("context_length"), int) or inference["context_length"] <= 0:
            errors.append("inference.context_length must be a positive integer")
        for field in ("kv_cache_type_k", "kv_cache_type_v"):
            if not isinstance(inference.get(field), str) or not inference[field]:
                errors.append(f"inference.{field} must be a non-empty string")

    rounds = config.get("rounds")
    if not isinstance(rounds, dict) or not rounds:
        errors.append("rounds must be a non-empty object")
    else:
        for round_name, decoding in rounds.items():
            if not isinstance(decoding, dict):
                errors.append(f"rounds.{round_name} must be an object")
                continue
            if not isinstance(decoding.get("temperature"), (int, float)):
                errors.append(f"rounds.{round_name}.temperature must be numeric")
            seeds = decoding.get("seeds")
            if not isinstance(seeds, list) or not seeds or not all(
                isinstance(seed, int) for seed in seeds
            ):
                errors.append(f"rounds.{round_name}.seeds must be a non-empty integer array")
            if not isinstance(decoding.get("max_tokens"), int) or decoding["max_tokens"] <= 0:
                errors.append(f"rounds.{round_name}.max_tokens must be a positive integer")

    candidates = config.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        errors.append("candidates must be a non-empty array")
        return errors

    seen_ids: set[str] = set()
    seen_artifacts: set[str] = set()
    for index, candidate in enumerate(candidates):
        prefix = f"candidates[{index}]"
        if not isinstance(candidate, dict):
            errors.append(f"{prefix} must be an object")
            continue
        candidate_id = candidate.get("id")
        if not isinstance(candidate_id, str) or not candidate_id:
            errors.append(f"{prefix}.id must be a non-empty string")
        elif candidate_id in seen_ids:
            errors.append(f"{prefix}.id duplicates {candidate_id}")
        else:
            seen_ids.add(candidate_id)
        if not REPO_ID.fullmatch(str(candidate.get("repo_id", ""))):
            errors.append(f"{prefix}.repo_id must be an org/repo identifier")
        if not str(candidate.get("filename", "")).endswith(".gguf"):
            errors.append(f"{prefix}.filename must end in .gguf")
        if not SHA40.fullmatch(str(candidate.get("revision", ""))):
            errors.append(f"{prefix}.revision must be a 40-character commit SHA")
        artifact = str(candidate.get("artifact_sha256", ""))
        if not SHA64.fullmatch(artifact):
            errors.append(f"{prefix}.artifact_sha256 must be a 64-character SHA-256")
        elif artifact in seen_artifacts:
            errors.append(f"{prefix}.artifact_sha256 is duplicated")
        else:
            seen_artifacts.add(artifact)
        if not isinstance(candidate.get("file_size_bytes"), int) or candidate["file_size_bytes"] <= 0:
            errors.append(f"{prefix}.file_size_bytes must be a positive integer")

    return errors


def validate_tasks(tasks: Any) -> list[str]:
    if not isinstance(tasks, list) or not tasks:
        return ["tasks must be a non-empty array"]

    errors: list[str] = []
    seen_ids: set[str] = set()
    for index, task in enumerate(tasks):
        prefix = f"tasks[{index}]"
        if not isinstance(task, dict):
            errors.append(f"{prefix} must be an object")
            continue
        task_id = task.get("id")
        if not isinstance(task_id, str) or not task_id:
            errors.append(f"{prefix}.id must be a non-empty string")
        elif task_id in seen_ids:
            errors.append(f"{prefix}.id duplicates {task_id}")
        else:
            seen_ids.add(task_id)
        if not isinstance(task.get("category"), str) or not task["category"]:
            errors.append(f"{prefix}.category must be a non-empty string")
        if not isinstance(task.get("weight", 1), (int, float)) or task.get("weight", 1) <= 0:
            errors.append(f"{prefix}.weight must be positive")
        messages = task.get("messages")
        if not isinstance(messages, list) or not messages:
            errors.append(f"{prefix}.messages must be a non-empty array")
        grader = task.get("grader")
        if not isinstance(grader, dict) or grader.get("type") not in GRADER_TYPES:
            errors.append(f"{prefix}.grader.type must be one of {sorted(GRADER_TYPES)}")
    return errors


def _response_message(response: dict[str, Any]) -> dict[str, Any]:
    choices = response.get("choices")
    if not isinstance(choices, list) or not choices or not isinstance(choices[0], dict):
        raise ValueError("response has no choices[0]")
    message = choices[0].get("message")
    if not isinstance(message, dict):
        raise ValueError("response has no choices[0].message")
    return message


def _normalize_text(value: Any, *, case_sensitive: bool = True) -> str:
    text = " ".join(str(value).strip().split())
    return text if case_sensitive else text.casefold()


def _json_from_content(content: Any) -> Any:
    if not isinstance(content, str):
        raise ValueError("message content is not a string")
    text = content.strip()
    if text.startswith("```") and text.endswith("```"):
        lines = text.splitlines()
        if len(lines) >= 3:
            text = "\n".join(lines[1:-1]).strip()
    return json.loads(text)


def grade_response(task: dict[str, Any], response: dict[str, Any]) -> dict[str, Any]:
    grader = task["grader"]
    grader_type = grader["type"]
    try:
        message = _response_message(response)
        content = message.get("content")

        if grader_type == "exact":
            expected = _normalize_text(
                grader["expected"], case_sensitive=grader.get("case_sensitive", True)
            )
            actual = _normalize_text(
                content, case_sensitive=grader.get("case_sensitive", True)
            )
            passed = actual == expected
            detail = "exact match" if passed else f"expected {expected!r}, got {actual!r}"
        elif grader_type == "json_exact":
            actual_json = _json_from_content(content)
            passed = actual_json == grader["expected"]
            detail = (
                "JSON match"
                if passed
                else f"expected {grader['expected']!r}, got {actual_json!r}"
            )
        elif grader_type == "regex":
            if not isinstance(content, str):
                raise ValueError("message content is not a string")
            flags = re.IGNORECASE if grader.get("ignore_case") else 0
            match = re.fullmatch(grader["pattern"], content.strip(), flags=flags)
            passed = match is not None
            detail = "regex match" if passed else "response did not match the required pattern"
        elif grader_type == "contains_all":
            actual = _normalize_text(
                content, case_sensitive=grader.get("case_sensitive", False)
            )
            expected_parts = [
                _normalize_text(part, case_sensitive=grader.get("case_sensitive", False))
                for part in grader["expected"]
            ]
            missing = [part for part in expected_parts if part not in actual]
            passed = not missing
            detail = "all required text present" if passed else f"missing {missing!r}"
        else:
            tool_calls = message.get("tool_calls")
            if not isinstance(tool_calls, list) or len(tool_calls) != 1:
                raise ValueError("expected exactly one structured tool call")
            function = tool_calls[0].get("function")
            if not isinstance(function, dict):
                raise ValueError("tool call has no function object")
            arguments = function.get("arguments")
            if isinstance(arguments, str):
                arguments = json.loads(arguments)
            passed = function.get("name") == grader["name"] and arguments == grader["arguments"]
            detail = (
                "tool call match"
                if passed
                else f"expected {grader['name']} {grader['arguments']!r}, "
                f"got {function.get('name')} {arguments!r}"
            )
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        passed = False
        detail = f"grader error: {error}"

    return {"passed": passed, "score": 1.0 if passed else 0.0, "detail": detail[:500]}


def _wilson_interval(successes: int, total: int, z: float = 1.96) -> list[float]:
    if total == 0:
        return [0.0, 0.0]
    proportion = successes / total
    denominator = 1 + z * z / total
    centre = proportion + z * z / (2 * total)
    margin = z * math.sqrt(
        proportion * (1 - proportion) / total + z * z / (4 * total * total)
    )
    return [
        max(0.0, (centre - margin) / denominator),
        min(1.0, (centre + margin) / denominator),
    ]


def aggregate_trials(trials: list[dict[str, Any]]) -> dict[str, Any]:
    total_weight = sum(float(trial.get("weight", 1.0)) for trial in trials)
    passed_weight = sum(
        float(trial.get("weight", 1.0)) for trial in trials if trial.get("passed")
    )
    successes = sum(1 for trial in trials if trial.get("passed"))
    categories: dict[str, list[dict[str, Any]]] = defaultdict(list)
    tasks: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for trial in trials:
        categories[str(trial["category"])].append(trial)
        tasks[str(trial["task_id"])].append(trial)

    by_category = {}
    for category, category_trials in sorted(categories.items()):
        category_weight = sum(float(trial.get("weight", 1.0)) for trial in category_trials)
        category_passed = sum(
            float(trial.get("weight", 1.0))
            for trial in category_trials
            if trial.get("passed")
        )
        by_category[category] = {
            "pass_at_1": category_passed / category_weight if category_weight else 0.0,
            "attempts": len(category_trials),
        }

    fully_reliable = sum(
        1 for task_trials in tasks.values() if all(trial.get("passed") for trial in task_trials)
    )
    return {
        "pass_at_1": passed_weight / total_weight if total_weight else 0.0,
        "confidence_interval_95": _wilson_interval(successes, len(trials)),
        "reliability": fully_reliable / len(tasks) if tasks else 0.0,
        "tasks": len(tasks),
        "attempts": len(trials),
        "passed_attempts": successes,
        "by_category": by_category,
    }


def _load_capability_results(path: str | Path) -> list[dict[str, Any]]:
    result_path = Path(path)
    files = sorted(result_path.glob("*.json")) if result_path.is_dir() else [result_path]
    results = []
    for file in files:
        with file.open(encoding="utf-8") as handle:
            result = json.load(handle)
        if isinstance(result, dict) and "candidate" in result and "aggregate" in result:
            results.append(result)
    if not results:
        raise ValueError(f"No capability result JSON found at {result_path}")
    return results


def _load_performance(
    performance_path: str | None, api_url: str | None, device: str | None
) -> dict[str, Any]:
    if performance_path:
        with Path(performance_path).open(encoding="utf-8") as file:
            return json.load(file)
    if not api_url or not device:
        raise ValueError("provide --performance or both --api-url and --device")
    if device == "auto":
        device = detect_macos_chip_id()
    url = f"{api_url.rstrip('/')}/api/v0/performance?device={urllib.parse.quote(device)}"
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.load(response)


def detect_macos_chip_id() -> str:
    if sys.platform != "darwin":
        raise ValueError("automatic device detection currently supports macOS only")

    def run(*command: str) -> str:
        return subprocess.check_output(command, text=True).strip()

    cpu = run("sysctl", "-n", "machdep.cpu.brand_string")
    cpu_cores = int(run("sysctl", "-n", "hw.ncpu"))
    ram_gb = round(int(run("sysctl", "-n", "hw.memsize")) / 1024 / 1024 / 1024)
    displays = run("system_profiler", "SPDisplaysDataType", "-detailLevel", "mini")
    gpu_match = re.search(r"Chipset Model:\s*(.+)", displays)
    cores_match = re.search(r"Total Number of Cores:\s*(\d+)", displays)
    if not gpu_match or not cores_match:
        raise ValueError("could not detect the Apple GPU model and core count")
    gpu = gpu_match.group(1).strip()
    gpu_cores = int(cores_match.group(1))
    return f"{cpu}:{cpu_cores}:{gpu}:{gpu_cores}:{ram_gb}"


def join_capability_performance(
    capability_results: list[dict[str, Any]], performance: dict[str, Any]
) -> dict[str, Any]:
    performance_rows = performance.get("rows", [])
    joined = []
    unmatched = []

    for capability in capability_results:
        candidate = capability["candidate"]
        exact = [
            row
            for row in performance_rows
            if row.get("artifact_sha256") == candidate["artifact_sha256"]
            and row.get("runtime_name") == "llama.cpp"
        ]
        match_method = "artifact_sha256"
        if not exact:
            exact = [
                row
                for row in performance_rows
                if row.get("repo_id") == candidate["repo_id"]
                and row.get("filename") == candidate["filename"]
                and row.get("runtime_name") == "llama.cpp"
            ]
            match_method = "repo_id+filename"

        if not exact:
            unmatched.append(candidate)
            continue

        exact.sort(
            key=lambda row: (
                int(row.get("context_length") or 0),
                int(row.get("trial_count") or 0),
            ),
            reverse=True,
        )
        hardware = exact[0]
        joined.append(
            {
                "candidate_id": candidate["id"],
                "repo_id": candidate["repo_id"],
                "filename": candidate["filename"],
                "quant": candidate["quant"],
                "artifact_sha256": candidate["artifact_sha256"],
                "file_size_bytes": candidate["file_size_bytes"],
                "capability": capability["aggregate"]["pass_at_1"],
                "reliability": capability["aggregate"]["reliability"],
                "confidence_interval_95": capability["aggregate"][
                    "confidence_interval_95"
                ],
                "avg_decode_tps": hardware["avg_decode_tps"],
                "avg_prefill_tps": hardware["avg_prefill_tps"],
                "avg_peak_rss_mb": hardware["avg_peak_rss_mb"],
                "context_length": hardware["context_length"],
                "runtime_versions": hardware.get("runtime_versions", []),
                "match_method": match_method,
                "kv_compatibility": (
                    "exact"
                    if hardware.get("kv_cache_type_k")
                    == capability["inference"].get("kv_cache_type_k")
                    and hardware.get("kv_cache_type_v")
                    == capability["inference"].get("kv_cache_type_v")
                    else "unknown"
                    if not hardware.get("kv_cache_type_k")
                    else "different"
                ),
            }
        )

    frontier = []
    for row in joined:
        dominated = False
        for other in joined:
            if row is other:
                continue
            at_least_as_good = (
                other["capability"] >= row["capability"]
                and other["reliability"] >= row["reliability"]
                and other["avg_decode_tps"] >= row["avg_decode_tps"]
                and other["avg_prefill_tps"] >= row["avg_prefill_tps"]
                and other["avg_peak_rss_mb"] <= row["avg_peak_rss_mb"]
                and other["context_length"] >= row["context_length"]
            )
            strictly_better = (
                other["capability"] > row["capability"]
                or other["reliability"] > row["reliability"]
                or other["avg_decode_tps"] > row["avg_decode_tps"]
                or other["avg_prefill_tps"] > row["avg_prefill_tps"]
                or other["avg_peak_rss_mb"] < row["avg_peak_rss_mb"]
                or other["context_length"] > row["context_length"]
            )
            if at_least_as_good and strictly_better:
                dominated = True
                break
        row["pareto_optimal"] = not dominated
        if not dominated:
            frontier.append(row["candidate_id"])

    joined.sort(key=lambda row: (not row["pareto_optimal"], -row["capability"], row["file_size_bytes"]))
    return {
        "schema_version": "1",
        "device": performance.get("device"),
        "pareto_frontier": frontier,
        "rows": joined,
        "unmatched_candidates": unmatched,
    }


def _markdown_report(report: dict[str, Any]) -> str:
    lines = [
        "# Task-specific model frontier",
        "",
        f"Device: `{report.get('device')}`",
        "",
        "| Candidate | Capability | Reliability | Decode tok/s | Peak MiB | Context | Frontier |",
        "| --- | ---: | ---: | ---: | ---: | ---: | :---: |",
    ]
    for row in report["rows"]:
        lines.append(
            f"| {row['candidate_id']} | {row['capability']:.1%} | "
            f"{row['reliability']:.1%} | {row['avg_decode_tps']:.1f} | "
            f"{row['avg_peak_rss_mb']:.0f} | {row['context_length']} | "
            f"{'yes' if row['pareto_optimal'] else 'no'} |"
        )
    if report["unmatched_candidates"]:
        lines.extend(
            [
                "",
                "Unmatched capability candidates were excluded until exact whatcani.run "
                "hardware data is available.",
            ]
        )
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate_parser = subparsers.add_parser("validate", help="validate pinned models and suite")
    validate_parser.add_argument("--config", default=str(Path(__file__).with_name("models.json")))

    suite_parser = subparsers.add_parser("suite", help="emit the built-in screening suite")
    suite_parser.add_argument("--output")

    report_parser = subparsers.add_parser("report", help="join results to hardware performance")
    report_parser.add_argument("--results", required=True)
    report_parser.add_argument("--performance")
    report_parser.add_argument("--api-url", default="https://whatcani.run")
    report_parser.add_argument("--device", default="auto")
    report_parser.add_argument("--output", required=True)

    args = parser.parse_args()
    if args.command == "validate":
        config = load_config(args.config)
        tasks = build_screening_tasks()
        errors = validate_tasks(tasks)
        if errors:
            raise SystemExit("Invalid screening suite:\n- " + "\n- ".join(errors))
        print(
            json.dumps(
                {
                    "benchmark_id": config["benchmark_id"],
                    "candidates": len(config["candidates"]),
                    "tasks": len(tasks),
                    "suite_sha256": suite_sha256(tasks),
                },
                indent=2,
            )
        )
    elif args.command == "suite":
        content = "".join(json.dumps(task, sort_keys=True) + "\n" for task in build_screening_tasks())
        if args.output:
            Path(args.output).write_text(content, encoding="utf-8")
        else:
            print(content, end="")
    else:
        capability = _load_capability_results(args.results)
        performance = _load_performance(args.performance, args.api_url, args.device)
        report = join_capability_performance(capability, performance)
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        output.with_suffix(".md").write_text(_markdown_report(report), encoding="utf-8")
        print(json.dumps({"frontier": report["pareto_frontier"], "output": str(output)}, indent=2))


if __name__ == "__main__":
    main()
