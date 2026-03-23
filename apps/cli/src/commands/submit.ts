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
    // Graceful Ctrl+C handling.
    const controller = new AbortController();
    let activeSpinner: log.Spinner | null = null;
    const onSigint = () => {
      controller.abort();
      if (activeSpinner?.isRunning()) {
        activeSpinner.stop(chalk.white(`[${chalk.gray('−')}] Interrupted.`));
      }
      console.log();
      process.exit(130);
    };
    process.on('SIGINT', onSigint);

    let bundlePath;
    try {
      bundlePath = resolveBundlePath(args.bundle as string);
    } catch (e: unknown) {
      log.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }

    // Validate bundle.
    const validationSpinner = new log.Spinner(chalk.dim('Validating bundle…')).start();
    activeSpinner = validationSpinner;
    const validation = await validateBundle(bundlePath);
    if (!validation.valid) {
      validationSpinner.stop(
        chalk.white(`[${chalk.red('✖')}] ${chalk.bold.red('Bundle validation failed.')}`)
      );
      for (const err of validation.errors) {
        log.error(chalk.dim(err), { prefix: chalk.dim.red(' ↳ ') });
      }
      process.exit(1);
    }
    activeSpinner = null;
    validationSpinner.stop(chalk.white(`[${chalk.green('✓')}] Bundle is valid.`));

    // Upload bundle.
    const uploadSpinner = new log.Spinner(chalk.dim('Uploading bundle…')).start();
    activeSpinner = uploadSpinner;
    try {
      const result = await uploadBundle(bundlePath, { signal: controller.signal });
      uploadSpinner.stop(
        chalk.white(`[${chalk.green('✓')}] Uploaded run: ${chalk.underline(result.run_url)}`)
      );
    } catch (e: unknown) {
      uploadSpinner.stop(chalk.white(`[${chalk.red('✖')}] Run upload failed.`));
      log.error(chalk.dim(e instanceof Error ? e.message : String(e)), {
        prefix: chalk.dim.red(' ↳ '),
      });
      process.exit(1);
    }

    process.off('SIGINT', onSigint);
  },
});

export default command;
