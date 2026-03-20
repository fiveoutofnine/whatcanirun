import { defineCommand } from 'citty';

import * as log from '../utils/log';

const command = defineCommand({
  meta: {
    name: 'update',
    description: 'Update whatcanirun to the latest version',
  },
  async run() {
    const wcirup = Bun.which('wcir-up');
    if (!wcirup) {
      log.error('`wcir-up` not found on `PATH`.');
      log.info('Install it with: `curl -fsSL https://whatcani.run/install | bash`');
      process.exit(1);
    }

    const proc = Bun.spawn([wcirup], { stdio: ['inherit', 'inherit', 'inherit'] });
    const code = await proc.exited;
    process.exit(code);
  },
});

export default command;
