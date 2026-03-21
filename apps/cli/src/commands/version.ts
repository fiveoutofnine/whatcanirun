import { HARNESS_VERSION } from '@whatcanirun/shared';
import chalk from 'chalk';
import { defineCommand } from 'citty';

import * as log from '../utils/log';

const command = defineCommand({
  meta: {
    name: 'version',
    description: 'Print version information',
  },
  run() {
    console.log();
    console.log(chalk.bold('whatcanirun'));
    log.label('Version', HARNESS_VERSION);
    console.log();
  },
});

export default command;
