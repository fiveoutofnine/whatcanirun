'use client';

import { Fragment, useState } from 'react';

import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Check, CircleHelp } from 'lucide-react';

import { useMediaQuery } from '@/lib/hooks';

import { Command, Drawer, Popover } from '@/components/ui';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type RamComboboxProps = {
  options: number[];
  value: string;
  // eslint-disable-next-line
  onSelect: (ram: string) => void;
  children: React.ReactNode;
};

type RamComboboxInternalProps = {
  options: number[];
  value: string;
  // eslint-disable-next-line
  onSelect: (ram: string) => void;
  // eslint-disable-next-line
  setOpen: (open: boolean) => void;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const RamCombobox: React.FC<RamComboboxProps> = ({ options, value, onSelect, children }) => {
  const [open, setOpen] = useState(false);
  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  const internalProps = { options, value, onSelect, setOpen };

  return (
    <Fragment>
      <Drawer.Root open={open && isSmallScreen} onOpenChange={setOpen}>
        <Drawer.Trigger className="md:hidden" asChild>
          {children}
        </Drawer.Trigger>
        <Drawer.Content className="[&_[drawer-content]]:p-0">
          <VisuallyHidden.Root>
            <Drawer.Title>RAM</Drawer.Title>
            <Drawer.Description>Select a RAM configuration.</Drawer.Description>
          </VisuallyHidden.Root>
          <RamComboboxInternal {...internalProps} />
        </Drawer.Content>
      </Drawer.Root>
      <Popover.Root open={open && !isSmallScreen} onOpenChange={setOpen}>
        <Popover.Trigger className="hidden md:inline" asChild>
          {children}
        </Popover.Trigger>
        <Popover.Content
          className="w-36 p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <RamComboboxInternal {...internalProps} />
        </Popover.Content>
      </Popover.Root>
    </Fragment>
  );
};

const RamComboboxInternal: React.FC<RamComboboxInternalProps> = ({
  options,
  value,
  onSelect,
  setOpen,
}) => {
  return (
    <Command.Root noBorder>
      <Command.List tabIndex={-1}>
        <Command.Empty className="flex flex-col items-center">
          <div className="flex size-8 items-center justify-center rounded-full border border-gray-6 bg-gray-3 text-gray-11">
            <CircleHelp className="size-4" />
          </div>
          <div className="mt-1.5 text-center text-sm font-medium leading-5 text-gray-12">
            No options available
          </div>
        </Command.Empty>
        <Command.Group>
          {options.map((ram) => (
            <Command.Item
              key={ram}
              className="[&_[cmdk-item-content]]:flex [&_[cmdk-item-content]]:w-full [&_[cmdk-item-content]]:items-center [&_[cmdk-item-content]]:justify-between"
              value={`${ram} GB`}
              onSelect={() => {
                onSelect(String(ram));
                setOpen(false);
              }}
            >
              <span>{ram} GB RAM</span>
              {String(ram) === value ? <Check className="size-4" /> : null}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Root>
  );
};

export default RamCombobox;
