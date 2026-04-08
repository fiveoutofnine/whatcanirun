import * as fs from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { getRewardsTempoChainId } from '../rewards/network';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface WalletData {
  address: string;
  privateKey: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const BASE_DIRECTORY = join(homedir(), '.agentcash');

// -----------------------------------------------------------------------------
// Paths
// -----------------------------------------------------------------------------

function ensureBaseDir(): void {
  if (!fs.existsSync(BASE_DIRECTORY)) {
    fs.mkdirSync(BASE_DIRECTORY, { recursive: true });
  }
}

function configFile(name: `${string}.${string}`): string {
  ensureBaseDir();
  return join(BASE_DIRECTORY, name);
}

const WALLET_FILE = configFile('wallet.json');

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------

export function getWallet(): WalletData | null {
  if (!fs.existsSync(WALLET_FILE)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8')) as WalletData;
    if (
      typeof data.privateKey === 'string' &&
      /^0x[a-fA-F0-9]{64}$/.test(data.privateKey) &&
      typeof data.address === 'string' &&
      /^0x[a-fA-F0-9]{40}$/.test(data.address)
    ) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export function getWalletAddress(): string | null {
  return getWallet()?.address ?? null;
}

export function getDid(): string | null {
  const address = getWalletAddress();
  if (!address) return null;
  return `did:pkh:eip155:${getRewardsTempoChainId()}:${address}`;
}

export async function createWallet(): Promise<WalletData> {
  const existing = getWallet();
  if (existing) return existing;

  const { generatePrivateKey, privateKeyToAccount } = await import('viem/accounts');
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  const wallet: WalletData = {
    privateKey,
    address: account.address,
    createdAt: new Date().toISOString(),
  };

  const content = JSON.stringify(wallet, null, 2) + '\n';
  fs.writeFileSync(WALLET_FILE, content, { mode: 0o600 });
  fs.chmodSync(WALLET_FILE, 0o600);

  return wallet;
}

export function walletFilePath(): string {
  return WALLET_FILE;
}
