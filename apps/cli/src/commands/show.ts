import chalk from 'chalk';
import { defineCommand } from 'citty';

import { detectDevice } from '../device/detect';
import { inspectModel, resolveModel } from '../model/resolve';
import { resolveRuntime } from '../runtime/resolve';
import { binName } from '../utils/bin';
import * as log from '../utils/log';

const command = defineCommand({
  meta: {
    name: 'show',
    description: 'Display detected device, runtime, or model information',
  },
  args: {
    target: {
      type: 'positional',
      description: 'What to show: device, runtime, or model',
      required: true,
    },
    value: {
      type: 'positional',
      description: 'Runtime name or model path (for runtime/model targets)',
      required: false,
    },
  },
  async run({ args }) {
    const target = args.target as string;

    switch (target) {
      case 'device': {
        try {
          const device = await detectDevice();
          console.log(JSON.stringify(device, null, 2));
        } catch (e) {
          log.error(e instanceof Error ? e.message : String(e));
          process.exit(1);
        }
        break;
      }
      case 'runtime': {
        const name = args.value as string | undefined;
        if (!name) {
          log.error(
            `Runtime name not specified: ${chalk.bold.cyan(`${binName()} show runtime <name>`)}.`
          );
          process.exit(1);
        }
        try {
          const adapter = resolveRuntime(name);
          const info = await adapter.detect();
          if (!info) {
            log.error(`Runtime "${chalk.cyan(name)}" not found or not available.`);
            process.exit(1);
          }
          console.log(JSON.stringify(info, null, 2));
        } catch (e) {
          log.error(e instanceof Error ? e.message : String(e));
          process.exit(1);
        }
        break;
      }
      case 'model': {
        const ref = args.value as string | undefined;
        if (!ref) {
          log.error(
            `Model not specified: ${chalk.bold.cyan(`${binName()} show model <path-or-repo-id>`)}.`
          );
          process.exit(1);
        }
        try {
          const resolved = await resolveModel(ref);
          const info = await inspectModel(resolved);
          if (!info.artifact_sha256) {
            log.error(`Model "${chalk.cyan(ref)}" not found.`);
            process.exit(1);
          }
          console.log(JSON.stringify(info, null, 2));
        } catch (e) {
          log.error(e instanceof Error ? e.message : String(e));
          process.exit(1);
        }
        break;
      }
      default:
        log.error(
          `Unknown target "${chalk.cyan(target)}". Use ${chalk.bold.cyan('device')}, ${chalk.bold.cyan('runtime')}, or ${chalk.bold.cyan('model')}.`
        );
        process.exit(1);
    }
  },
});

export default command;
