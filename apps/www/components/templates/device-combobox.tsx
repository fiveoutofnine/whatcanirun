'use client';

import { Fragment, useMemo, useState } from 'react';

import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { defaultFilter } from 'cmdk';
import { Check, CircleHelp } from 'lucide-react';

import { useMediaQuery } from '@/lib/hooks';

import { Code } from '@/components/templates/mdx';
import { Command, Drawer, Popover } from '@/components/ui';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type DeviceOption = {
  cpu: string;
  cpuCores: number;
  gpu: string;
  gpuCores: number;
  ramGb: number;
};

type DeviceComboboxProps = {
  devices: DeviceOption[];
  value: string;
  // eslint-disable-next-line
  onSelect: (chipId: string) => void;
  children: React.ReactNode;
};

type DeviceComboboxInternalProps = {
  groups: { name: string; devices: (DeviceOption & { key: string })[] }[];
  value: string;
  // eslint-disable-next-line
  onSelect: (chipId: string) => void;
  // eslint-disable-next-line
  setOpen: (open: boolean) => void;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const DeviceCombobox: React.FC<DeviceComboboxProps> = ({ devices, value, onSelect, children }) => {
  const [open, setOpen] = useState(false);
  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  // Group by manufacturer.
  const groups = useMemo(() => {
    const byManufacturer = new Map<string, (DeviceOption & { key: string })[]>();
    for (const d of devices) {
      const key = `${d.cpu}:${d.cpuCores}:${d.gpu}:${d.gpuCores}:${d.ramGb}`;
      const manufacturer = d.gpu.split(' ')[0];
      const group = byManufacturer.get(manufacturer) ?? [];
      group.push({ ...d, key });
      byManufacturer.set(manufacturer, group);
    }

    return [...byManufacturer.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, devs]) => ({
        name,
        devices: devs,
      }));
  }, [devices]);

  const internalProps = { groups, value, onSelect, setOpen };

  return (
    <Fragment>
      <Drawer.Root open={open && isSmallScreen} onOpenChange={setOpen}>
        <Drawer.Trigger className="md:hidden" asChild>
          {children}
        </Drawer.Trigger>
        <Drawer.Content className="[&_[drawer-content]]:p-0">
          <VisuallyHidden.Root>
            <Drawer.Title>Devices</Drawer.Title>
            <Drawer.Description>Select a device to filter models by.</Drawer.Description>
          </VisuallyHidden.Root>
          <DeviceComboboxInternal {...internalProps} />
        </Drawer.Content>
      </Drawer.Root>
      <Popover.Root open={open && !isSmallScreen} onOpenChange={setOpen}>
        <Popover.Trigger className="hidden md:inline" asChild>
          {children}
        </Popover.Trigger>
        <Popover.Content className="w-56 p-0" align="start">
          <DeviceComboboxInternal {...internalProps} />
        </Popover.Content>
      </Popover.Root>
    </Fragment>
  );
};

const DeviceComboboxInternal: React.FC<DeviceComboboxInternalProps> = ({
  groups,
  value,
  onSelect,
  setOpen,
}) => {
  const [search, setSearch] = useState<string>('');

  return (
    <Command.Root noBorder>
      <Command.Input placeholder="Search devices…" value={search} onValueChange={setSearch} />
      <Command.List tabIndex={-1}>
        <Command.Empty className="flex flex-col items-center">
          <div className="flex size-8 items-center justify-center rounded-full border border-gray-6 bg-gray-3 text-gray-11">
            <CircleHelp className="size-4" />
          </div>
          <div className="mt-1.5 text-center text-sm font-medium leading-5 text-gray-12">
            No devices found
          </div>
          <div className="text-center text-xs font-normal leading-4 text-gray-11">
            Try a different search term.
          </div>
        </Command.Empty>

        {groups.map(({ name, devices: devs }, i) => {
          let deviceCount = devs.length;
          if (search.trim()) {
            deviceCount = devs.filter((d) => {
              const itemValue = `${d.cpu} ${d.cpuCores} ${d.gpuCores} ${d.ramGb}`;
              return defaultFilter(itemValue, search);
            }).length;
          }

          return (
            <Fragment key={name}>
              {i > 0 ? <Command.Separator /> : null}
              <Command.Group
                heading={
                  <span className="flex w-full items-center justify-between">
                    <span>{name}</span>
                    <span className="text-xs font-normal leading-4 text-gray-11">
                      {deviceCount.toLocaleString()} {deviceCount === 1 ? 'device' : 'devices'}
                    </span>
                  </span>
                }
              >
                {devs.map((d) => {
                  const selected = d.key === value;

                  return (
                    <Command.Item
                      key={d.key}
                      className="h-11 [&_[cmdk-item-content]]:flex [&_[cmdk-item-content]]:w-full [&_[cmdk-item-content]]:items-start [&_[cmdk-item-content]]:justify-between [&_[cmdk-item-content]]:gap-1.5"
                      value={`${d.gpu}-${d.cpuCores}-${d.gpuCores}-${d.ramGb}`}
                      onSelect={() => {
                        onSelect(d.key);
                        setOpen(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="line-clamp-1 flex items-center gap-1.5 text-ellipsis leading-5">
                          {d.gpu.replace(name, '')}
                          <Code>{d.ramGb} GB RAM</Code>
                        </span>
                        <span className="text-xs leading-4 text-gray-11">
                          {d.cpuCores}-core CPU / {d.gpuCores}-core GPU
                        </span>
                      </div>
                      {selected ? (
                        <span className="flex items-center justify-center pt-0.5 text-gray-12">
                          <Check className="size-4" />
                        </span>
                      ) : null}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            </Fragment>
          );
        })}
      </Command.List>
    </Command.Root>
  );
};

export default DeviceCombobox;
