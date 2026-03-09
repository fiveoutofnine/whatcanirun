import { defineCommand } from 'citty';
import { existsSync } from 'fs';

import { validateBundle } from '../bundle/validate.ts';
import * as log from '../utils/log.ts';

export const validateCommand = defineCommand({
  meta: {
    name: 'validate',
    description: 'Validate a bundle locally',
  },
  args: {
    bundle: {
      type: 'positional',
      description: 'Path to bundle zip file',
      required: true,
    },
  },
  async run({ args }) {
    const bundlePath = args.bundle as string;

    if (!existsSync(bundlePath)) {
      log.error(`Bundle not found: ${bundlePath}`);
      process.exit(1);
    }

    log.info(`Validating: ${bundlePath}`);
    const result = await validateBundle(bundlePath);

    if (result.valid) {
      log.success('Bundle is valid.');
    } else {
      log.error('Bundle validation failed:');
      for (const err of result.errors) {
        log.error(`  ${err}`);
      }
      process.exit(1);
    }
  },
});
