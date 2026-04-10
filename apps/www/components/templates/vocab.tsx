'use client';

import { Fragment } from 'react';

import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

import ClickableTooltip from '@/components/templates/clickable-tooltip';
import { Tooltip } from '@/components/ui';

// -----------------------------------------------------------------------------
// Constants + types
// -----------------------------------------------------------------------------

export const GLOSSARY = {
  contributors: {
    label: 'Contributors',
    description: 'Number of unique users who made a submission.',
  },
  decode: {
    label: 'Decode',
    description: 'The speed the model generated the output (completion) tokens.',
  },
  prefill: {
    label: 'Prefill',
    description: 'The speed the model processed the input (prompt) tokens.',
  },
  run: {
    label: 'Run',
    description: 'A benchmark run of a model on a device consisting of 1 or more trials.',
  },
  runnability: {
    label: 'Runnability',
    description: 'Weighted blend of decode/prefill throughput and memory usage.',
  },
  status: {
    label: 'Status',
    description:
      'Whether the run is pending, verified, flagged, or rejected. Aggregate stats are calculated over verified runs.',
  },
  trial: {
    label: 'Trial',
    description: 'A single iteration of a benchmark at a specified prompt/generation length.',
  },
  ttft: {
    label: 'Time to first token',
    description: 'p50 time taken to generate the first output token.',
  },
};

type VocabProps = React.HTMLAttributes<HTMLSpanElement> & {
  word: keyof typeof GLOSSARY;
  type?: 'button' | 'span';
  extra?: React.ReactNode;
  clickable?: boolean;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const Vocab: React.FC<VocabProps> = ({
  className,
  word,
  type = 'button',
  extra,
  clickable = true,
  children,
  ...rest
}) => {
  const MaybeClickableTooltip = clickable ? ClickableTooltip : Tooltip;

  return (
    <MaybeClickableTooltip
      className="p-0"
      content={
        <div className="flex flex-col">
          <div className="flex flex-col items-start p-2">
            <span className="text-sm font-medium">{GLOSSARY[word].label}</span>
            <span className="text-xs leading-normal text-gray-11">
              {GLOSSARY[word].description}
            </span>
          </div>
          {extra ? (
            <Fragment>
              <hr className="border-0.5 w-full border-gray-6" role="separator" aria-hidden />
              <div className="p-2">{extra}</div>
            </Fragment>
          ) : null}
        </div>
      }
      triggerProps={{
        className: 'focus-visible:rounded-sm',
        ...(type === 'span' ? { asChild: true } : { type: 'button' }),
      }}
      hasArrow
      inverted={false}
    >
      <span
        className={twMerge(
          clsx(
            'text-gray-11 underline decoration-dotted transition-colors hover:text-gray-12',
            type === 'span' ? 'cursor-pointer' : '',
            className,
          ),
        )}
        tabIndex={type === 'span' ? 0 : undefined}
        {...rest}
      >
        {children ?? GLOSSARY[word].label}
      </span>
    </MaybeClickableTooltip>
  );
};

export default Vocab;
