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

  stop(finalText?: string) {
    if (this.interval) clearInterval(this.interval);
    process.stderr.write('\r\x1b[K');
    if (finalText) {
      console.log(`${DIM}${finalText}${RESET}`);
    }
  }

  private renderBar(): string {
    if (this.total <= 0) return '';
    const width = 20;
    const filled = Math.round((this.current / this.total) * width);
    const empty = width - filled;
    return ` ${'█'.repeat(filled)}${'░'.repeat(empty)} ${this.current}/${this.total}`;
  }

  private render() {
    const f = SPINNER_FRAMES[this.frame % SPINNER_FRAMES.length];
    const bar = this.renderBar();
    const detail = this.detail ? `  ${this.detail}` : '';
    process.stderr.write(`\r\x1b[K${DIM}${f} ${this.text}${bar}${detail}${RESET}`);
    this.frame++;
  }
}
