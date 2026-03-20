#!/usr/bin/env bun
import { defineCommand, runMain } from 'citty';

import { auth, run, show, submit, validate, version } from './commands';

const main = defineCommand({
  meta: {
    name: 'whatcanirun',
    version: '0.1.5',
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

runMain(main);
