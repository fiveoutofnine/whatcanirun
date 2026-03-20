// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const UNDERLINE = '\x1b[4m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';

const HOME = import.meta.env?.HOME || process.env.HOME || '';

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------

export function info(msg: string) {
  console.log(`${DIM}${msg}${RESET}`);
}

export function success(msg: string) {
  console.log(`${GREEN}${msg}${RESET}`);
}

export function cmd(command: string): string {
  return `${BOLD}${CYAN}${command}${RESET}`;
}

export function filepath(path: string): string {
  const uri = `file://${path.startsWith('/') ? path : `/${path}`}`;
  const display = HOME && path.startsWith(HOME) ? `~${path.slice(HOME.length)}` : path;
  return `\x1b]8;;${uri}\x07${UNDERLINE}${CYAN}${display}${RESET}\x1b]8;;\x07`;
}

export function warn(msg: string) {
  console.error(`${YELLOW}⚠ warning:${RESET} ${msg}`);
}

export function error(msg: string) {
  console.error(`${RED}✖ error:${RESET} ${msg}`);
}

export function header(msg: string) {
  console.log(`${BOLD}${msg}${RESET}`);
}

export function label(key: string, value: string) {
  console.log(`${CYAN}${key}:${RESET} ${value}`);
}

export function bundleSaved(path: string) {
  console.log(`${DIM}Bundle saved to${RESET} ${filepath(path)}`);
}

export function blank() {
  console.log();
}

// -----------------------------------------------------------------------------
// Spinner
// -----------------------------------------------------------------------------

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export class Spinner {
  private frame = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private text: string;
  private total = 0;
  private current = 0;
  private detail = '';

  constructor(text: string) {
    this.text = text;
  }

  start(): this {
    this.render();
    this.interval = setInterval(() => this.render(), 80);
    return this;
  }

  update(text: string) {
    this.text = text;
  }

  setTotal(total: number) {
    this.total = total;
    this.current = 0;
  }

  tick(detail?: string) {
    this.current = Math.min(this.current + 1, this.total);
    if (detail) this.detail = detail;
  }

  setCurrent(n: number) {
    this.current = Math.min(n, this.total);
  }

  setDetail(detail: string) {
    this.detail = detail;
  }

  stop(finalText?: string) {
    if (this.interval) clearInterval(this.interval);
    process.stderr.write('\r\x1b[K');
    if (finalText) {
      console.log(`${DIM}${finalText}${RESET}`);
    }
  }

  private render() {
    const f = SPINNER_FRAMES[this.frame % SPINNER_FRAMES.length];

    if (this.total <= 0) {
      process.stderr.write(`\r\x1b[K${DIM}${f} ${this.text}${RESET}`);
      this.frame++;
      return;
    }

    const pulse = Math.sin(this.frame * 0.15) * 0.5 + 0.5; // 0..1
    const bright = Math.round(138 + pulse * 117); // 138..255
    const pulseColor = `\x1b[38;2;${bright};${bright};${bright}m`;

    const WHITE = '\x1b[97m';
    const width = 20;
    const filled = Math.round((this.current / this.total) * width);
    const empty = width - filled;
    const bar = ` ${WHITE}${'█'.repeat(filled)}${RESET}${DIM}${'░'.repeat(empty)}${RESET}`;
    const counter = ` ${WHITE}${this.current}${RESET}${DIM}/${this.total}${RESET}`;

    // Detail pulses.
    const detail = this.detail ? `  ${pulseColor}${this.detail}${RESET}` : '';

    process.stderr.write(`\r\x1b[K${DIM}${f} ${this.text}${RESET}${bar}${counter}${detail}`);
    this.frame++;
  }
}
