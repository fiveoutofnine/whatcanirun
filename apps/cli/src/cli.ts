#!/usr/bin/env bun
import { HARNESS_VERSION } from '@whatcanirun/shared';
import { defineCommand, runMain } from 'citty';

import { auth, run, show, submit, validate, version } from './commands';

const subCommands = {
  auth,
  run,
  show,
  submit,
  validate,
  version,
};

const main = defineCommand({
  meta: {
    name: 'whatcanirun',
    version: HARNESS_VERSION,
    description: 'Standardized local LLM inference benchmarks',
  },
  subCommands,
});

// Launch interactive mode when no subcommand is provided.
const subCommandKeys = new Set(Object.keys(subCommands));
const hasSubCommand = process.argv.slice(2).some((arg) => subCommandKeys.has(arg));

if (
  hasSubCommand ||
  process.argv.includes('--help') ||
  process.argv.includes('-h') ||
  process.argv.includes('--version') ||
  process.argv.includes('-v')
) {
  runMain(main);
} else {
  import('./interactive').then(({ runInteractive }) => runInteractive());
}
