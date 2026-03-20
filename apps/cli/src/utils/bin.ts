import { basename } from 'path';

/**
 * Returns the command name as the user invoked it, e.g. `wcir`, `whatcanirun`,
 * `bunx whatcanirun`, or `npx whatcanirun`.
 */
export function binName(): string {
  const argv0 = basename(process.argv[0] ?? '');
  const argv1 = process.argv[1] ?? '';

  // Direct invocation via `wcir` or `whatcanirun` (symlinked bin).
  if (argv0 === 'wcir' || argv0 === 'whatcanirun') return argv0;

  // bunx / npx: argv[0] is the runtime, argv[1] is the package or script.
  if (argv0 === 'bun' || argv0 === 'bunx') {
    if (argv1.includes('whatcanirun')) return 'bunx whatcanirun';
  }
  if (argv0 === 'npx' || argv0 === 'node') {
    if (argv1.includes('whatcanirun')) return 'npx whatcanirun';
  }

  return 'wcir';
}
