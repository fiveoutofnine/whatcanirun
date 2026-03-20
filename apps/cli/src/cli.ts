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

runMain(main);
