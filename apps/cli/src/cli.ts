#!/usr/bin/env bun
import { HARNESS_VERSION } from '@whatcanirun/shared';
import { defineCommand, runMain } from 'citty';

import { auth, run, show, submit, validate, version } from './commands';

const main = defineCommand({
  meta: {
    name: 'whatcanirun',
    version: HARNESS_VERSION,
    description: 'Standardized local LLM inference benchmarks',
  },
  subCommands: {
    auth,
    run,
    show,
    submit,
    validate,
    version,
  },
});

// Launch interactive mode when no subcommand is provided.
const subcommands = new Set(['auth', 'run', 'show', 'submit', 'validate', 'version']);
const hasSubcommand = process.argv.slice(2).some((arg) => subcommands.has(arg));

if (hasSubcommand || process.argv.includes('--help') || process.argv.includes('-h')) {
  runMain(main);
} else {
  import('./interactive').then(({ runInteractive }) => runInteractive());
}
