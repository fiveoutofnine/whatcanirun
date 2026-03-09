import { defineCommand } from "citty";
import { resolveModel, inspectModel } from "../model/resolve.ts";
import { resolveRuntime } from "../runtime/resolve.ts";
import { detectDevice } from "../device/detect.ts";
import { getScenario, VALID_SCENARIOS } from "../scenarios/registry.ts";
import { runTrial } from "../metrics/collector.ts";
import { computeAggregates } from "../metrics/aggregator.ts";
import { MemoryTracker } from "../metrics/memory.ts";
import { createBundle } from "../bundle/create.ts";
import { validateBundle } from "../bundle/validate.ts";
import { uploadBundle } from "../upload/client.ts";
import { LogCollector } from "../utils/log.ts";
import * as log from "../utils/log.ts";

export const runCommand = defineCommand({
  meta: {
    name: "run",
    description: "Run a benchmark and optionally submit results",
  },
  args: {
    model: {
      type: "string",
      description: "Model reference (file path or alias)",
      required: true,
    },
    runtime: {
      type: "string",
      description: "Runtime to use (mlx, llama.cpp, vllm)",
      required: true,
    },
    scenario: {
      type: "string",
      description: "Benchmark scenario (chat_short_v1, chat_long_v1)",
      default: "chat_short_v1",
    },
    quant: {
      type: "string",
      description: "Quantization label (e.g. q4_k_m, fp16)",
    },
    format: {
      type: "string",
      description: "Model file format (gguf, mlx, safetensors)",
    },
    trials: {
      type: "string",
      description: "Number of measured trials",
      default: "5",
    },
    warmups: {
      type: "string",
      description: "Number of warmup runs",
      default: "2",
    },
    "runtime-flags": {
      type: "string",
      description: "Additional runtime flags (quoted string)",
    },
    notes: {
      type: "string",
      description: "Optional user note",
    },
    "no-submit": {
      type: "boolean",
      description: "Run benchmark but do not upload",
      default: false,
    },
    output: {
      type: "string",
      description: "Bundle output directory",
      default: "./bundles",
    },
    nonce: {
      type: "string",
      description: "Optional anti-replay nonce",
    },
  },
  async run({ args }) {
    const harnessLog = new LogCollector();
    const runtimeLog = new LogCollector();

    const numTrials = parseInt(args.trials as string, 10);
    const numWarmups = parseInt(args.warmups as string, 10);
    const scenarioId = args.scenario as string;

    // Validate scenario
    if (
      !VALID_SCENARIOS.includes(scenarioId as (typeof VALID_SCENARIOS)[number])
    ) {
      log.error(
        `Invalid scenario '${scenarioId}'. Valid: ${VALID_SCENARIOS.join(", ")}`,
      );
      process.exit(1);
    }

    // Resolve model
    harnessLog.append(`Resolving model: ${args.model}`);
    let modelPath: string;
    try {
      modelPath = await resolveModel(args.model as string);
    } catch (e: unknown) {
      log.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
    harnessLog.append(`Model resolved: ${modelPath}`);

    // Inspect model
    const modelInfo = await inspectModel(modelPath);
    if (args.format) {
      modelInfo.format = args.format as string;
    }

    // Detect device
    harnessLog.append("Detecting device...");
    const device = await detectDevice();
    log.label("Device", `${device.cpu_model} (${device.ram_gb}GB)`);

    // Resolve and detect runtime
    harnessLog.append(`Resolving runtime: ${args.runtime}`);
    let adapter;
    try {
      adapter = resolveRuntime(args.runtime as string);
    } catch (e: unknown) {
      log.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }

    const runtimeInfo = await adapter.detect();
    if (!runtimeInfo) {
      log.error(
        `Runtime '${args.runtime}' is not available. Make sure it is installed and on PATH.`,
      );
      process.exit(1);
    }
    log.label("Runtime", `${adapter.name} ${runtimeInfo.version}`);
    harnessLog.append(
      `Runtime detected: ${adapter.name} ${runtimeInfo.version}`,
    );

    // Load scenario
    const scenario = await getScenario(scenarioId);
    log.label("Scenario", scenario.id);
    log.label("Trials", `${numTrials} (warmups: ${numWarmups})`);
    log.blank();

    // Determine canonicity
    const canonical =
      scenario.batch_size === 1 &&
      scenario.temperature === 0 &&
      scenario.top_p === 1 &&
      numTrials >= 5 &&
      numWarmups >= 2;

    const generateOpts = {
      modelPath,
      prompt: scenario.prompt,
      maxTokens: scenario.output_tokens,
      temperature: scenario.temperature,
      topP: scenario.top_p,
      runtimeFlags: args["runtime-flags"] as string | undefined,
    };

    const memTracker = new MemoryTracker();

    // Warmup runs
    if (numWarmups > 0) {
      log.info(`Running ${numWarmups} warmup(s)...`);
      for (let i = 0; i < numWarmups; i++) {
        harnessLog.append(`Warmup ${i + 1}/${numWarmups}`);
        try {
          await runTrial(
            adapter,
            generateOpts,
            scenario.input_tokens,
            memTracker,
          );
        } catch (e: unknown) {
          harnessLog.append(
            `Warmup ${i + 1} error: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
        process.stdout.write(".");
      }
      console.log();
    }

    // Measured trials
    log.info("Running benchmark...");
    const trials = [];
    for (let i = 0; i < numTrials; i++) {
      harnessLog.append(`Trial ${i + 1}/${numTrials}`);
      try {
        const result = await runTrial(
          adapter,
          generateOpts,
          scenario.input_tokens,
          memTracker,
        );
        trials.push(result);
        harnessLog.append(
          `Trial ${i + 1}: ttft=${result.ttft_ms}ms decode_tps=${result.decode_tps}`,
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        harnessLog.append(`Trial ${i + 1} error: ${msg}`);
        runtimeLog.append(`Trial ${i + 1} error: ${msg}`);
        trials.push({
          input_tokens: scenario.input_tokens,
          output_tokens: 0,
          ttft_ms: 0,
          total_ms: 0,
          decode_ms: 0,
          decode_tps: 0,
          weighted_tps: 0,
          idle_rss_mb: 0,
          peak_rss_mb: 0,
          exit_status: 1,
        });
      }
      process.stdout.write(".");
    }
    console.log();
    log.blank();

    // Compute aggregates
    const aggregate = computeAggregates(trials);

    // Display results
    log.label(
      "TTFT p50/p95",
      `${aggregate.ttft_p50_ms} ms / ${aggregate.ttft_p95_ms} ms`,
    );
    log.label("Decode tok/s", `${aggregate.decode_tps_mean}`);
    log.label("Weighted tok/s", `${aggregate.weighted_tps_mean}`);
    log.label("Peak RAM", `${aggregate.peak_rss_mb / 1024} GB`);
    log.blank();

    // Create bundle
    const bundlePath = await createBundle({
      outputDir: args.output as string,
      device,
      runtimeName: adapter.name,
      runtimeInfo,
      model: modelInfo,
      scenario,
      trials,
      aggregate,
      canonical,
      harnessLog: harnessLog.toString(),
      runtimeLog: runtimeLog.toString(),
      quant: (args.quant as string | undefined) ?? modelInfo.quant,
      notes: args.notes as string | undefined,
      nonce: args.nonce as string | undefined,
      runtimeFlags: args["runtime-flags"] as string | undefined,
    });

    log.header("Bundle created:");
    console.log(bundlePath);
    log.blank();

    // Validate bundle
    const validation = await validateBundle(bundlePath);
    if (!validation.valid) {
      log.warn("Bundle validation issues:");
      for (const err of validation.errors) {
        log.warn(`  ${err}`);
      }
    }

    // Upload
    if (!args["no-submit"]) {
      log.info("Uploading...");
      log.blank();
      try {
        const result = await uploadBundle(bundlePath);
        log.header("Run created:");
        console.log(result.run_url);
        log.blank();
        log.label("Status", result.status);
      } catch (e: unknown) {
        log.error(
          `Upload failed: ${e instanceof Error ? e.message : String(e)}`,
        );
        log.info("Bundle is saved locally. You can submit later with:");
        log.info(`  whatcanirun submit ${bundlePath}`);
      }
    }

    if (!canonical) {
      log.blank();
      log.warn(
        "This run is non-canonical. Increase trials >= 5 and warmups >= 2 for canonical status.",
      );
    }
  },
});
