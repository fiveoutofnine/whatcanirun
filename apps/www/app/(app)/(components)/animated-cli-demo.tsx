'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import { Check, Copy, RotateCw } from 'lucide-react';

import { RUN_AND_SUBMIT_COMMAND, RUN_COMMAND } from '@/lib/constants/cli';

import { Button, IconButton, toast, Tooltip } from '@/components/ui';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const BRAILLE_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const ANSI = {
  fg: '#CCCCCC',
  dim: '#808080',
  white: '#E5E5E5',
  cyan: '#00E5E5',
  green: '#00D900',
  bar: '#555555',
  bg: '#1C1C1C',
} as const;

// -----------------------------------------------------------------------------
// Step types
// -----------------------------------------------------------------------------

type SubItem = {
  key: string;
  value: string;
  annotation?: string; // e.g. "(guessed)" — rendered dim
  bold?: boolean; // for result values
};

type SpinnerStep = {
  type: 'spinner';
  spinnerLabel: string;
  label: React.ReactNode;
  subItems?: SubItem[];
  hookLine?: React.ReactNode;
  duration: number;
};

type ProgressStep = {
  type: 'progress';
  spinnerLabel: string;
  total: number;
  duration: number;
};

type ResultStep = {
  type: 'result';
  label: React.ReactNode;
  subItems?: SubItem[];
};

type Step = SpinnerStep | ProgressStep | ResultStep;

// Shorthand helpers for building labels
const C = ({ children }: { children: React.ReactNode }) => (
  <span style={{ color: ANSI.cyan }}>{children}</span>
);
const W = ({ children }: { children: React.ReactNode }) => (
  <span style={{ color: ANSI.white }}>{children}</span>
);
const D = ({ children }: { children: React.ReactNode }) => (
  <span style={{ color: ANSI.dim }}>{children}</span>
);
const U = ({ children }: { children: React.ReactNode }) => (
  <span style={{ color: ANSI.cyan, textDecoration: 'underline' }}>{children}</span>
);

const STEPS: Step[] = [
  {
    type: 'spinner',
    spinnerLabel: 'Detecting device…',
    label: (
      <Fragment>
        <C>macOS</C> (<C>15.6.1</C>) detected.
      </Fragment>
    ),
    duration: 500,
  },
  {
    type: 'spinner',
    spinnerLabel: 'Detecting runtime…',
    label: (
      <Fragment>
        <C>mlx_lm</C> (<C>0.31.0</C>) detected.
      </Fragment>
    ),
    duration: 700,
  },
  {
    type: 'spinner',
    spinnerLabel: 'Resolving model…',
    label: 'Model resolved.',
    duration: 700,
  },
  {
    type: 'spinner',
    spinnerLabel: 'Loading model from cache…',
    label: (
      <Fragment>
        <C>Qwen3.5-0.8B-MLX-8bit</C> loaded from disk.
      </Fragment>
    ),
    duration: 2500,
    subItems: [
      { key: 'Format', value: 'mlx' },
      { key: 'Quant', value: '8bit' },
      { key: 'Architecture', value: 'qwen3_5' },
    ],
  },
  {
    type: 'progress',
    spinnerLabel: 'Warming up…',
    total: 10,
    duration: 4000,
  },
  {
    type: 'result',
    label: '10/10 trials ran successfully:',
    subItems: [
      { key: 'TTFT p50/p95', value: '1861.34 ms / 2271.36 ms', bold: true },
      { key: 'Prefill TPS', value: '2268.5 tok/s', bold: true },
      { key: 'Decode TPS', value: '177 tok/s', bold: true },
      { key: 'Idle Memory', value: '1.08 GB', bold: true },
      { key: 'Peak Memory', value: '2.56 GB', bold: true },
    ],
  },
  {
    type: 'spinner',
    spinnerLabel: 'Validating bundle…',
    label: 'Bundle is valid.',
    hookLine: (
      <D>
        {' '}
        ↳ Saved to <U>~/.whatcanirun/bundles/mlx-qwen3.5-0.8b-mlx-8bit-e079ed.zip</U>.
      </D>
    ),
    duration: 500,
  },
  {
    type: 'spinner',
    spinnerLabel: 'Uploading bundle…',
    label: (
      <span>
        Uploaded run:{' '}
        <a
          className="cursor-pointer underline hover:opacity-80"
          href="https://whatcani.run/run/run_6bdb71c8-a79f-4f53-9eca-0f9eea78af86"
          target="_blank"
          rel="noopener noreferrer"
        >
          <W>https://whatcani.run/run/run_6bdb71c8-a79f-4f53-9eca-0f9eea78af86</W>
        </a>
      </span>
    ),
    duration: 2200,
  },
];

// Timing constants
const CHAR_INTERVAL = 20;
const SPINNER_INTERVAL = 80;
const POST_COMMAND_PAUSE = 500;
const POST_SPINNER_PAUSE = 300;
const POST_RESULT_PAUSE = 500;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const Checkmark = () => (
  <W>
    [<span style={{ color: ANSI.green }}>✓</span>]
  </W>
);

const Arrow = () => <D>{' →  '}</D>;

const SubItems: React.FC<{ items: SubItem[] }> = ({ items }) => {
  const maxKeyLen = Math.max(...items.map((i) => i.key.length));
  return (
    <Fragment>
      {items.map((item) => (
        <div key={item.key} style={{ whiteSpace: 'pre' }}>
          <Arrow />
          <D>{`${item.key.padEnd(maxKeyLen)}  `}</D>
          <span
            style={{
              color: ANSI.cyan,
              fontWeight: item.bold ? 'bold' : undefined,
            }}
          >
            {item.value}
          </span>
          {item.annotation && <D> {item.annotation}</D>}
        </div>
      ))}
    </Fragment>
  );
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const AnimatedCliDemo: React.FC = () => {
  const [copied, setCopied] = useState<boolean>(false);
  // State
  const [typedChars, setTypedChars] = useState<number>(0);
  const [isTypingDone, setIsTypingDone] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(-1); // -1 = still typing command
  const [stepPhase, setStepPhase] = useState<'spinning' | 'done'>('spinning');
  const [spinnerFrame, setSpinnerFrame] = useState<number>(0);
  const [progressCount, setProgressCount] = useState<number>(0);
  const [completedUpTo, setCompletedUpTo] = useState<number>(-1); // steps completed
  const [isComplete, setIsComplete] = useState<boolean>(false);

  // Refs.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prefersReducedMotion = useRef(false);

  // Check reduced motion on mount.
  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion.current) {
      setTypedChars(RUN_AND_SUBMIT_COMMAND.length);
      setIsTypingDone(true);
      setCurrentStep(STEPS.length);
      setCompletedUpTo(STEPS.length - 1);
      setIsComplete(true);
    }
  }, []);

  // Cleanup helper.
  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  }, []);

  // Phase 1: Typing animation.
  useEffect(() => {
    if (isTypingDone || prefersReducedMotion.current) return;
    clearTimers();

    intervalRef.current = setInterval(() => {
      setTypedChars((prev) => {
        if (prev >= RUN_AND_SUBMIT_COMMAND.length) {
          clearTimers();
          timerRef.current = setTimeout(() => {
            setIsTypingDone(true);
            setCurrentStep(0);
            setStepPhase('spinning');
          }, POST_COMMAND_PAUSE);
          return prev;
        }
        return prev + 1;
      });
    }, CHAR_INTERVAL);

    return clearTimers;
  }, [isTypingDone, clearTimers]);

  // Phase 2+: Step animation
  useEffect(() => {
    if (currentStep < 0 || currentStep >= STEPS.length || prefersReducedMotion.current) return;
    clearTimers();

    const step = STEPS[currentStep];

    if (step.type === 'spinner') {
      if (stepPhase === 'spinning') {
        // Start spinner
        intervalRef.current = setInterval(() => {
          setSpinnerFrame((prev) => (prev + 1) % BRAILLE_FRAMES.length);
        }, SPINNER_INTERVAL);

        // Resolve after duration
        timerRef.current = setTimeout(() => {
          clearTimers();
          setStepPhase('done');
          setCompletedUpTo(currentStep);
        }, step.duration);
      } else {
        // Done — advance
        timerRef.current = setTimeout(() => {
          const next = currentStep + 1;
          if (next < STEPS.length) {
            setCurrentStep(next);
            setStepPhase('spinning');
            setSpinnerFrame(0);
            setProgressCount(0);
          } else {
            setIsComplete(true);
          }
        }, POST_SPINNER_PAUSE);
      }
    } else if (step.type === 'progress') {
      if (stepPhase === 'spinning') {
        const tickInterval = step.duration / step.total;
        let count = 0;
        let progressInterval: ReturnType<typeof setInterval> | null = null;

        // Start spinner immediately
        const spinnerInt = setInterval(() => {
          setSpinnerFrame((prev) => (prev + 1) % BRAILLE_FRAMES.length);
        }, SPINNER_INTERVAL);

        // Brief warmup pause, then start progress ticks
        const warmupTimeout = setTimeout(() => {
          progressInterval = setInterval(() => {
            count++;
            setProgressCount(count);
            if (count >= step.total) {
              if (progressInterval) clearInterval(progressInterval);
              clearInterval(spinnerInt);
              clearTimers();
              setStepPhase('done');
              setCompletedUpTo(currentStep);
            }
          }, tickInterval);
        }, 1000);

        intervalRef.current = spinnerInt;

        return () => {
          clearTimeout(warmupTimeout);
          if (progressInterval) clearInterval(progressInterval);
          clearInterval(spinnerInt);
          clearTimers();
        };
      } else {
        // Done — advance
        timerRef.current = setTimeout(() => {
          const next = currentStep + 1;
          if (next < STEPS.length) {
            setCurrentStep(next);
            setStepPhase('spinning');
            setSpinnerFrame(0);
            setProgressCount(0);
          } else {
            setIsComplete(true);
          }
        }, POST_SPINNER_PAUSE);
      }
    } else if (step.type === 'result') {
      // Results appear immediately as "done"
      setCompletedUpTo(currentStep);
      timerRef.current = setTimeout(() => {
        const next = currentStep + 1;
        if (next < STEPS.length) {
          setCurrentStep(next);
          setStepPhase('spinning');
        } else {
          setIsComplete(true);
        }
      }, POST_RESULT_PAUSE);
    }

    return clearTimers;
  }, [currentStep, stepPhase, clearTimers]);

  // Restart handler
  const restart = useCallback(() => {
    clearTimers();
    setTypedChars(0);
    setIsTypingDone(false);
    setCurrentStep(-1);
    setStepPhase('spinning');
    setSpinnerFrame(0);
    setProgressCount(0);
    setCompletedUpTo(-1);
    setIsComplete(false);
  }, [clearTimers]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderCompletedStep = (step: Step, index: number) => {
    if (step.type === 'spinner' || step.type === 'result') {
      return (
        <div key={index}>
          <div>
            <Checkmark /> <W>{step.label}</W>
          </div>
          {step.subItems && <SubItems items={step.subItems} />}
          {'hookLine' in step && step.hookLine && (
            <div style={{ whiteSpace: 'pre' }}>{step.hookLine}</div>
          )}
        </div>
      );
    }
    if (step.type === 'progress') {
      // The next result step renders the "trials ran successfully" line
      return null;
    }
    return null;
  };

  const renderActiveStep = (step: Step) => {
    if (step.type === 'spinner' && stepPhase === 'spinning') {
      return (
        <div>
          <span style={{ color: ANSI.white }}>
            [<span style={{ color: ANSI.cyan }}>{BRAILLE_FRAMES[spinnerFrame]}</span>]
          </span>{' '}
          <D>{step.spinnerLabel}</D>
        </div>
      );
    }
    if (step.type === 'progress' && stepPhase === 'spinning') {
      if (progressCount === 0) {
        return (
          <div>
            <span style={{ color: ANSI.white }}>
              [<span style={{ color: ANSI.cyan }}>{BRAILLE_FRAMES[spinnerFrame]}</span>]
            </span>{' '}
            <D>{step.spinnerLabel}</D>
          </div>
        );
      }
      const filled = Math.floor((progressCount / step.total) * 20);
      const filledBar = '█'.repeat(filled);
      const emptyBar = '░'.repeat(20 - filled);
      const currentTps = (175.5 + (Math.random() - 0.5) * 10).toFixed(1);
      return (
        <div style={{ whiteSpace: 'pre' }}>
          <span style={{ color: ANSI.white }}>
            [<span style={{ color: ANSI.cyan }}>{BRAILLE_FRAMES[spinnerFrame]}</span>]
          </span>{' '}
          <D>Running trials </D>
          <span style={{ color: ANSI.white, display: 'inline' }}>{filledBar}</span>
          <span style={{ color: ANSI.bar, display: 'inline' }}>{emptyBar}</span>
          <W>
            {' '}
            {progressCount}/{step.total}
          </W>
          <D>
            {'  '}
            {currentTps} tok/s
          </D>
        </div>
      );
    }
    return null;
  };

  const copyCommand = useCallback(() => {
    if (copied) return;
    navigator.clipboard.writeText(RUN_COMMAND);
    setCopied(true);
    toast({ title: 'Copied command clipboard!', intent: 'success', hasCloseButton: true });
    setTimeout(() => setCopied(false), 3000);
  }, [copied]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-6 bg-gray-2 shadow-lg">
      <div className="flex h-9 items-center justify-between border-b border-gray-6 bg-gray-1 pl-3 pr-1.5">
        <div className="flex gap-2">
          <span className="size-3 rounded-full bg-[#FF5F57]" />
          <span className="size-3 rounded-full bg-[#FFBD2E]" />
          <span className="size-3 rounded-full bg-[#28C840]" />
        </div>
        <Button
          size="sm"
          variant="primary"
          intent="none"
          rightIcon={
            copied ? (
              <Check className="animate-in fade-in zoom-in" />
            ) : (
              <Copy className="animate-in fade-in" />
            )
          }
          onClick={copyCommand}
        >
          {RUN_COMMAND}
        </Button>
      </div>
      <div className="relative">
        <div
          className="hide-scrollbar h-[355.5px] overflow-x-auto overflow-y-auto whitespace-nowrap bg-gray-2 p-3 font-mono text-[12px] leading-relaxed"
          style={{ color: ANSI.white }}
        >
          {/* Command line */}
          <div className="min-w-fit">
            <span style={{ color: ANSI.fg }}>~ $ </span>
            <W>{RUN_AND_SUBMIT_COMMAND.slice(0, typedChars)}</W>
            {!isTypingDone ? <span style={{ color: ANSI.white }}>▌</span> : null}
          </div>
          {/* Completed steps */}
          {STEPS.slice(0, completedUpTo + 1).map((step, i) => renderCompletedStep(step, i))}
          {/* Active step */}
          {currentStep >= 0 &&
            currentStep < STEPS.length &&
            currentStep > completedUpTo &&
            renderActiveStep(STEPS[currentStep])}
        </div>
        {isComplete ? (
          <Tooltip
            content="Restart animation"
            side="left"
            triggerProps={{ asChild: true }}
            inverted={false}
          >
            <IconButton
              className="absolute right-1 top-1 backdrop-blur duration-1000 animate-in fade-in"
              size="sm"
              variant="outline"
              intent="none"
              onClick={restart}
            >
              <RotateCw />
            </IconButton>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
};

export default AnimatedCliDemo;
