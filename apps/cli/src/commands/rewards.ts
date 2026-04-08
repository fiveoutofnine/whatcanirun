import chalk from 'chalk';
import { defineCommand } from 'citty';

import { binName } from '../utils/bin';
import * as log from '../utils/log';
import { createWallet, getDid, getWallet, walletFilePath } from '../wallet/wallet';

const init = defineCommand({
  meta: {
    name: 'init',
    description: 'Create a wallet to receive rewards for submitting benchmarks',
  },
  async run() {
    const existing = getWallet();
    if (existing) {
      console.log(
        chalk.white(`[${chalk.green('✓')}] Wallet found: ${chalk.bold.blue(existing.address)}.`)
      );
      console.log(chalk.dim(` →  DID        ${chalk.cyan(getDid())}`));
      console.log(chalk.dim(` →  Stored at  ${chalk(log.filepath(walletFilePath()))}`));
    } else {
      const wallet = await createWallet();
      console.log(
        chalk.white(`[${chalk.green('✓')}] Wallet created: ${chalk.bold.blue(wallet.address)}.`)
      );
      console.log(chalk.dim(` →  DID        ${chalk.cyan(getDid())}`));
      console.log(chalk.dim(` →  Stored at  ${chalk(log.filepath(walletFilePath()))}`));
    }
    console.log(
      chalk.white(
        `[${chalk.blueBright('i')}] Use ${chalk.cyan('--reward')} when submitting runs to earn rewards.`
      )
    );
  },
});

const wallet = defineCommand({
  meta: {
    name: 'wallet',
    description: 'Show your rewards wallet',
  },
  async run() {
    const wallet = getWallet();
    if (!wallet) {
      log.error(
        `No reward wallets found.` +
          `\n  ↳ Run ${chalk.bold.cyan(`${binName()} rewards init`)} to create one.`
      );
      return;
    }

    console.log(chalk.white(`Your rewards wallet is ${chalk.bold.blue(wallet.address)}.`));
    console.log(chalk.dim(`→ DID        ${chalk.cyan(getDid())}`));
    console.log(chalk.dim(`→ Stored at  ${chalk(log.filepath(walletFilePath()))}`));
  },
});

const command = defineCommand({
  meta: {
    name: 'rewards',
    description: 'View and manage your rewards wallet',
  },
  subCommands: {
    init,
    wallet,
  },
});

export default command;
