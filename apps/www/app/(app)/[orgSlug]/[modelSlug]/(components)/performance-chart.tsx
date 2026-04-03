'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

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

import LogoImg from '@/components/common/logo-img';
import ScoreBadge from '@/components/templates/score-badge';
import ToggleButton from '@/components/templates/toggle-button';
import UserAvatar from '@/components/templates/user-avatar';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ChartPoint = {
  id: string; // modelId + deviceChipId
  quant: string | null;
  format: string;
  deviceLabel: string;
  deviceManufacturer: string;
  avgDecodeTps: number;
  avgPrefillTps: number;
  compositeScore: number;
  bestRuntime: string;
  ttftP50Ms: number;
  avgPeakRssMb: number | null;
};

type PerformanceChartProps = {
  data: ChartPoint[];
};

// -----------------------------------------------------------------------------
// Manufacturer logo lookup
// -----------------------------------------------------------------------------

const MANUFACTURER_LOGO: Record<string, React.FC<{ className?: string; size?: number }>> = {
  apple: LogoImg.Apple,
  nvidia: LogoImg.Nvidia,
  amd: LogoImg.Amd,
  intel: LogoImg.Intel,
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatTps(tps: number): string {
  return `${tps.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} tok/s`;
}

function formatTtft(ms: number): string {
  if (ms < 4_000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1_000).toFixed(2)} s`;
}

function formatMemory(mb: number | null): string {
  if (mb == null) return '—';
  return `${(mb / 1024).toFixed(2)} GB`;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
  const [logScale, setLogScale] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 1246, height: 446 });

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        logPrefill: d.avgPrefillTps > 0 ? Math.log10(d.avgPrefillTps) : 0,
      })),
    [data],
  );

  // Highlighted points: fastest decode, fastest prefill, best score
  const highlightedIds = useMemo(() => {
    const ids = new Map<string, 'decode' | 'prefill' | 'score'>();
    if (data.length === 0) return ids;

    const bestDecode = data.reduce((best, d) => (d.avgDecodeTps > best.avgDecodeTps ? d : best));
    const bestPrefill = data.reduce((best, d) => (d.avgPrefillTps > best.avgPrefillTps ? d : best));
    const bestScore = data.reduce((best, d) => (d.compositeScore > best.compositeScore ? d : best));

    ids.set(bestDecode.id, 'decode');
    ids.set(bestPrefill.id, 'prefill');
    ids.set(bestScore.id, 'score');

    return ids;
  }, [data]);

  const updateDimensions = () => {
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
  };

  useEffect(() => {
    const timer = setTimeout(updateDimensions, 100);
    window.addEventListener('resize', updateDimensions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  useEffect(() => updateDimensions(), [logScale]);

  return (
    <div
      ref={chartRef}
      className="flex h-[32rem] w-full flex-col rounded-none border-y border-gray-6 bg-gray-2 p-4 md:rounded-xl md:border-x"
    >
      <div className="flex grow items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-base font-medium tracking-tight text-gray-12">Prefill vs Decode</h3>
          <span className="font-mono text-xs text-gray-11">
            {data.length.toLocaleString()} results
          </span>
        </div>
        <ToggleButton defaultPressed={logScale} pressed={logScale} onPressedChange={setLogScale}>
          Log
        </ToggleButton>
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
            dataKey={logScale ? 'logPrefill' : 'avgPrefillTps'}
            type="number"
            name="Prefill"
            padding={{ left: 0, right: logScale ? 18 : 0 }}
            tick={{
              className: 'tabular-nums select-none fill-gray-11',
              fontSize: 14,
              strokeWidth: 0,
            }}
            tickFormatter={(v) => (logScale ? `${Math.round(Math.pow(10, v))}` : `${v}`)}
            tickLine={false}
            tickSize={4}
            label={{
              value: 'Prefill (tok/s)',
              position: 'insideBottom',
              offset: 14,
              className: 'fill-gray-11',
              fontSize: 12,
            }}
          />
          <YAxis
            className="stroke-gray-9"
            orientation="left"
            width={36}
            dataKey="avgDecodeTps"
            type="number"
            name="Decode"
            tick={{
              className: 'tabular-nums select-none fill-gray-11',
              fontSize: 14,
              strokeWidth: 0,
            }}
            tickFormatter={(v) => `${v}`}
            tickLine={false}
            tickSize={4}
            label={{
              value: 'Decode (tok/s)',
              angle: -90,
              position: 'insideLeft',
              offset: 8,
              className: 'fill-gray-11',
              fontSize: 12,
            }}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as ChartPoint;

              const stats = [
                { label: 'Decode', value: formatTps(d.avgDecodeTps) },
                { label: 'Prefill', value: formatTps(d.avgPrefillTps) },
                { label: 'TTFT (p50)', value: formatTtft(d.ttftP50Ms) },
                { label: 'Peak mem', value: formatMemory(d.avgPeakRssMb) },
                { label: 'Runtime', value: d.bestRuntime },
              ];

              const ManufacturerLogo = MANUFACTURER_LOGO[d.deviceManufacturer.toLowerCase()];

              return (
                <div className="z-50 max-w-[20rem] overflow-hidden rounded-md border border-gray-6 bg-gray-2 text-sm font-normal leading-normal text-gray-12 shadow-md animate-in fade-in-50">
                  <div className="flex w-full items-center gap-2 p-2">
                    {ManufacturerLogo ? (
                      <ManufacturerLogo size={28} className="rounded-full" />
                    ) : (
                      <div className="size-7 rounded-full border border-gray-6 bg-gray-5" />
                    )}
                    <div className="flex flex-col items-start">
                      <div className="text-sm font-medium leading-5">{d.deviceLabel}</div>
                      <span className="text-xs leading-4 text-gray-11">{d.quant ?? d.format}</span>
                    </div>
                    <div className="ml-auto">
                      <ScoreBadge score={d.compositeScore} />
                    </div>
                  </div>
                  <hr className="border-0.5 w-full border-gray-6" />
                  <div className="flex p-2 text-xs leading-4">
                    <div className="flex flex-col gap-1">
                      {stats.map((s) => (
                        <span key={s.label} className="h-4 whitespace-nowrap text-gray-11">
                          {s.label}
                        </span>
                      ))}
                    </div>
                    <div className="flex w-full flex-col gap-1">
                      {stats.map((s) => (
                        <span key={s.label} className="h-4 text-right font-mono">
                          {s.value}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Scatter
            name="Performance"
            data={chartData}
            className="fill-gray-9"
            shape={(props: unknown) => {
              const { cx, cy, ...item } = props as { cx: number; cy: number } & ChartPoint;
              const isHighlighted = highlightedIds.has(item.id);
              const manufacturer = item.deviceManufacturer.toLowerCase();
              const ManufacturerLogo = MANUFACTURER_LOGO[manufacturer];

              if (!isHighlighted) {
                if (ManufacturerLogo) {
                  return (
                    <foreignObject x={cx - 10} y={cy - 10} width={20} height={20}>
                      <ManufacturerLogo size={20} className="rounded-full opacity-80" />
                    </foreignObject>
                  );
                }
                return <circle className="fill-gray-9 stroke-gray-7" cx={cx} cy={cy} r={6} />;
              }

              const size = 24;
              if (ManufacturerLogo) {
                return (
                  <foreignObject x={cx - size / 2} y={cy - size / 2} width={size} height={size}>
                    <ManufacturerLogo size={size} className="rounded-full" />
                  </foreignObject>
                );
              }
              return <circle className="fill-blue-9 stroke-blue-7" cx={cx} cy={cy} r={8} />;
            }}
          >
            <LabelList
              content={(props) => {
                const { x, y, index } = props as { x: number; y: number; index: number };
                const item = chartData[index];

                if (!highlightedIds.has(item.id)) return null;

                const reason = highlightedIds.get(item.id);
                const reasonLabel = {
                  decode: 'Fastest Decode',
                  prefill: 'Fastest Prefill',
                  score: 'Best Score',
                }[reason!];

                const { width: chartWidth } = chartDimensions;
                let labelX = x;
                let labelY = y;
                let anchor: 'start' | 'middle' | 'end' = 'middle';

                if (x < 120) {
                  labelX = x + 20;
                  labelY = y + 3;
                  anchor = 'start';
                } else if (x > chartWidth - 96) {
                  labelX = x - 12;
                  labelY = y + 3;
                  anchor = 'end';
                } else if (y < 48) {
                  labelY = y + 28;
                } else {
                  labelY = y - 26;
                }

                return (
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor={anchor}
                    className="pointer-events-none select-none"
                  >
                    <tspan className="fill-gray-12 font-medium" fontSize="12">
                      {item.deviceLabel}
                    </tspan>
                    <tspan className="fill-gray-11" x={labelX} dy="14" fontSize="10">
                      {item.quant ?? item.format} · {reasonLabel}
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

export default PerformanceChart;
