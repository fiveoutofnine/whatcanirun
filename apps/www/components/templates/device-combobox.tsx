'use client';

import { Fragment, useMemo, useState } from 'react';

import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import clsx from 'clsx';
import { defaultFilter } from 'cmdk';
import { Check, CircleHelp } from 'lucide-react';

import { getGpuSeriesRank, getVramGb } from '@/lib/constants/gpu';
import { useMediaQuery } from '@/lib/hooks';

import LogoImg from '@/components/common/logo-img';
import { Code } from '@/components/templates/mdx';
import { Badge, Command, Drawer, Popover } from '@/components/ui';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type DeviceOption = {
  chipId: string;
  cpu: string;
  cpuCores: number;
  gpu: string;
  gpuCores: number;
  gpuCount: number;
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

const MANUFACTURER_ICON: Map<string, React.FC<{ className?: string; size?: number }>> = new Map([
  ['nvidia', LogoImg.Nvidia],
  ['amd', LogoImg.Amd],
  ['intel', LogoImg.Intel],
  ['apple', LogoImg.Apple],
]);

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const DeviceCombobox: React.FC<DeviceComboboxProps> = ({ devices, value, onSelect, children }) => {
  const [open, setOpen] = useState(false);
  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  // Group by manufacturer.
  const groups = useMemo(() => {
    const byManufacturer = new Map<string, (DeviceOption & { key: string })[]>();
    const filteredDevices = devices.filter((d) => d.gpuCount > 0);
    for (const d of filteredDevices) {
      const key = d.chipId;
      const primaryName = d.gpu;
      const manufacturer = primaryName.split(' ')[0];
      const group = byManufacturer.get(manufacturer) ?? [];
      group.push({ ...d, key });
      byManufacturer.set(manufacturer, group);
    }

    // Sort devices within each group: most powerful first.
    const appleTierOrder: Record<string, number> = { ultra: 4, max: 3, pro: 2 };
    const parseAppleChip = (gpu: string) => {
      const match = gpu.match(/Apple M(\d+)\s*(Ultra|Max|Pro)?/i);
      if (!match) return { gen: 0, tier: 0 };
      return {
        gen: parseInt(match[1]),
        tier: appleTierOrder[match[2]?.toLowerCase() ?? ''] ?? 1,
      };
    };

    for (const [manufacturer, devs] of byManufacturer) {
      if (manufacturer === 'Apple') {
        devs.sort((a, b) => {
          const chipA = parseAppleChip(a.gpu);
          const chipB = parseAppleChip(b.gpu);
          if (chipA.gen !== chipB.gen) return chipB.gen - chipA.gen;
          if (chipA.tier !== chipB.tier) return chipB.tier - chipA.tier;
          return b.ramGb - a.ramGb;
        });
      } else {
        devs.sort((a, b) => {
          const seriesA = getGpuSeriesRank(a.gpu);
          const seriesB = getGpuSeriesRank(b.gpu);
          if (seriesA !== seriesB) return seriesB - seriesA;
          const vramA = (getVramGb(a.gpu) ?? 0) * (a.gpuCount ?? 1);
          const vramB = (getVramGb(b.gpu) ?? 0) * (b.gpuCount ?? 1);
          if (vramA !== vramB) return vramB - vramA;
          if (a.gpuCores !== b.gpuCores) return b.gpuCores - a.gpuCores;
          return b.ramGb - a.ramGb;
        });
      }
    }

    // Apple first, then alphabetical.
    return [...byManufacturer.entries()]
      .sort(([a], [b]) => {
        if (a === 'Apple') return -1;
        if (b === 'Apple') return 1;
        return a.localeCompare(b);
      })
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
        <Popover.Content className="w-72 rounded-[0.625rem] p-0">
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
      <Command.Input
        placeholder="Search devices to see all…"
        value={search}
        onValueChange={setSearch}
      />
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
              const itemValue = `${d.gpu} ${d.cpu} ${d.cpuCores} ${d.gpuCores} ${d.ramGb}`;
              return defaultFilter(itemValue, search);
            }).length;
          }

          const ManufacturerIcon = MANUFACTURER_ICON.get(name.toLowerCase());

          return (
            <Fragment key={name}>
              {i > 0 ? <Command.Separator /> : null}
              <Command.Group
                heading={
                  <span className="flex w-full items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      {ManufacturerIcon ? (
                        <ManufacturerIcon className="rounded-full" size={18} />
                      ) : null}
                      {name}
                    </span>
                    <span className="text-xs font-normal leading-4 text-gray-11">
                      {i === 0 && deviceCount > 5 ? 'Showing 5/' : ''}
                      {deviceCount.toLocaleString()} {deviceCount === 1 ? 'device' : 'devices'}
                    </span>
                  </span>
                }
              >
                {(search.trim() || i > 0 ? devs : devs.slice(0, 5)).map((d) => {
                  const selected = d.key === value;
                  const isApple = d.gpu.toLowerCase().startsWith('apple');

                  return (
                    <Command.Item
                      key={d.key}
                      className={clsx(
                        'h-11 [&_[cmdk-item-content]]:flex [&_[cmdk-item-content]]:w-full [&_[cmdk-item-content]]:items-start [&_[cmdk-item-content]]:justify-between [&_[cmdk-item-content]]:gap-1.5',
                        !selected ? '[&_[cmdk-item-content]]:pl-6' : '',
                      )}
                      value={isApple ? `${d.gpu}-${d.cpuCores}-${d.gpuCores}-${d.ramGb}` : d.key}
                      icon={selected ? <Check /> : null}
                      onSelect={() => {
                        onSelect(d.key);
                        setOpen(false);
                      }}
                    >
                      <div className="flex flex-col">
                        {isApple ? (
                          <Fragment>
                            <span className="line-clamp-1 flex w-full items-center gap-1.5 text-ellipsis text-nowrap leading-5">
                              {d.gpu.replace(name, '')}
                              <Code>{d.ramGb} GB RAM</Code>
                            </span>
                            <span className="text-xs leading-4 text-gray-11">
                              {d.cpuCores}-core CPU / {d.gpuCores}-core GPU
                            </span>
                          </Fragment>
                        ) : (
                          <Fragment>
                            <span className="flex w-full max-w-full items-center gap-1.5 leading-5">
                              <span className="line-clamp-1">{d.gpu.replace(name, '').trim()}</span>
                              {d.gpuCount > 1 ? (
                                <Badge
                                  className="min-w-fit"
                                  size="sm"
                                  variant="outline"
                                  intent="none"
                                  type="number"
                                >
                                  {d.gpuCount}×
                                </Badge>
                              ) : null}
                            </span>
                            {(() => {
                              const vram = getVramGb(d.gpu);
                              const totalVram = vram != null ? vram * (d.gpuCount ?? 1) : null;
                              return totalVram != null ? (
                                <span className="text-xs leading-4 text-gray-11">
                                  {totalVram} GB VRAM
                                </span>
                              ) : null;
                            })()}
                          </Fragment>
                        )}
                      </div>
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
