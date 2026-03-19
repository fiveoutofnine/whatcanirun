import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthData {
  token: string;
  user: AuthUser;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const AUTH_FILE = join(homedir(), '.whatcanirun', 'auth.json');

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------

export function getAuth(): AuthData | null {
  if (!existsSync(AUTH_FILE)) return null;
  try {
    const data = JSON.parse(readFileSync(AUTH_FILE, 'utf-8')) as AuthData;
    if (data.token && data.user?.id) return data;
    return null;
  } catch (e: unknown) {
    console.warn(
      `Warning: could not parse ${AUTH_FILE}: ${e instanceof Error ? e.message : String(e)}. ` +
        'Try deleting it and running `whatcanirun auth login` again.'
    );
    return null;
  }
}

export function getToken(): string | null {
  return getAuth()?.token ?? null;
}

export function saveAuth(data: AuthData): void {
  mkdirSync(dirname(AUTH_FILE), { recursive: true });
  writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
}

export function clearAuth(): void {
  if (existsSync(AUTH_FILE)) {
    unlinkSync(AUTH_FILE);
  }
}
