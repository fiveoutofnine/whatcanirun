from __future__ import annotations

import unittest
from pathlib import Path

from benchmark import (
    aggregate_trials,
    grade_response,
    join_capability_performance,
    load_config,
    validate_tasks,
)
from screening_suite import build_screening_tasks


ROOT = Path(__file__).resolve().parent


class CapabilityBenchmarkTest(unittest.TestCase):
    def test_pinned_config_and_screening_suite_are_valid(self) -> None:
        config = load_config(ROOT / "models.json")
        tasks = build_screening_tasks()

        self.assertEqual(len(config["candidates"]), 6)
        self.assertEqual(len(tasks), 120)
        self.assertEqual(validate_tasks(tasks), [])
        self.assertEqual(len({task["id"] for task in tasks}), 120)

    def test_exact_and_json_graders(self) -> None:
        exact = {
            "grader": {"type": "exact", "expected": "42"},
        }
        json_task = {
            "grader": {"type": "json_exact", "expected": {"active": True, "quota": 7}},
        }

        self.assertTrue(
            grade_response(
                exact,
                {"choices": [{"message": {"content": " 42\n"}}]},
            )["passed"]
        )
        self.assertTrue(
            grade_response(
                json_task,
                {
                    "choices": [
                        {"message": {"content": '```json\n{"active": true, "quota": 7}\n```'}}
                    ]
                },
            )["passed"]
        )

    def test_tool_grader_requires_structured_exact_arguments(self) -> None:
        task = {
            "grader": {
                "type": "tool_call",
                "name": "search_docs",
                "arguments": {"query": "retry policy", "limit": 3},
            }
        }
        response = {
            "choices": [
                {
                    "message": {
                        "content": None,
                        "tool_calls": [
                            {
                                "function": {
                                    "name": "search_docs",
                                    "arguments": '{"query":"retry policy","limit":3}',
                                }
                            }
                        ],
                    }
                }
            ]
        }

        self.assertTrue(grade_response(task, response)["passed"])

    def test_aggregation_reports_seed_reliability(self) -> None:
        trials = [
            {"task_id": "a", "category": "reasoning", "passed": True, "weight": 1},
            {"task_id": "a", "category": "reasoning", "passed": True, "weight": 1},
            {"task_id": "b", "category": "reasoning", "passed": True, "weight": 1},
            {"task_id": "b", "category": "reasoning", "passed": False, "weight": 1},
        ]

        aggregate = aggregate_trials(trials)

        self.assertEqual(aggregate["pass_at_1"], 0.75)
        self.assertEqual(aggregate["reliability"], 0.5)
        self.assertEqual(aggregate["tasks"], 2)
        self.assertEqual(aggregate["attempts"], 4)

    def test_join_uses_artifact_identity_and_marks_dominated_rows(self) -> None:
        config = load_config(ROOT / "models.json")
        candidates = config["candidates"][:3]
        scores = [(0.9, 0.8), (0.8, 0.7), (0.7, 0.6)]
        capability = [
            {
                "candidate": candidate,
                "inference": config["inference"],
                "aggregate": {
                    "pass_at_1": score,
                    "reliability": reliability,
                    "confidence_interval_95": [score - 0.05, score + 0.05],
                },
            }
            for candidate, (score, reliability) in zip(candidates, scores, strict=True)
        ]
        performance_values = [
            (10.0, 100.0, 10000.0),
            (20.0, 200.0, 5000.0),
            (15.0, 150.0, 6000.0),
        ]
        performance = {
            "device": "Apple M4 Max:16:Apple M4 Max:40:64",
            "rows": [
                {
                    "artifact_sha256": candidate["artifact_sha256"],
                    "repo_id": candidate["repo_id"],
                    "filename": candidate["filename"],
                    "runtime_name": "llama.cpp",
                    "runtime_versions": ["b9999"],
                    "context_length": 5120,
                    "trial_count": 10,
                    "avg_decode_tps": values[0],
                    "avg_prefill_tps": values[1],
                    "avg_peak_rss_mb": values[2],
                    "kv_cache_type_k": None,
                    "kv_cache_type_v": None,
                }
                for candidate, values in zip(candidates, performance_values, strict=True)
            ],
        }

        report = join_capability_performance(capability, performance)
        by_id = {row["candidate_id"]: row for row in report["rows"]}

        self.assertTrue(by_id[candidates[0]["id"]]["pareto_optimal"])
        self.assertTrue(by_id[candidates[1]["id"]]["pareto_optimal"])
        self.assertFalse(by_id[candidates[2]["id"]]["pareto_optimal"])
        self.assertEqual(by_id[candidates[0]["id"]]["match_method"], "artifact_sha256")


if __name__ == "__main__":
    unittest.main()
