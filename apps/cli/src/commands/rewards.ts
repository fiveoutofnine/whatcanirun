import chalk from 'chalk';
import { defineCommand } from 'citty';

import * as log from '../utils/log';
import { createWallet, getDid, getWallet, walletFilePath } from '../wallet/wallet';

const optIn = defineCommand({
  meta: {
    name: 'opt-in',
    description: 'Create a wallet to receive benchmark rewards',
  },
  async run() {
    const existing = getWallet();
    if (existing) {
      console.log(chalk.white(`[${chalk.green('✓')}] Wallet already exists.`));
      console.log(chalk.dim(` ↳ Address: ${chalk.cyan(existing.address)}`));
      console.log(chalk.dim(` ↳ DID:     ${chalk.cyan(getDid())}`));
      console.log(chalk.dim(` ↳ Stored at ${log.filepath(walletFilePath())}`));
      return;
    }

    const wallet = await createWallet();
    console.log(chalk.white(`[${chalk.green('✓')}] Wallet created.`));
    console.log(chalk.dim(` ↳ Address: ${chalk.cyan(wallet.address)}`));
    console.log(chalk.dim(` ↳ DID:     ${chalk.cyan(getDid())}`));
    console.log(chalk.dim(` ↳ Stored at ${log.filepath(walletFilePath())}`));
    console.log();
    console.log(
      chalk.dim('Use --rewarded when submitting to earn rewards on verification.'),
    );
  },
});

const status = defineCommand({
  meta: {
    name: 'status',
    description: 'Show wallet status',
  },
  async run() {
    const wallet = getWallet();
    if (!wallet) {
      console.log(
        chalk.white(
          `[${chalk.yellow('!')}] No rewards wallet found. Run ${chalk.bold.cyan('wcir rewards opt-in')} to create one.`,
        ),
      );
      return;
    }

    console.log(chalk.white('Rewards wallet'));
    console.log(chalk.dim(` ↳ Address: ${chalk.cyan(wallet.address)}`));
    console.log(chalk.dim(` ↳ DID:     ${chalk.cyan(getDid())}`));
    console.log(chalk.dim(` ↳ File:    ${log.filepath(walletFilePath())}`));
  },
});

const command = defineCommand({
  meta: {
    name: 'rewards',
    description: 'Manage benchmark rewards',
  },
  subCommands: {
    'opt-in': optIn,
    status,
  },
});

export default command;
