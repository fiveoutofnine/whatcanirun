#!/usr/bin/env bun
import { defineCommand, runMain } from "citty";
import { runCommand } from "./commands/run.ts";
import { submitCommand } from "./commands/submit.ts";
import { validateCommand } from "./commands/validate.ts";
import { showCommand } from "./commands/show.ts";
import { versionCommand } from "./commands/version.ts";

const main = defineCommand({
  meta: {
    name: "whatcanirun",
    version: "0.1.0",
    description: "Standardized local LLM inference benchmarks",
  },
  subCommands: {
    run: runCommand,
    submit: submitCommand,
    validate: validateCommand,
    show: showCommand,
    version: versionCommand,
  },
});

runMain(main);
