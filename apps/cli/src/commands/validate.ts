import { defineCommand } from 'citty';

import { validateBundle } from '../bundle/validate';
import { resolveBundlePath } from '../utils/id';
import * as log from '../utils/log';

const command = defineCommand({
  meta: {
    name: 'validate',
    description: 'Validate a bundle locally',
  },
  args: {
    bundle: {
      type: 'positional',
      description: 'Bundle ID or path to zip file',
      required: true,
    },
  },
  async run({ args }) {
    const bundlePath = resolveBundlePath(args.bundle as string);

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

export default command;
