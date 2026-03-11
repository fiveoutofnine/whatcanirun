#!/usr/bin/env bun
import { defineCommand, runMain } from 'citty';

import { run, show, submit, validate, version } from './commands';

const main = defineCommand({
  meta: {
    name: 'whatcanirun',
    version: '0.1.0',
    description: 'Standardized local LLM inference benchmarks',
  },
  subCommands: {
    run,
    submit,
    validate,
    show,
    version,
  },
});

runMain(main);
