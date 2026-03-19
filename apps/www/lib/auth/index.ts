import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import type { BetterAuthPlugin } from 'better-auth/types';

import { db } from '@/lib/db';
import { userRoleEnum } from '@/lib/db/schema';

// -----------------------------------------------------------------------------
// Plugin
// -----------------------------------------------------------------------------

const redirectPlugin = () => {
  return {
    id: 'redirect-plugin',
    hooks: {
      after: [
        {
          matcher: (ctx) => ctx.path?.startsWith('/callback/') ?? false,
          handler: createAuthMiddleware(async (ctx) => {
            const redirect = ctx.query?.redirect;
            if (redirect && typeof redirect === 'string' && redirect.startsWith('/')) {
              throw ctx.redirect(redirect);
            }
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
};

// -----------------------------------------------------------------------------
// Auth
// -----------------------------------------------------------------------------

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
  }),
  signIn: {
    redirectTo: '/',
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        enum: userRoleEnum,
        nullable: false,
      },
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['github', 'google'],
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    },
    google: {
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    },
  },
  plugins: [nextCookies(), redirectPlugin()],
});

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type Session = typeof auth.$Infer.Session;
