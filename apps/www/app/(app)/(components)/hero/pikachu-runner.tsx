'use client';

import Image from 'next/image';
import { Fragment } from 'react';

import pikachuGif from './running.gif';

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
      {runKeys.map((k) => (
        <Image
          key={k}
          aria-hidden
          src={pikachuGif}
          alt=""
          className="pointer-events-none absolute top-1 h-8 w-auto animate-[pikachu-run_3s_linear_forwards]"
          onAnimationEnd={() => onComplete(k)}
          unoptimized
        />
      ))}
    </Fragment>
  );
};

export default PikachuRunner;
