import { defineCommand } from 'citty';

const command = defineCommand({
  meta: {
    name: 'version',
    description: 'Print version information',
  },
  run() {
    console.log('whatcanirun 0.1.0');
    console.log('harness schema v1');
  },
});

export default command;
