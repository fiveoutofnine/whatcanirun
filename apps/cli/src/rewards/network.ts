import { TEMPO_MAINNET_CHAIN_ID, TEMPO_TESTNET_CHAIN_ID } from '@whatcanirun/shared';

export const DEFAULT_API_BASE = 'https://whatcani.run';
export const API_BASE = process.env.WCIR_API_URL || DEFAULT_API_BASE;

export function getRewardsTempoChainId(): number {
  try {
    const { hostname, protocol } = new URL(API_BASE);
    if (protocol === 'https:' && hostname === 'whatcani.run') {
      return TEMPO_MAINNET_CHAIN_ID;
    }
  } catch {
    // Fall through to testnet for malformed or local development targets.
  }

  return TEMPO_TESTNET_CHAIN_ID;
}
