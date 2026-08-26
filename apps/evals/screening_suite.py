"""Deterministic, objectively graded first-round capability screening tasks."""

from __future__ import annotations

import hashlib
import json
from typing import Any


def build_screening_tasks() -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []

    for index in range(30):
        a = 17 + index * 3
        b = 2 + index % 7
        c = 11 * index + 5
        d = index % 5 + 1
        expected = a * b + c - d
        tasks.append(
            {
                "id": f"reasoning-{index + 1:03d}",
                "category": "multi_step_reasoning",
                "weight": 1.0,
                "messages": [
                    {
                        "role": "user",
                        "content": (
                            f"Compute ({a} × {b}) + {c} - {d}. "
                            "Reply with only the integer result."
                        ),
                    }
                ],
                "grader": {"type": "exact", "expected": str(expected)},
            }
        )

    names = [
        "Ada Chen",
        "Luis Ortega",
        "Mina Park",
        "Owen Jones",
        "Priya Shah",
        "Ravi Singh",
    ]
    departments = ["Platform", "Design", "Finance", "Research", "Support"]
    for index in range(30):
        employee_id = f"E{4100 + index}"
        active = index % 3 != 0
        quota = 12 + (index * 7) % 41
        name = names[index % len(names)]
        department = departments[(index * 2) % len(departments)]
        tasks.append(
            {
                "id": f"structured-{index + 1:03d}",
                "category": "structured_output",
                "weight": 1.0,
                "messages": [
                    {
                        "role": "user",
                        "content": (
                            "Extract employee_id, active, and quota from this record. "
                            "Return one JSON object with exactly those keys; active must be a "
                            "boolean and quota must be an integer.\n\n"
                            f"name={name}; department={department}; quota={quota}; "
                            f"employee_id={employee_id}; active={'yes' if active else 'no'}"
                        ),
                    }
                ],
                "grader": {
                    "type": "json_exact",
                    "expected": {
                        "employee_id": employee_id,
                        "active": active,
                        "quota": quota,
                    },
                },
            }
        )

    cities = ["Tokyo", "Lima", "Oslo", "Accra", "Austin", "Seoul"]
    warehouses = ["west", "central", "east"]
    doc_queries = [
        "retry policy",
        "schema migration",
        "rate limits",
        "cache invalidation",
        "webhook signing",
    ]
    for index in range(30):
        variant = index % 3
        if variant == 0:
            function_name = "get_weather"
            arguments = {
                "city": cities[(index // 3) % len(cities)],
                "unit": "celsius" if index % 2 == 0 else "fahrenheit",
            }
            tools = [
                {
                    "type": "function",
                    "function": {
                        "name": function_name,
                        "description": "Get the current weather for a city.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "city": {"type": "string"},
                                "unit": {
                                    "type": "string",
                                    "enum": ["celsius", "fahrenheit"],
                                },
                            },
                            "required": ["city", "unit"],
                            "additionalProperties": False,
                        },
                    },
                }
            ]
            prompt = (
                f"Check the weather in {arguments['city']} using {arguments['unit']}. "
                "Call the available function; do not answer from memory."
            )
        elif variant == 1:
            function_name = "lookup_inventory"
            arguments = {
                "sku": f"SKU-{700 + index}",
                "warehouse": warehouses[index % len(warehouses)],
                "include_reserved": index % 2 == 0,
            }
            tools = [
                {
                    "type": "function",
                    "function": {
                        "name": function_name,
                        "description": "Look up stock for a product.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "sku": {"type": "string"},
                                "warehouse": {"type": "string"},
                                "include_reserved": {"type": "boolean"},
                            },
                            "required": ["sku", "warehouse", "include_reserved"],
                            "additionalProperties": False,
                        },
                    },
                }
            ]
            prompt = (
                f"Look up {arguments['sku']} in the {arguments['warehouse']} warehouse. "
                f"Set include_reserved to {str(arguments['include_reserved']).lower()}."
            )
        else:
            function_name = "search_docs"
            arguments = {
                "query": doc_queries[index % len(doc_queries)],
                "limit": 2 + index % 4,
            }
            tools = [
                {
                    "type": "function",
                    "function": {
                        "name": function_name,
                        "description": "Search internal documentation.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {"type": "string"},
                                "limit": {"type": "integer", "minimum": 1, "maximum": 10},
                            },
                            "required": ["query", "limit"],
                            "additionalProperties": False,
                        },
                    },
                }
            ]
            prompt = (
                f"Search the docs for '{arguments['query']}' and return at most "
                f"{arguments['limit']} results. Use the function."
            )

        tasks.append(
            {
                "id": f"tool-{index + 1:03d}",
                "category": "tool_use",
                "weight": 1.0,
                "messages": [{"role": "user", "content": prompt}],
                "tools": tools,
                "tool_choice": "required",
                "grader": {
                    "type": "tool_call",
                    "name": function_name,
                    "arguments": arguments,
                },
            }
        )

    for index in range(30):
        values = [
            (index * 7 + 11) % 31,
            (index * 5 + 3) % 31,
            (index * 7 + 11) % 31,
            (index * 13 + 2) % 31,
            (index * 3 + 19) % 31,
            (index * 5 + 3) % 31,
            (index * 17 + 7) % 31,
        ]
        expected = ",".join(str(value) for value in sorted(set(values)))
        tasks.append(
            {
                "id": f"instruction-{index + 1:03d}",
                "category": "instruction_following",
                "weight": 1.0,
                "messages": [
                    {
                        "role": "user",
                        "content": (
                            "Sort these integers ascending, remove duplicates, and reply with "
                            "only a comma-separated list containing no spaces: "
                            + ", ".join(str(value) for value in values)
                        ),
                    }
                ],
                "grader": {"type": "exact", "expected": expected},
            }
        )

    return tasks


def suite_sha256(tasks: list[dict[str, Any]]) -> str:
    canonical = json.dumps(tasks, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(canonical).hexdigest()
