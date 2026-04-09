'use client';

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Trial = {
  prefillTps: number;
  decodeTps: number;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const RunDetailsTrialsChart: React.FC<{ data: Trial[] }> = ({ data }) => {
  return (
    <div className="flex h-[32rem] w-full flex-col rounded-none border-y border-gray-6 bg-gray-2 p-4 md:rounded-xl md:border-x">
      <h3 className="text-base font-medium tracking-tight text-gray-12">Decode / Prefill Speeds</h3>
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
            dataKey="prefillTps"
            type="number"
            domain={['auto', 'auto']}
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
            dataKey="decodeTps"
            type="number"
            domain={['auto', 'auto']}
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
              const d = payload[0].payload as Trial;

              return (
                <div
                  className="z-60 overflow-hidden rounded-md border border-gray-6 bg-gray-2 text-sm font-normal leading-normal text-gray-12 shadow-md animate-in fade-in-50"
                  tabIndex={-1}
                >
                  <div className="flex gap-2 p-2 text-xs leading-4">
                    <div className="flex flex-col gap-1">
                      <span className="h-4 whitespace-nowrap text-right text-gray-11">Prefill</span>
                      <span className="h-4 whitespace-nowrap text-right text-gray-11">Decode</span>
                    </div>
                    <div className="flex w-full flex-col gap-1">
                      <span className="h-4 text-right font-mono">
                        {d.prefillTps.toLocaleString(undefined, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                        <span className="text-gray-11"> tok/s</span>
                      </span>
                      <span className="h-4 text-right font-mono">
                        {d.decodeTps.toLocaleString(undefined, {
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
            name="Trials"
            data={data}
            className="fill-gray-9"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            shape={(props: any) => {
              const { cx, cy } = props as { cx: number; cy: number };
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={8}
                  className="fill-gray-9 opacity-50 transition-opacity hover:opacity-100"
                  tabIndex={-1}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RunDetailsTrialsChart;
