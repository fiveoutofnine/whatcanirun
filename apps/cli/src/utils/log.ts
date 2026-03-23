import chalk from 'chalk';
import ora, { type Ora } from 'ora';

const HOME = import.meta.env?.HOME || process.env.HOME || '';

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------

export function filepath(path: string): string {
  const uri = `file://${path.startsWith('/') ? path : `/${path}`}`;
  const display = HOME && path.startsWith(HOME) ? `~${path.slice(HOME.length)}` : path;
  return `\x1b]8;;${uri}\x07${chalk.underline.cyan(display)}\x1b]8;;\x07`;
}

export function warn(msg: string, options?: { prefix?: string }) {
  console.warn(`${chalk.reset(options?.prefix ?? '')}${chalk.yellow('⚠ warning:')} ${msg}`);
}

export function error(msg: string, options?: { prefix?: string }) {
  console.error(`${chalk.reset(options?.prefix ?? '')}${chalk.red('✖ error:')} ${msg}`);
}

// -----------------------------------------------------------------------------
// Spinner
// -----------------------------------------------------------------------------

export class Spinner {
  private oraSpinner: Ora;
  private frame = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private baseText: string;
  private total = 0;
  private current = 0;
  private detail = '';
  private running = false;
  private percent = false;

  constructor(text: string) {
    this.baseText = text;
    const dots = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.oraSpinner = ora({
      text,
      stream: process.stderr,
      discardStdin: false,
      spinner: {
        interval: 80,
        frames: dots.map((f) => `${chalk.white('[')}${f}${chalk.white(']')}`),
      },
    });
  }

  start(): this {
    this.running = true;
    this.oraSpinner.start();
    return this;
  }

  isRunning(): boolean {
    return this.running;
  }

  update(text: string) {
    this.baseText = text;
    this.composeText();
  }

  setTotal(total: number, options?: { percent?: boolean }) {
    this.total = total;
    this.current = 0;
    this.percent = options?.percent ?? false;
    // Start the progress bar animation interval
    if (!this.interval) {
      this.interval = setInterval(() => {
        this.frame++;
        this.composeText();
      }, 80);
    }
    this.composeText();
  }

  tick(detail?: string) {
    this.current = Math.min(this.current + 1, this.total);
    if (detail) this.detail = detail;
    this.composeText();
  }

  setCurrent(n: number) {
    this.current = Math.min(n, this.total);
    this.composeText();
  }

  setDetail(detail: string) {
    this.detail = detail;
    this.composeText();
  }

  stop(finalText?: string) {
    this.running = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (finalText) {
      this.oraSpinner.stopAndPersist({ text: finalText, symbol: '' });
    } else {
      this.oraSpinner.stop();
    }
  }

  private composeText() {
    if (this.total <= 0) {
      this.oraSpinner.text = this.baseText;
      return;
    }

    const pulse = Math.sin(this.frame * 0.15) * 0.5 + 0.5; // 0..1
    const bright = Math.round(138 + pulse * 117); // 138..255
    const pulseColor = `\x1b[38;2;${bright};${bright};${bright}m`;

    const width = 20;
    const filled = Math.round((this.current / this.total) * width);
    const empty = width - filled;
    const bar = ` ${chalk.white('█'.repeat(filled))}${chalk.dim('░'.repeat(empty))}`;
    const counter = this.percent
      ? ` ${chalk.white(String(this.current))}${chalk.dim('/100%')}`
      : ` ${chalk.white(String(this.current))}${chalk.dim('/' + this.total)}`;

    // Detail pulses with dynamic RGB (keep raw ANSI for per-frame values)
    const detail = this.detail ? `  ${pulseColor}${this.detail}\x1b[0m` : '';

    this.oraSpinner.text = `${this.baseText}${bar}${counter}${detail}`;
  }
}
