import { TEMPO_MAINNET_CHAIN_ID, TEMPO_TESTNET_CHAIN_ID } from '@whatcanirun/shared';
import { Mppx, tempo } from 'mppx/nextjs';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const TEMPO_USDC_E_ADDRESS = '0x20C000000000000000000000b9537d11c60E8b50';
const RECIPIENT_ADDRESS = '0x8831C0C0CCB2E45c187A4e3fA92D683c52170407';
const IS_TESTNET = process.env.NODE_ENV !== 'production';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type RequestHandler = (request: Request) => Promise<Response> | Response;

// -----------------------------------------------------------------------------
// Public
// -----------------------------------------------------------------------------

export const TEMPO_CHAIN_ID = IS_TESTNET ? TEMPO_TESTNET_CHAIN_ID : TEMPO_MAINNET_CHAIN_ID;

export function withTempoIdentityVerification(handler: RequestHandler): RequestHandler {
  let wrappedHandler: RequestHandler | null = null;

  return async (request: Request) => {
    if (!wrappedHandler) {
      const mppx = Mppx.create({
        methods: [
          tempo.charge({
            ...(!IS_TESTNET && {
              currency: TEMPO_USDC_E_ADDRESS,
            }),
            recipient: RECIPIENT_ADDRESS,
            testnet: IS_TESTNET,
          }),
        ],
      });

      wrappedHandler = mppx.charge({ amount: '0.00' })(handler);
    }

    return wrappedHandler(request);
  };
}
