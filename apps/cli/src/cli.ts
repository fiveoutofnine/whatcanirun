#!/usr/bin/env bun
import { HARNESS_VERSION } from '@whatcanirun/shared';
import { defineCommand, runMain } from 'citty';

import { auth, rewards, run, show, submit, validate, version } from './commands';

const subCommands = {
  auth,
  run,
  submit,
  rewards,
  show,
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
const firstPositionalArg = process.argv.slice(2).find((arg) => !arg.startsWith('-'));
const hasSubCommand = firstPositionalArg != null && subCommandKeys.has(firstPositionalArg);

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
