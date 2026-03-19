'use client';

import { forwardRef } from 'react';

import { switchStyles, switchThumbStyles } from './styles';
import type { SwitchProps } from './types';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import clsx from 'clsx';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const Switch = forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  (props, ref) => (
    <SwitchPrimitive.Root className={clsx(switchStyles)} ref={ref} {...props}>
      <SwitchPrimitive.Thumb className={clsx(switchThumbStyles)} />
    </SwitchPrimitive.Root>
  ),
);

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

Switch.displayName = 'Switch';

export default Switch;
