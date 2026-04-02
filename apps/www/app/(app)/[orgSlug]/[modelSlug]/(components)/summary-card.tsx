// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex w-full min-w-48 snap-start flex-col rounded-xl border border-gray-6 bg-gray-2 p-4">
      <h2 className="mb-1 text-sm font-medium leading-[1.125rem] text-gray-11">{label}</h2>
      <span className="line-clamp-1 text-xl font-medium leading-6 text-gray-12">
        <span className="tabular-nums">{value.toLocaleString()}</span>
      </span>
    </div>
  );
}
