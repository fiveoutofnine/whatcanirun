"""Modal runner for exact-GGUF capability evaluation with pinned llama.cpp."""

from __future__ import annotations

import json
import subprocess
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import modal

from benchmark import aggregate_trials, grade_response, load_config, validate_tasks
from screening_suite import build_screening_tasks, suite_sha256


ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "models.json"
LLAMA_CPP_COMMIT = "f280b26983ad0fdb705a0d9ebf0503e76f2899b0"
SERVER_BIN = "/opt/llama.cpp/build/bin/llama-server"
SERVER_PORT = 8080

app = modal.App("whatcanirun-capability")
model_cache = modal.Volume.from_name("whatcanirun-gguf-cache", create_if_missing=True)

image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.8.1-devel-ubuntu24.04",
        add_python="3.12",
    )
    .apt_install("build-essential", "cmake", "git", "ninja-build")
    .run_commands(
        "git clone https://github.com/ggml-org/llama.cpp.git /opt/llama.cpp",
        f"git -C /opt/llama.cpp checkout {LLAMA_CPP_COMMIT}",
        "cmake -S /opt/llama.cpp -B /opt/llama.cpp/build -G Ninja "
        "-DGGML_CUDA=ON -DLLAMA_CURL=OFF -DCMAKE_BUILD_TYPE=Release",
        "cmake --build /opt/llama.cpp/build --target llama-server --parallel",
    )
    .pip_install(
        "huggingface-hub==1.28.0",
        "httpx==0.28.1",
    )
    .add_local_file(str(ROOT / "benchmark.py"), "/root/benchmark.py")
    .add_local_file(str(ROOT / "screening_suite.py"), "/root/screening_suite.py")
)


def _wait_for_server(process: subprocess.Popen[str], log_path: Path) -> None:
    import httpx

    deadline = time.monotonic() + 15 * 60
    while time.monotonic() < deadline:
        if process.poll() is not None:
            log = log_path.read_text(encoding="utf-8", errors="replace")[-8000:]
            raise RuntimeError(f"llama-server exited during startup:\n{log}")
        try:
            response = httpx.get(
                f"http://127.0.0.1:{SERVER_PORT}/health",
                timeout=5,
            )
            if response.status_code == 200:
                return
        except httpx.HTTPError:
            pass
        time.sleep(2)
    raise TimeoutError("llama-server did not become healthy within 15 minutes")


def _compact_response(response: dict[str, Any]) -> dict[str, Any]:
    choices = response.get("choices", [])
    choice = choices[0] if isinstance(choices, list) and choices else {}
    return {
        "model": response.get("model"),
        "choices": [
            {
                "finish_reason": choice.get("finish_reason"),
                "message": choice.get("message"),
            }
        ],
        "usage": response.get("usage"),
        "timings": response.get("timings"),
    }


@app.function(
    image=image,
    gpu="L40S",
    cpu=4.0,
    memory=32768,
    timeout=3 * 60 * 60,
    volumes={"/models": model_cache},
)
def evaluate_candidate(payload: dict[str, Any]) -> dict[str, Any]:
    import httpx
    from huggingface_hub import hf_hub_download

    candidate = payload["candidate"]
    inference = payload["inference"]
    decoding = payload["decoding"]
    tasks = payload["tasks"]

    model_path = Path(
        hf_hub_download(
            repo_id=candidate["repo_id"],
            filename=candidate["filename"],
            revision=candidate["revision"],
            cache_dir="/models/huggingface",
        )
    )
    actual_size = model_path.stat().st_size
    if actual_size != candidate["file_size_bytes"]:
        raise RuntimeError(
            f"size mismatch for {candidate['filename']}: "
            f"expected {candidate['file_size_bytes']}, got {actual_size}"
        )
    model_cache.commit()

    log_path = Path(f"/tmp/{candidate['id']}-llama-server.log")
    with log_path.open("w", encoding="utf-8") as log_file:
        command = [
            SERVER_BIN,
            "--model",
            str(model_path),
            "--host",
            "127.0.0.1",
            "--port",
            str(SERVER_PORT),
            "--ctx-size",
            str(inference["context_length"]),
            "--n-gpu-layers",
            str(inference["gpu_layers"]),
            "--cache-type-k",
            inference["kv_cache_type_k"],
            "--cache-type-v",
            inference["kv_cache_type_v"],
            "--parallel",
            str(inference["parallel_slots"]),
            "--jinja",
            "--no-webui",
            "--flash-attn",
            "on" if inference["flash_attention"] else "off",
        ]
        process = subprocess.Popen(
            command,
            stdout=log_file,
            stderr=subprocess.STDOUT,
            text=True,
        )

        try:
            _wait_for_server(process, log_path)
            trials = []
            with httpx.Client(timeout=15 * 60) as client:
                for seed in decoding["seeds"]:
                    for task in tasks:
                        request = {
                            "model": candidate["filename"],
                            "messages": task["messages"],
                            "temperature": decoding["temperature"],
                            "top_p": decoding["top_p"],
                            "top_k": decoding["top_k"],
                            "min_p": decoding["min_p"],
                            "seed": seed,
                            "max_tokens": decoding["max_tokens"],
                            "stream": False,
                            "chat_template_kwargs": decoding.get(
                                "chat_template_kwargs", {}
                            ),
                        }
                        reasoning_effort = decoding.get("chat_template_kwargs", {}).get(
                            "reasoning_effort"
                        )
                        if reasoning_effort:
                            request["reasoning_effort"] = reasoning_effort
                        if task.get("tools"):
                            request["tools"] = task["tools"]
                            request["tool_choice"] = task.get("tool_choice", "auto")
                            request["parse_tool_calls"] = True
                            request["parallel_tool_calls"] = False

                        started = time.monotonic()
                        try:
                            api_response = client.post(
                                f"http://127.0.0.1:{SERVER_PORT}/v1/chat/completions",
                                json=request,
                            )
                            api_response.raise_for_status()
                            response = _compact_response(api_response.json())
                            grade = grade_response(task, response)
                            error = None
                        except Exception as exception:
                            response = {"choices": []}
                            grade = {
                                "passed": False,
                                "score": 0.0,
                                "detail": f"inference error: {exception}"[:500],
                            }
                            error = str(exception)[:1000]

                        trials.append(
                            {
                                "task_id": task["id"],
                                "category": task["category"],
                                "weight": task.get("weight", 1.0),
                                "seed": seed,
                                "latency_ms": round((time.monotonic() - started) * 1000, 2),
                                "passed": grade["passed"],
                                "score": grade["score"],
                                "grade_detail": grade["detail"],
                                "error": error,
                                "response": response,
                            }
                        )
        finally:
            process.terminate()
            try:
                process.wait(timeout=20)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=10)

    return {
        "schema_version": "1",
        "benchmark_id": payload["benchmark_id"],
        "round": payload["round"],
        "created_at": datetime.now(UTC).isoformat(),
        "suite_sha256": payload["suite_sha256"],
        "candidate": candidate,
        "engine": payload["engine"],
        "inference": inference,
        "decoding": decoding,
        "aggregate": aggregate_trials(trials),
        "trials": trials,
    }


@app.local_entrypoint()
def main(
    config: str = str(CONFIG_PATH),
    round: str = "screening",
    candidates: str = "",
    output_dir: str = "results",
) -> None:
    benchmark_config = load_config(config)
    if benchmark_config["engine"]["commit"] != LLAMA_CPP_COMMIT:
        raise ValueError(
            "models.json engine commit differs from the commit baked into the Modal image"
        )
    if round not in benchmark_config["rounds"]:
        raise ValueError(f"unknown round {round!r}")

    tasks = build_screening_tasks()
    task_errors = validate_tasks(tasks)
    if task_errors:
        raise ValueError("Invalid task suite:\n- " + "\n- ".join(task_errors))

    selected_ids = {value.strip() for value in candidates.split(",") if value.strip()}
    selected = [
        candidate
        for candidate in benchmark_config["candidates"]
        if not selected_ids or candidate["id"] in selected_ids
    ]
    missing = selected_ids - {candidate["id"] for candidate in selected}
    if missing:
        raise ValueError(f"unknown candidate IDs: {sorted(missing)}")

    digest = suite_sha256(tasks)
    payloads = [
        {
            "benchmark_id": benchmark_config["benchmark_id"],
            "round": round,
            "suite_sha256": digest,
            "engine": benchmark_config["engine"],
            "inference": benchmark_config["inference"],
            "decoding": benchmark_config["rounds"][round],
            "candidate": candidate,
            "tasks": tasks,
        }
        for candidate in selected
    ]

    destination = Path(output_dir) / benchmark_config["benchmark_id"] / round
    destination.mkdir(parents=True, exist_ok=True)
    failures = []
    for candidate, result in zip(
        selected,
        evaluate_candidate.map(payloads, return_exceptions=True),
        strict=True,
    ):
        if isinstance(result, BaseException):
            failures.append({"candidate_id": candidate["id"], "error": str(result)})
            continue
        output = destination / f"{candidate['id']}.json"
        output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print(
            f"{candidate['id']}: {result['aggregate']['pass_at_1']:.1%} "
            f"({output})"
        )

    if failures:
        failure_path = destination / "failures.json"
        failure_path.write_text(json.dumps(failures, indent=2) + "\n", encoding="utf-8")
        raise RuntimeError(f"{len(failures)} candidate(s) failed; see {failure_path}")
