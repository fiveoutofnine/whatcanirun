import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface WalletData {
  address: string;
  privateKey: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const WALLET_FILE = join(homedir(), '.agentcash', 'wallet.json');
const TEMPO_CHAIN_ID = 42431;

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------

export function getWallet(): WalletData | null {
  if (!existsSync(WALLET_FILE)) return null;
  try {
    const data = JSON.parse(readFileSync(WALLET_FILE, 'utf-8')) as WalletData;
    if (data.address && data.privateKey) return data;
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
  return `did:pkh:eip155:${TEMPO_CHAIN_ID}:${address}`;
}

export async function createWallet(): Promise<WalletData> {
  const existing = getWallet();
  if (existing) return existing;

  // Generate a random private key using crypto
  const privateKeyBytes = new Uint8Array(32);
  crypto.getRandomValues(privateKeyBytes);
  const privateKey =
    '0x' +
    Array.from(privateKeyBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

  // Derive address using viem (lazy import to keep startup fast)
  const { privateKeyToAccount } = await import('viem/accounts');
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const wallet: WalletData = {
    address: account.address,
    privateKey,
  };

  mkdirSync(dirname(WALLET_FILE), { recursive: true });
  writeFileSync(WALLET_FILE, JSON.stringify(wallet, null, 2) + '\n', { mode: 0o600 });
  return wallet;
}

export function walletFilePath(): string {
  return WALLET_FILE;
}
