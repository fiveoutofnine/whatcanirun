import { defineCommand } from "citty";
import { detectDevice } from "../device/detect.ts";
import { resolveRuntime } from "../runtime/resolve.ts";
import { resolveModel, inspectModel } from "../model/resolve.ts";
import * as log from "../utils/log.ts";

export const showCommand = defineCommand({
  meta: {
    name: "show",
    description: "Display detected device, runtime, or model information",
  },
  args: {
    target: {
      type: "positional",
      description: "What to show: device, runtime, or model",
      required: true,
    },
    value: {
      type: "positional",
      description: "Runtime name or model path (for runtime/model targets)",
      required: false,
    },
  },
  async run({ args }) {
    const target = args.target as string;

    switch (target) {
      case "device": {
        const device = await detectDevice();
        console.log(JSON.stringify(device, null, 2));
        break;
      }
      case "runtime": {
        const name = args.value as string | undefined;
        if (!name) {
          log.error("Usage: whatcanirun show runtime <name>");
          process.exit(1);
        }
        const adapter = resolveRuntime(name);
        const info = await adapter.detect();
        if (!info) {
          log.error(`Runtime '${name}' not found or not available`);
          process.exit(1);
        }
        console.log(JSON.stringify({ name: adapter.name, ...info }, null, 2));
        break;
      }
      case "model": {
        const path = args.value as string | undefined;
        if (!path) {
          log.error("Usage: whatcanirun show model <path>");
          process.exit(1);
        }
        const resolved = await resolveModel(path);
        const info = await inspectModel(resolved);
        console.log(JSON.stringify(info, null, 2));
        break;
      }
      default:
        log.error(`Unknown target '${target}'. Use: device, runtime, or model`);
        process.exit(1);
    }
  },
});
