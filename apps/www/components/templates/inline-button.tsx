'use client';

import { forwardRef } from 'react';

import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

// We use `<span>` instead of `<button>` so the text participates in inline
// flow and wraps naturally with the surrounding text. We reimplement button
// semantics via `role`, `tabIndex`, and `onKeyDown`.
const InlineButton = forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ children, className, ...rest }, ref) => (
    <span
      ref={ref}
      className={twMerge(
        clsx(
          'inline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-9',
          className,
        ),
      )}
      tabIndex={0}
      role="button"
      onKeyDown={(e: React.KeyboardEvent<HTMLSpanElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.currentTarget.click();
        }
      }}
      {...rest}
      // @ts-expect-error We prevent any `type="button"` prop merging via
      // `Slot`/`asChild`.
      type={undefined}
    >
      {children}
    </span>
  ),
);

InlineButton.displayName = 'InlineButton';

export default InlineButton;
