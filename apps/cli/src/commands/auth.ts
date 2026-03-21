import chalk from 'chalk';
import { defineCommand } from 'citty';

import { loginViaBrowser } from '../auth/login';
import { clearAuth, getAuth } from '../auth/token';
import { binName } from '../utils/bin';
import * as log from '../utils/log';

const login = defineCommand({
  meta: {
    name: 'login',
    description: 'Authenticate with whatcani.run',
  },
  async run() {
    const existing = getAuth();
    if (existing) {
      console.log(
        chalk.dim(
          `Already logged in as ${chalk.cyan(`${existing.user.name} (${existing.user.email})`)}.`
        )
      );
      console.log(
        chalk.dim(`Run ${chalk.bold.cyan(`${binName()} auth logout`)} first to switch accounts.`)
      );
      return;
    }

    console.log(chalk.dim('Opening browser to sign in…'));
    try {
      const auth = await loginViaBrowser();
      console.log();
      console.log(chalk.dim(`Logged in as ${auth.user.name} (${auth.user.email}).`));
    } catch (e: unknown) {
      log.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  },
});

const logout = defineCommand({
  meta: {
    name: 'logout',
    description: 'Remove stored credentials',
  },
  run() {
    const existing = getAuth();
    if (!existing) {
      console.log(chalk.dim('Not logged in.'));
      return;
    }
    clearAuth();
    console.log(chalk.green('Logged out.'));
  },
});

const status = defineCommand({
  meta: {
    name: 'status',
    description: 'Show current authentication status',
  },
  run() {
    const auth = getAuth();
    if (auth) {
      log.label('Logged in as', `${auth.user.name} (${auth.user.email})`);
    } else {
      console.log(
        chalk.dim(
          `Not logged in. Run ${chalk.bold.cyan(`${binName()} auth login`)} to authenticate.`
        )
      );
    }
  },
});

const command = defineCommand({
  meta: {
    name: 'auth',
    description: 'Manage authentication',
  },
  subCommands: {
    login,
    logout,
    status,
  },
});

export default command;
