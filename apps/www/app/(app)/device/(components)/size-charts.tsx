'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import BoringAvatar from 'boring-avatars';
import clsx from 'clsx';
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import formatBytes from '@/lib/utils/format-bytes';

import LogoImg from '@/components/common/logo-img';
import ToggleButton from '@/components/templates/toggle-button';
import { Avatar, Button } from '@/components/ui';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type SizeChartValue = {
  modelId: string;
  modelDisplayName: string;
  modelFormat: string;
  modelFileSizeBytes: number | null;
  modelQuant: string | null;
  labName: string | null;
  labLogoUrl: string | null;
  labSlug: string | null;
  avgDecodeTps: number;
  avgPrefillTps: number;
};

type DeviceSizeChartsProps = {
  data: SizeChartValue[];
};

// -----------------------------------------------------------------------------
// Format colors
// -----------------------------------------------------------------------------

const FORMAT_CONFIG: Record<
  string,
  { label: string; intent: 'orange' | 'info'; border: string; activeStyles: string }
> = {
  gguf: {
    label: 'GGUF',
    intent: 'orange',
    border: 'border-orange-9',
    activeStyles:
      'bg-orange-5 data-[variant=outline]:text-orange-12 data-[variant=outline]:active:bg-orange-5',
  },
  mlx: {
    label: 'MLX',
    intent: 'info',
    border: 'border-blue-9',
    activeStyles:
      'bg-blue-5 data-[variant=outline]:text-blue-12 data-[variant=outline]:active:bg-blue-5',
  },
};

const FORMAT_LOGO: Record<string, React.FC<{ className?: string; size?: number }>> = {
  gguf: LogoImg.Ggml,
  mlx: LogoImg.Mlx,
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const DeviceSizeCharts: React.FC<DeviceSizeChartsProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      <DeviceSizeChart title="Decode vs. Size" data={data} yKey="avgDecodeTps" />
      <DeviceSizeChart title="Prefill vs. Size" data={data} yKey="avgPrefillTps" />
    </div>
  );
};

// -----------------------------------------------------------------------------
// Individual chart
// -----------------------------------------------------------------------------

type SizeChartProps = {
  title: string;
  data: SizeChartValue[];
  yKey: 'avgDecodeTps' | 'avgPrefillTps';
};

const DeviceSizeChart: React.FC<SizeChartProps> = ({ title, data, yKey }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [, setChartDimensions] = useState({ width: 603, height: 383 });
  const [logScale, setLogScale] = useState<boolean>(true);
  const [hiddenFormats, setHiddenFormats] = useState<Set<string>>(new Set());

  const formats = useMemo(() => {
    const set = new Set<string>();
    for (const d of data) set.add(d.modelFormat);
    return [...set].sort();
  }, [data]);

  const filteredData = useMemo(
    () => (hiddenFormats.size === 0 ? data : data.filter((d) => !hiddenFormats.has(d.modelFormat))),
    [data, hiddenFormats],
  );

  const toggleFormat = (format: string) => {
    setHiddenFormats((prev) => {
      const next = new Set(prev);
      if (next.has(format)) {
        next.delete(format);
      } else {
        if (next.size + 1 >= formats.length) return prev;
        next.add(format);
      }
      return next;
    });
  };

  const chartData = useMemo(
    () =>
      filteredData
        .filter((d) => d.modelFileSizeBytes != null && d.modelFileSizeBytes > 0 && d[yKey] > 0)
        .map((d) => ({
          ...d,
          fileSizeGb: d.modelFileSizeBytes! / 1_073_741_824,
          logFileSizeGb: Math.log10(d.modelFileSizeBytes! / 1_073_741_824),
        })),
    [filteredData, yKey],
  );

  const maxSizePowerOf10 = useMemo(() => {
    if (chartData.length === 0) return 1;
    const maxGb = Math.max(...chartData.map((d) => d.fileSizeGb));
    return Math.ceil(Math.log10(maxGb));
  }, [chartData]);

  const minSizePowerOf10 = useMemo(() => {
    if (chartData.length === 0) return -1;
    const minGb = Math.min(...chartData.map((d) => d.fileSizeGb));
    return Math.floor(Math.log10(minGb));
  }, [chartData]);

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

  useEffect(() => updateDimensions(), [logScale, updateDimensions]);

  return (
    <div
      ref={chartRef}
      className="flex h-[28rem] w-full flex-col rounded-none border-y border-gray-6 bg-gray-2 p-4 md:rounded-xl md:border-x"
    >
      <div className="flex items-center gap-1.5">
        <h3 className="text-base font-medium tracking-tight text-gray-12 line-clamp-1">{title}</h3>
        <div className="ml-auto flex items-center gap-1">
          {formats.map((format) => {
            const config = FORMAT_CONFIG[format];
            const Logo = FORMAT_LOGO[format];
            const active = !hiddenFormats.has(format);

            return (
              <Button
                key={format}
                size="sm"
                className={active ? config?.activeStyles : ''}
                variant="outline"
                intent={config?.intent ?? 'none'}
                onClick={() => toggleFormat(format)}
                leftIcon={Logo ? <Logo size={14} /> : undefined}
              >
                {config?.label ?? format.toUpperCase()}
              </Button>
            );
          })}
          <ToggleButton defaultPressed pressed={logScale} onPressedChange={setLogScale}>
            Log
          </ToggleButton>
        </div>
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
            dataKey={logScale ? 'logFileSizeGb' : 'fileSizeGb'}
            type="number"
            name="File Size"
            padding={{ left: 0, right: logScale ? 18 : 0 }}
            tick={{
              className: 'tabular-nums select-none fill-gray-11',
              fontSize: 14,
              strokeWidth: 0,
            }}
            ticks={
              logScale
                ? Array.from(
                  { length: maxSizePowerOf10 - minSizePowerOf10 + 1 },
                  (_, i) => minSizePowerOf10 + i,
                )
                : undefined
            }
            tickFormatter={(x) =>
              logScale
                ? `${Number(Math.pow(10, x).toPrecision(2))} GB`
                : `${Number(x).toFixed(1)} GB`
            }
            tickLine={false}
            tickSize={4}
          />
          <YAxis
            className="stroke-gray-9"
            orientation="left"
            width={42}
            dataKey={yKey}
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
              const d = payload[0].payload as SizeChartValue & { fileSizeGb: number };

              return (
                <div
                  className="z-60 max-w-[20rem] overflow-hidden rounded-md border border-gray-6 bg-gray-2 text-sm font-normal leading-normal text-gray-12 shadow-md animate-in fade-in-50"
                  tabIndex={-1}
                >
                  <div className="flex w-full items-center gap-2 p-2">
                    <LabIcon logoUrl={d.labLogoUrl} name={d.labName} size={32} />
                    <div className="flex flex-col items-start">
                      <div className="text-sm font-medium leading-5">{d.modelDisplayName}</div>
                      {d.labName ? (
                        <span className="text-xs leading-4 text-gray-11">{d.labName}</span>
                      ) : null}
                    </div>
                  </div>
                  <hr className="border-0.5 w-full border-gray-6" role="separator" aria-hidden />
                  <div className="flex gap-2 p-2 text-xs leading-4">
                    <div className="flex flex-col gap-1">
                      <span className="h-4 whitespace-nowrap text-right text-gray-11">Quant</span>
                      <span className="h-4 whitespace-nowrap text-right text-gray-11">Format</span>
                      <span className="h-4 whitespace-nowrap text-right text-gray-11">Size</span>
                    </div>
                    <div className="flex w-full flex-col gap-1">
                      <span className="h-4 text-right font-mono">{d.modelQuant ?? '—'}</span>
                      <span className="h-4 text-right font-mono">
                        {d.modelFormat.toUpperCase()}
                      </span>
                      <span className="h-4 text-right font-mono">
                        {d.modelFileSizeBytes != null ? formatBytes(d.modelFileSizeBytes) : '—'}
                      </span>
                    </div>
                  </div>
                  <hr className="border-0.5 w-full border-gray-6" role="separator" aria-hidden />
                  <div className="flex gap-2 p-2 text-xs leading-4">
                    <div className="flex flex-col gap-1">
                      <span className="h-4 whitespace-nowrap text-right text-gray-11">Decode</span>
                      <span className="h-4 whitespace-nowrap text-right text-gray-11">Prefill</span>
                    </div>
                    <div className="flex w-full flex-col gap-1">
                      <span className="h-4 text-right font-mono">
                        {d.avgDecodeTps.toLocaleString(undefined, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                        <span className="text-gray-11"> tok/s</span>
                      </span>
                      <span className="h-4 text-right font-mono">
                        {d.avgPrefillTps.toLocaleString(undefined, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                        <span className="text-gray-11"> tok/s</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Scatter
            name="Models"
            data={chartData}
            className="fill-gray-9"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            shape={(props: any) => {
              const { cx, cy } = props as { cx: number; cy: number };
              const d = props as SizeChartValue;
              const inner = 20;
              const border = 2;
              const outer = inner + border * 2;
              const config = FORMAT_CONFIG[d.modelFormat];
              const borderClass = config?.border ?? 'border-gray-7';

              return (
                <foreignObject x={cx - outer / 2} y={cy - outer / 2} width={outer} height={outer}>
                  <div
                    className={clsx(
                      'rounded-full border-2 opacity-70 transition-opacity hover:opacity-100',
                      borderClass,
                    )}
                    style={{ width: outer, height: outer }}
                  >
                    <LabIcon logoUrl={d.labLogoUrl} name={d.labName} size={inner} />
                  </div>
                </foreignObject>
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Lab icon helper
// -----------------------------------------------------------------------------

const LabIcon: React.FC<{
  logoUrl: string | null;
  name: string | null;
  size: number;
  className?: string;
}> = ({ logoUrl, name, size, className }) => {
  if (logoUrl) {
    return (
      <Avatar.Root className={className} size={size}>
        <Avatar.Image src={logoUrl} />
        <Avatar.Fallback>{name ?? 'Lab'}</Avatar.Fallback>
      </Avatar.Root>
    );
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '9999px',
        overflow: 'hidden',
      }}
    >
      <BoringAvatar size={size} name={name ?? 'Unknown'} variant="beam" />
    </div>
  );
};

export default DeviceSizeCharts;
