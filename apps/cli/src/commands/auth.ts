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
        chalk.white(
          `Already logged in as ${chalk.bold.blue(existing.user.name)} (${chalk.underline.blue(existing.user.email)}).`
        )
      );
      console.log(
        chalk.dim(`↳ Run ${chalk.bold.cyan(`${binName()} auth logout`)} first to switch accounts.`)
      );
      return;
    }

    console.log(chalk.dim('Opening browser to sign in…'));
    const spinner = new log.Spinner(chalk.dim('Waiting for sign-in…'));
    try {
      const auth = await loginViaBrowser(() => spinner.start());
      spinner.stop(
        chalk.white(
          `[${chalk.green('✓')}] Logged in as ${chalk.bold.blue(auth.user.name)} (${chalk.underline.blue(auth.user.email)}).`
        )
      );
    } catch (e: unknown) {
      spinner.stop();
      console.log();
      log.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  },
});

const logout = defineCommand({
  meta: {
    name: 'logout',
    description: 'Log out of whatcani.run',
  },
  run() {
    const existing = getAuth();
    if (!existing) {
      console.log(chalk.white('Not logged in.'));
      console.log(chalk.dim(`↳ Run ${chalk.bold.cyan(`${binName()} auth login`)} to login.`));
      return;
    }
    clearAuth();
    console.log(chalk.white(`[${chalk.green('✓')}] Logged out.`));
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
      console.log(
        chalk.white(
          `Logged in as ${chalk.bold.blue(auth.user.name)} (${chalk.underline.blue(auth.user.email)}).`
        )
      );
    } else {
      console.log(chalk.white('Not logged in.'));
      console.log(chalk.dim(`↳ Run ${chalk.bold.cyan(`${binName()} auth login`)} to login.`));
    }
  },
});

const command = defineCommand({
  meta: {
    name: 'auth',
    description: 'Manage authentication with whatcani.run',
  },
  subCommands: {
    login,
    logout,
    status,
  },
});

export default command;
