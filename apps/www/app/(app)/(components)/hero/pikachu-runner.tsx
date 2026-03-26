'use client';

import Image from 'next/image';
import { Fragment } from 'react';

import pikachu from './pikachu.gif';

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
          <Image
            key={k}
            aria-hidden
            src={pikachu}
            alt=""
            className="pointer-events-none absolute top-1 h-8 w-auto animate-[pikachu-run_linear_forwards]"
            style={{ animationDuration: `${2 + ((k * 2654435761) >>> 0) / 4294967296}s` }}
            onAnimationEnd={() => onComplete(k)}
            unoptimized
          />
        );
      })}
    </Fragment>
  );
};

export default PikachuRunner;
