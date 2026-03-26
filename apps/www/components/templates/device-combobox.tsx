'use client';

import { Fragment, useMemo, useState } from 'react';

import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { defaultFilter } from 'cmdk';
import { Check, CircleHelp, Cpu, Gpu } from 'lucide-react';

import { useMediaQuery } from '@/lib/hooks';

import { Command, Drawer, Popover } from '@/components/ui';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type DeviceOption = {
  cpu: string;
  cpuCores: number;
  gpu: string;
  gpuCores: number;
};

type DeviceComboboxProps = {
  devices: DeviceOption[];
  value: string;
  // eslint-disable-next-line
  onSelect: (chipKey: string) => void;
  children: React.ReactNode;
};

type DeviceComboboxInternalProps = {
  groups: { name: string; devices: (DeviceOption & { key: string })[] }[];
  value: string;
  // eslint-disable-next-line
  onSelect: (chipKey: string) => void;
  // eslint-disable-next-line
  setOpen: (open: boolean) => void;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const DeviceCombobox: React.FC<DeviceComboboxProps> = ({ devices, value, onSelect, children }) => {
  const [open, setOpen] = useState(false);
  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  // Deduplicate by chip key and group by manufacturer.
  const groups = useMemo(() => {
    const seen = new Map<string, DeviceOption>();
    for (const d of devices) {
      const key = chipKey(d);
      if (!seen.has(key)) seen.set(key, d);
    }

    const byManufacturer = new Map<string, (DeviceOption & { key: string })[]>();
    for (const [key, d] of seen) {
      const manufacturer = getManufacturer(d.cpu);
      const group = byManufacturer.get(manufacturer) ?? [];
      group.push({ ...d, key });
      byManufacturer.set(manufacturer, group);
    }

    return [...byManufacturer.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, devs]) => ({
        name,
        devices: devs.sort((a, b) => a.cpuCores - b.cpuCores || a.gpuCores - b.gpuCores),
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
        <Popover.Trigger className="hidden md:inline-flex" asChild>
          {children}
        </Popover.Trigger>
        <Popover.Content className="w-72 p-0" align="start">
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
  const [search, setSearch] = useState('');

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
              const itemValue = `${d.cpu} ${d.cpuCores} ${d.gpuCores}`;
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
                {devs.map((d) => (
                  <Command.Item
                    key={d.key}
                    className="[&_[cmdk-item-content]]:flex [&_[cmdk-item-content]]:w-full [&_[cmdk-item-content]]:items-center [&_[cmdk-item-content]]:justify-between [&_[cmdk-item-content]]:gap-1.5"
                    value={`${d.cpu} ${d.cpuCores} ${d.gpuCores}`}
                    icon={<Check className={d.key === value ? 'opacity-100' : 'opacity-0'} />}
                    onSelect={() => {
                      onSelect(d.key);
                      setOpen(false);
                    }}
                  >
                    <span className="line-clamp-1 text-ellipsis">{formatCpu(d.cpu)}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-gray-11">
                        <Cpu className="size-3" />
                        <span>{d.cpuCores}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-11">
                        <Gpu className="size-3" />
                        <span>{d.gpuCores}</span>
                      </div>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            </Fragment>
          );
        })}
      </Command.List>
    </Command.Root>
  );
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Chip key (hardware config without RAM). */
const chipKey = (c: { cpu: string; cpuCores: number; gpu: string; gpuCores: number }) =>
  `${c.cpu}:${c.cpuCores}:${c.gpu}:${c.gpuCores}`;

/** Extract manufacturer from CPU name (e.g. "Apple M1 Max" → "Apple"). */
const getManufacturer = (cpu: string) => cpu.split(' ')[0] ?? cpu;

/** Strip manufacturer prefix for display (e.g. "Apple M1 Max" → "M1 Max"). */
const formatCpu = (name: string) => name.replace(/^\S+\s+/, '');

export default DeviceCombobox;
