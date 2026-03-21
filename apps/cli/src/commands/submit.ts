import chalk from 'chalk';
import { defineCommand } from 'citty';

import { validateBundle } from '../bundle/validate';
import { uploadBundle } from '../upload/client';
import { resolveBundlePath } from '../utils/id';
import * as log from '../utils/log';

const command = defineCommand({
  meta: {
    name: 'submit',
    description: 'Upload an existing bundle',
  },
  args: {
    bundle: {
      type: 'positional',
      description: 'Bundle ID or path to zip file',
      required: true,
    },
  },
  async run({ args }) {
    let bundlePath;
    try {
      bundlePath = resolveBundlePath(args.bundle as string);
    } catch (e: unknown) {
      log.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }

    // Validate first
    console.log(chalk.dim('Validating bundle...'));
    const validation = await validateBundle(bundlePath);
    if (!validation.valid) {
      log.error('Bundle validation failed:');
      for (const err of validation.errors) {
        log.error(`  ${err}`);
      }
      process.exit(1);
    }
    console.log(chalk.green('Bundle is valid.'));
    console.log();

    // Upload
    console.log(chalk.dim('Uploading...'));
    try {
      const result = await uploadBundle(bundlePath);
      console.log();
      console.log(chalk.bold('Run created:'));
      console.log(result.run_url);
      console.log();
      log.label('Status', result.status);
    } catch (e: unknown) {
      log.error(`Upload failed: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  },
});

export default command;
