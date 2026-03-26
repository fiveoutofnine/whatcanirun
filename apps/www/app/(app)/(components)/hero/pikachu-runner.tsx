'use client';

import { Fragment } from 'react';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const PikachuRunner: React.FC<{
  runKeys: number[];
  // eslint-disable-next-line
  onComplete: (key: number) => void;
}> = ({ runKeys, onComplete }) => {
  return (
    <Fragment>
      {runKeys.map((k) => {
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={k}
            aria-hidden
            src="data:image/gif;base64,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"
            alt=""
            className="pointer-events-none absolute top-1 h-8 w-auto animate-[pikachu-run_linear_forwards]"
            style={{ animationDuration: `${2 + ((k * 2654435761) >>> 0) / 4294967296}s` }}
            onAnimationEnd={() => onComplete(k)}
          />
        );
      })}
    </Fragment>
  );
};

export default PikachuRunner;
