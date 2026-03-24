import Link, { type LinkProps } from 'next/link';

import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type LogoProps = Omit<LinkProps, 'href'> & {
  className?: string;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const Logo: React.FC<LogoProps> = ({ className, ...rest }) => {
  return (
    <Link
      className={twMerge(
        clsx(
          'line-clamp-1 flex w-fit select-none items-center gap-1.5 text-lg font-semibold tracking-tight text-gray-12 transition-colors hover:text-gray-11 focus-visible:rounded-md',
          className,
        ),
      )}
      href="/"
      {...rest}
    >
      <span className="font-serpentine pr-[0.1em]">whatcani.run</span>
    </Link>
  );
};

export default Logo;
