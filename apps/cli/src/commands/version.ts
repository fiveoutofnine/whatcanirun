import { HARNESS_VERSION } from '@whatcanirun/shared';
import chalk from 'chalk';
import { defineCommand } from 'citty';

const command = defineCommand({
  meta: {
    name: 'version',
    description: 'Print version information',
  },
  run() {
    console.log(`${chalk.bold.blue(HARNESS_VERSION)} (whatcanirun)`);
  },
});

export default command;
