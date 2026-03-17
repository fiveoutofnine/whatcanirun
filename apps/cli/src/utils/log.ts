// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------

export function info(msg: string) {
  console.log(`${DIM}${msg}${RESET}`);
}

export function success(msg: string) {
  console.log(`${GREEN}${msg}${RESET}`);
}

export function warn(msg: string) {
  console.error(`${YELLOW}warning:${RESET} ${msg}`);
}

export function error(msg: string) {
  console.error(`${RED}error:${RESET} ${msg}`);
}

export function header(msg: string) {
  console.log(`${BOLD}${msg}${RESET}`);
}

export function label(key: string, value: string) {
  console.log(`${CYAN}${key}:${RESET} ${value}`);
}

export function blank() {
  console.log();
}
