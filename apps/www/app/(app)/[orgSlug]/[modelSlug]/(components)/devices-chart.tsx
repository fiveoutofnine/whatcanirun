'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import clsx from 'clsx';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useQueryState } from 'nuqs';
import {
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { getVramGb } from '@/lib/constants/gpu';
import type { ModelDeviceSummary } from '@/lib/db/schema';
import { formatChipName, parseManufacturer } from '@/lib/utils';

import LogoImg from '@/components/common/logo-img';
import { Code } from '@/components/templates/mdx';
import { Button, Dropdown } from '@/components/ui';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ModelDevicesChartValue = ModelDeviceSummary & {
  quant: string;
  format: string;
  fileSizeBytes: number | null;
};

type ModelDevicesChartProps = {
  data: ModelDevicesChartValue[];
  defaultDevice: string;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const ModelDevicesChartChart: React.FC<ModelDevicesChartProps> = ({ data, defaultDevice }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartDimensions, setChartDimensions] = useState<{ width: number; height: number }>({
    width: 991,
    height: 446,
  });
  const [device] = useQueryState('device', { defaultValue: defaultDevice });
  const [selectedQuants, setSelectedQuants] = useState<Set<string> | null>(null);

  // Build quant options sorted by file size ascending (smallest → largest).
  const quantOptions = useMemo(() => {
    const counts = new Map<
      string,
      { quant: string; format: string; count: number; fileSizeBytes: number | null }
    >();
    for (const d of data) {
      if (d.avgDecodeTps <= 0 || d.avgPrefillTps <= 0) continue;
      const key = `${d.format}:${d.quant}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count++;
        if (
          d.fileSizeBytes != null &&
          (existing.fileSizeBytes == null || d.fileSizeBytes < existing.fileSizeBytes)
        ) {
          existing.fileSizeBytes = d.fileSizeBytes;
        }
      } else {
        counts.set(key, {
          quant: d.quant,
          format: d.format,
          count: 1,
          fileSizeBytes: d.fileSizeBytes,
        });
      }
    }
    return [...counts.values()].sort((a, b) => {
      if (a.fileSizeBytes == null && b.fileSizeBytes == null) return 0;
      if (a.fileSizeBytes == null) return 1;
      if (b.fileSizeBytes == null) return -1;
      return a.fileSizeBytes - b.fileSizeBytes;
    });
  }, [data]);

  const filteredData = useMemo(
    () =>
      data.filter((d) => {
        if (d.avgDecodeTps <= 0 || d.avgPrefillTps <= 0) return false;
        if (selectedQuants) return selectedQuants.has(getQuantOptionKey(d));
        return true;
      }),
    [data, selectedQuants],
  );

  const shortcutQuantKeys = useMemo(
    () => ({
      gguf: quantOptions.filter((o) => o.format === 'gguf').map(getQuantOptionKey),
      mlx: quantOptions.filter((o) => o.format === 'mlx').map(getQuantOptionKey),
      fourBit: quantOptions.filter((o) => matchesQuantBitWidth(o.quant, 4)).map(getQuantOptionKey),
      eightBit: quantOptions.filter((o) => matchesQuantBitWidth(o.quant, 8)).map(getQuantOptionKey),
    }),
    [quantOptions],
  );

  // Highlight highest decode (a) and prefill (b) data points.
  const highlightedIds = useMemo(() => {
    if (filteredData.length === 0) return new Map<string, 'decode' | 'prefill' | 'both'>();

    const ids = new Map<string, 'decode' | 'prefill' | 'both'>();

    const a = filteredData.reduce(
      (maxIdx, item, idx) => (item.avgDecodeTps > filteredData[maxIdx].avgDecodeTps ? idx : maxIdx),
      0,
    );
    const b = filteredData.reduce(
      (maxIdx, item, idx) =>
        item.avgPrefillTps > filteredData[maxIdx].avgPrefillTps ? idx : maxIdx,
      0,
    );

    const keyA = getDataPointKey(filteredData[a]);
    const keyB = getDataPointKey(filteredData[b]);

    if (keyA === keyB) {
      ids.set(keyA, 'both');
    } else {
      ids.set(keyA, 'decode');
      ids.set(keyB, 'prefill');
    }

    return ids;
  }, [filteredData]);

  const selectedChipId = device;

  // Sort so highlighted/selected nodes render last (on top) in SVG.
  const chartData = useMemo(
    () =>
      [...filteredData].sort((a, b) => {
        const aH =
          highlightedIds.has(getDataPointKey(a)) || a.deviceChipId === selectedChipId ? 1 : 0;
        const bH =
          highlightedIds.has(getDataPointKey(b)) || b.deviceChipId === selectedChipId ? 1 : 0;
        return aH - bH;
      }),
    [filteredData, highlightedIds, selectedChipId],
  );

  const updateDimensions = useCallback(() => {
    if (chartRef.current) {
      const svg = chartRef.current.querySelector('svg');
      if (svg) {
        const viewBox = svg.viewBox.baseVal;
        setChartDimensions({
          width: viewBox.width || svg.clientWidth,
          height: viewBox.height || svg.clientHeight,
        });
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(updateDimensions, 100);
    window.addEventListener('resize', updateDimensions);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, [updateDimensions]);

  return (
    <div
      ref={chartRef}
      className="flex h-[32rem] w-full flex-col rounded-none border-y border-gray-6 bg-gray-2 p-4 md:rounded-xl md:border-x"
    >
      <div className="flex items-center gap-1.5">
        <h3 className="text-base font-medium tracking-tight text-gray-12">
          Decode / Prefill Speeds
        </h3>
        <span className="font-mono text-xs text-gray-11">
          {chartData.length.toLocaleString()} device{chartData.length !== 1 ? 's' : ''}
        </span>
        {quantOptions.length > 1 ? (
          <Dropdown.Root>
            <Dropdown.Trigger asChild>
              <Button className="ml-auto" size="sm" variant="outline" rightIcon={<ChevronDown />}>
                {selectedQuants
                  ? `${selectedQuants.size} quant${selectedQuants.size !== 1 ? 's' : ''}`
                  : 'All quants'}
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Content align="end">
              <Dropdown.Group>
                <Dropdown.Item
                  icon={<ChevronRight />}
                  onSelect={(e) => {
                    e.preventDefault();
                    setSelectedQuants(null);
                  }}
                >
                  Select all
                </Dropdown.Item>
                {shortcutQuantKeys.gguf.length > 0 ? (
                  <Dropdown.Item
                    icon={<ChevronRight />}
                    onSelect={(e) => {
                      e.preventDefault();
                      setSelectedQuants(new Set(shortcutQuantKeys.gguf));
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      Select <LogoImg.Ggml size={16} /> only
                    </span>
                  </Dropdown.Item>
                ) : null}
                {shortcutQuantKeys.mlx.length > 0 ? (
                  <Dropdown.Item
                    icon={<ChevronRight />}
                    onSelect={(e) => {
                      e.preventDefault();
                      setSelectedQuants(new Set(shortcutQuantKeys.mlx));
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      Select <LogoImg.Mlx size={16} /> only
                    </span>
                  </Dropdown.Item>
                ) : null}
                {shortcutQuantKeys.fourBit.length > 0 ? (
                  <Dropdown.Item
                    icon={<ChevronRight />}
                    onSelect={(e) => {
                      e.preventDefault();
                      setSelectedQuants(new Set(shortcutQuantKeys.fourBit));
                    }}
                  >
                    Select 4-bit quants only
                  </Dropdown.Item>
                ) : null}
                {shortcutQuantKeys.eightBit.length > 0 ? (
                  <Dropdown.Item
                    icon={<ChevronRight />}
                    onSelect={(e) => {
                      e.preventDefault();
                      setSelectedQuants(new Set(shortcutQuantKeys.eightBit));
                    }}
                  >
                    Select 8-bit quants only
                  </Dropdown.Item>
                ) : null}
              </Dropdown.Group>
              <Dropdown.Separator />
              <Dropdown.Group>
                {quantOptions.map((opt) => {
                  const key = getQuantOptionKey(opt);
                  const checked = selectedQuants ? selectedQuants.has(key) : true;
                  const FormatLogo = FORMAT_LOGO[opt.format];

                  return (
                    <Dropdown.CheckboxItem
                      key={key}
                      checked={checked}
                      onCheckedChange={() => {
                        setSelectedQuants((prev) => {
                          if (!prev) {
                            // First deselection: start with all selected, then remove this one.
                            const all = new Set(quantOptions.map(getQuantOptionKey));
                            all.delete(key);
                            return all.size === 0 ? null : all;
                          }
                          const next = new Set(prev);
                          if (next.has(key)) {
                            next.delete(key);
                          } else {
                            next.add(key);
                          }
                          // If all are selected again, reset to null (= "All").
                          if (next.size === quantOptions.length) return null;
                          // If none are selected, keep at least one (don't allow empty).
                          if (next.size === 0) return prev;
                          return next;
                        });
                      }}
                      onSelect={(e) => e.preventDefault()}
                    >
                      <span className="flex w-full items-center gap-4">
                        <span className="flex items-center gap-1.5">
                          {opt.quant}
                          {FormatLogo ? <FormatLogo size={16} /> : <Code>{opt.format}</Code>}
                        </span>
                        <span className="ml-auto tabular-nums text-gray-11">
                          {opt.count.toLocaleString()} device{opt.count > 1 ? 's' : ''}
                        </span>
                      </span>
                    </Dropdown.CheckboxItem>
                  );
                })}
              </Dropdown.Group>
            </Dropdown.Content>
          </Dropdown.Root>
        ) : null}
      </div>
      <ResponsiveContainer className="mt-2" width="100%" height="100%">
        <ScatterChart
          className="focus:outline-none"
          margin={{ top: 0, left: 0, bottom: -11 }}
          tabIndex={-1}
        >
          <CartesianGrid className="stroke-gray-6" strokeDasharray="3 3" />
          <XAxis
            className="stroke-gray-9"
            orientation="bottom"
            dataKey="avgPrefillTps"
            type="number"
            tick={{
              className: 'tabular-nums select-none fill-gray-11',
              fontSize: 14,
              strokeWidth: 0,
            }}
            tickFormatter={(x) => x.toLocaleString()}
            tickLine={false}
            tickSize={4}
          />
          <YAxis
            className="stroke-gray-9"
            orientation="left"
            width={36}
            dataKey="avgDecodeTps"
            type="number"
            padding={{ top: 0, bottom: 0 }}
            tick={{
              className: 'tabular-nums select-none fill-gray-11',
              fontSize: 14,
              strokeWidth: 0,
            }}
            tickFormatter={(x) => x.toLocaleString()}
            tickLine={false}
            tickSize={4}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            wrapperStyle={{ zIndex: 100 }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const d = payload[0].payload as ModelDevicesChartValue;
              const { manufacturer, logo: Logo } = getManufacturerLogo(d);
              const FormatLogo = FORMAT_LOGO[d.format];
              const deviceName = getDeviceDisplayName(d);

              const isApple = manufacturer === 'apple';
              const vram = !isApple ? getVramGb(d.deviceGpu) : null;
              const gpuCount = d.deviceGpuCount ?? 1;
              const totalVram = vram != null ? vram * gpuCount : null;
              const deviceStats: string[] = [];
              if (isApple) {
                deviceStats.push(`${d.deviceCpuCores.toLocaleString()}-core CPU`);
                deviceStats.push(`${d.deviceGpuCores.toLocaleString()}-core GPU`);
              } else if (totalVram != null) {
                deviceStats.push(`${totalVram} GB VRAM`);
              }

              const statGroups = [
                [
                  { label: 'Quant', value: d.quant },
                  { label: 'Format', value: d.format.toUpperCase() },
                ],
                [
                  {
                    label: 'Prefill',
                    value: (
                      <span>
                        <span>
                          {d.avgPrefillTps.toLocaleString(undefined, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                        </span>
                        <span className="text-gray-11"> tok/s</span>
                      </span>
                    ),
                  },
                  {
                    label: 'Decode',
                    value: (
                      <span>
                        <span>
                          {d.avgDecodeTps.toLocaleString(undefined, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                        </span>
                        <span className="text-gray-11"> tok/s</span>
                      </span>
                    ),
                  },
                ],
              ];

              return (
                <div
                  className="z-60 max-w-[20rem] overflow-hidden rounded-md border border-gray-6 bg-gray-2 text-sm font-normal leading-normal text-gray-12 shadow-md animate-in fade-in-50"
                  tabIndex={-1}
                >
                  <div className="flex w-full items-center gap-2 p-2">
                    <div className="relative" style={{ width: 32, height: 32, minWidth: 32 }}>
                      {Logo ? (
                        <Logo className="rounded-full" size={32} />
                      ) : (
                        <div className="size-8 rounded-full border border-gray-6 bg-gray-5" />
                      )}
                      {FormatLogo ? (
                        <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center overflow-hidden rounded-full">
                          <FormatLogo className="rounded-full" size={16} />
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-1 text-sm font-medium leading-5">
                        {deviceName}
                        {isApple ? <Code>{d.deviceRamGb} GB RAM</Code> : null}
                      </div>
                      <span className="text-xs leading-4 text-gray-11">
                        {deviceStats.join(' / ')}
                      </span>
                    </div>
                  </div>
                  {statGroups.map((stat, i) => {
                    if (stat.length === 0) return null;
                    return (
                      <Fragment key={`stat-group-${i}`}>
                        <hr
                          className="border-0.5 w-full border-gray-6"
                          role="separator"
                          aria-hidden
                        />
                        <div className="flex gap-2 p-2 text-xs leading-4">
                          <div className="flex flex-col gap-1">
                            {stat.map(({ label }, j) => (
                              <span
                                key={`stat-label-${j}`}
                                className="h-4 whitespace-nowrap text-right text-gray-11"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                          <div className="flex w-full flex-col gap-1">
                            {stat.map(({ value }, j) => (
                              <span key={`stat-value-${j}`} className="h-4 text-right font-mono">
                                {value}
                              </span>
                            ))}
                          </div>
                        </div>
                      </Fragment>
                    );
                  })}
                </div>
              );
            }}
          />
          <Scatter
            name="Devices"
            data={chartData}
            className="fill-gray-9"
            tabIndex={-1}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            shape={(props: any) => {
              const { cx, cy } = props as { cx: number; cy: number } & ModelDevicesChartValue;
              const d = props as ModelDevicesChartValue;
              const selected = d.deviceChipId === selectedChipId;
              const highlighted = highlightedIds.has(getDataPointKey(d));
              const highlight = selected || highlighted;
              const { logo: Logo } = getManufacturerLogo(d);
              const FormatLogo = FORMAT_LOGO[d.format];

              const size = highlight ? 32 : 20;
              const formatSize = highlight ? 16 : 12;
              const containerSize = size + formatSize / 2 - 2;

              return (
                <foreignObject
                  className={highlight ? 'z-50' : 'z-40'}
                  x={cx - size / 2}
                  y={cy - size / 2}
                  width={containerSize}
                  height={containerSize}
                >
                  <div
                    className={clsx(
                      'relative',
                      highlight
                        ? 'opacity:100 z-50'
                        : 'z-40 opacity-50 transition-colors hover:opacity-100',
                    )}
                    style={{ width: size, height: size, minWidth: size }}
                    tabIndex={-1}
                  >
                    {Logo ? (
                      <Logo className="rounded-full" size={size} />
                    ) : (
                      <div
                        className="rounded-full border border-gray-6 bg-gray-5"
                        style={{ width: size, height: size }}
                      />
                    )}
                    {FormatLogo ? (
                      <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center overflow-hidden rounded-full">
                        <FormatLogo className="rounded-full" size={formatSize} />
                      </div>
                    ) : null}
                  </div>
                </foreignObject>
              );
            }}
          >
            <LabelList
              content={(props) => {
                const { x, y, index } = props as { x: number; y: number; index: number };
                const item = chartData[index];
                if (!item) return null;

                const pointKey = getDataPointKey(item);
                if (!pointKey || !highlightedIds.has(pointKey)) return null;

                const deviceName = getDeviceDisplayName(item);
                const reason = highlightedIds.get(pointKey);
                const reasonLabel = {
                  decode: 'Fastest decode',
                  prefill: 'Fastest prefill',
                  both: 'Fastest decode and prefill',
                }[reason!];

                const { width: chartWidth } = chartDimensions;
                let labelX = x;
                // eslint-disable-next-line no-useless-assignment
                let labelY = y;
                let anchor: 'start' | 'middle' | 'end' = 'middle';

                // Position based on proximity to edges.
                if (x < 120) {
                  // Right.
                  labelX = x + 28;
                  labelY = y + 3;
                  anchor = 'start';
                } else if (x > chartWidth - 96) {
                  // Left.
                  labelX = x - 20;
                  labelY = y + 3;
                  anchor = 'end';
                } else if (y < 48) {
                  // Bottom.
                  labelY = y + 32;
                } else {
                  // Top.
                  labelY = y - 30;
                }

                return (
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor={anchor}
                    className="pointer-events-none select-none"
                  >
                    <tspan className="fill-gray-12 font-medium" fontSize="12">
                      {deviceName}
                    </tspan>
                    <tspan className="fill-gray-11" x={labelX} dy="14" fontSize="10">
                      {reasonLabel}
                    </tspan>
                  </text>
                );
              }}
            />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getDataPointKey(d: ModelDevicesChartValue) {
  return `${d.deviceChipId}:${d.format}:${d.quant}`;
}

function getQuantOptionKey(d: Pick<ModelDevicesChartValue, 'format' | 'quant'>) {
  return `${d.format}:${d.quant}`;
}

const FORMAT_LOGO: Record<string, React.FC<{ className?: string; size?: number }>> = {
  gguf: LogoImg.Ggml,
  mlx: LogoImg.Mlx,
};

type QuantBitWidth = 4 | 8;

// Keep these filters explicit: mixed or brand-only labels such as APEX-Compact
// should not be guessed into the 4-bit/8-bit buckets unless the quant name says so.
const QUANT_BIT_WIDTH_EXACT_ALIASES: Record<QuantBitWidth, Set<string>> = {
  4: new Set([
    '4bit',
    '4-bit',
    'af4',
    'awq',
    'awq-4bit',
    'bitsandbytes-4bit',
    'bitsandbytes_4bit',
    'bnb-4bit',
    'bnb_4bit',
    'exl2-4bit',
    'fp4',
    'gptq',
    'gptq-4bit',
    'hqq-4bit',
    'hqq4',
    'int4',
    'iq4_0',
    'iq4_1',
    'iq4_m',
    'iq4_nl',
    'iq4_s',
    'iq4_xs',
    'iq4_xxs',
    'mxfp4',
    'nf4',
    'nvfp4',
    'optiq-4bit',
    'q4_0',
    'q4_1',
    'q4_2',
    'q4_3',
    'q4_k',
    'q4_k_l',
    'q4_k_m',
    'q4_k_s',
    'q4_k_xl',
    'q4_m',
    'q4_s',
    'q4f16',
    'q4f16_0',
    'q4f16_1',
    'quanto-fp4',
    'quanto-int4',
    'spqr-4bit',
    'uint4',
    'w4a4',
    'w4a16',
    'w4a8',
  ]),
  8: new Set([
    '8bit',
    '8-bit',
    'bitsandbytes-8bit',
    'bitsandbytes_8bit',
    'bnb-8bit',
    'bnb_8bit',
    'e4m3fn',
    'e4m3fnuz',
    'e5m2',
    'e5m2fn',
    'e5m2fnuz',
    'f8e4m3fn',
    'f8e4m3fnuz',
    'f8e5m2',
    'f8e5m2fn',
    'f8e5m2fnuz',
    'exl2-8bit',
    'f8_e4m3fn',
    'f8_e4m3fnuz',
    'f8_e5m2',
    'f8_e5m2fn',
    'f8_e5m2fnuz',
    'float8',
    'fp8',
    'gptq-8bit',
    'hqq-8bit',
    'hqq8',
    'int8',
    'iq8_0',
    'iq8_1',
    'llm-int8',
    'llm.int8',
    'llm_int8',
    'optiq-8bit',
    'q8_0',
    'q8_1',
    'q8_k',
    'quanto-fp8',
    'quanto-int8',
    'uint8',
    'w8a16',
    'w8a8',
  ]),
};

const QUANT_BIT_WIDTH_TOKEN_ALIASES: Record<QuantBitWidth, Set<string>> = {
  4: new Set([
    '4bit',
    'af4',
    'awq',
    'fp4',
    'gptq',
    'hqq4',
    'int4',
    'iq4',
    'mxfp4',
    'nf4',
    'nvfp4',
    'q4',
    'uint4',
    'w4a4',
    'w4a16',
    'w4a8',
  ]),
  8: new Set([
    '8bit',
    'e4m3fn',
    'e4m3fnuz',
    'e5m2',
    'e5m2fn',
    'e5m2fnuz',
    'float8',
    'fp8',
    'hqq8',
    'int8',
    'iq8',
    'q8',
    'uint8',
    'w8a16',
    'w8a8',
  ]),
};

function matchesQuantBitWidth(quant: string, bitWidth: QuantBitWidth) {
  const normalized = quant.trim().toLowerCase();
  if (QUANT_BIT_WIDTH_EXACT_ALIASES[bitWidth].has(normalized)) return true;

  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.some((token) => QUANT_BIT_WIDTH_TOKEN_ALIASES[bitWidth].has(token));
}

function getManufacturerLogo(datum: ModelDevicesChartValue) {
  const isApple = datum.deviceGpu.toLowerCase().startsWith('apple');
  const primaryName = isApple
    ? datum.deviceGpu
    : datum.deviceGpuCount > 0
      ? datum.deviceGpu
      : datum.deviceCpu;
  return parseManufacturer(primaryName);
}

function getDeviceDisplayName(datum: ModelDevicesChartValue) {
  const isApple = datum.deviceGpu.toLowerCase().startsWith('apple');
  const gpuCount = datum.deviceGpuCount ?? 1;
  const countPrefix = !isApple && gpuCount > 1 ? `${gpuCount}×` : '';
  return isApple
    ? formatChipName(datum.deviceCpu)
    : datum.deviceGpuCount > 0
      ? countPrefix + formatChipName(datum.deviceGpu)
      : formatChipName(datum.deviceCpu);
}

export default ModelDevicesChartChart;
