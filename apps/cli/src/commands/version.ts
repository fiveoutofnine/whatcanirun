import { defineCommand } from 'citty';

import * as log from '../utils/log';

const command = defineCommand({
  meta: {
    name: 'version',
    description: 'Print version information',
  },
  run() {
    log.blank();
    log.header('whatcanirun');
    log.label('Version', '0.1.5');
    log.blank();
  },
});

export default command;
