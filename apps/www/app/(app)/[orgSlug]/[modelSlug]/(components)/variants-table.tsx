import UserAvatar from '@/components/templates/user-avatar';
import { Table } from '@/components/ui';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type Variant = {
  modelId: string;
  quant: string | null;
  format: string;
  fileSizeBytes: number | null;
  parameters: string | null;
  source: string | null;
  quantizedBy: {
    name: string;
    logoUrl: string | null;
  } | null;
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return '—';
  const gb = bytes / 1_073_741_824;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1_048_576;
  return `${mb.toFixed(0)} MB`;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const VariantsTable: React.FC<{ variants: Variant[] }> = ({ variants }) => {
  return (
    <Table.Root containerClassName="hidden md:block border border-gray-6 rounded-xl hide-scrollbar [&>table]:border-0">
      <Table.Header>
        <Table.Row>
          <Table.Head>Quant</Table.Head>
          <Table.Head>Format</Table.Head>
          <Table.Head className="text-right">Size</Table.Head>
          <Table.Head className="text-right">Params</Table.Head>
          <Table.Head>Quantized by</Table.Head>
          <Table.Head className="text-right">Source</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {variants.map((v) => (
          <Table.Row key={v.modelId}>
            <Table.Cell className="font-medium">{v.quant ?? '—'}</Table.Cell>
            <Table.Cell className="text-gray-11">{v.format}</Table.Cell>
            <Table.Cell className="text-right tabular-nums text-gray-11">
              {formatFileSize(v.fileSizeBytes)}
            </Table.Cell>
            <Table.Cell className="text-right tabular-nums text-gray-11">
              {v.parameters ?? '—'}
            </Table.Cell>
            <Table.Cell>
              {v.quantizedBy ? (
                <div className="flex items-center gap-1.5">
                  <UserAvatar image={v.quantizedBy.logoUrl} name={v.quantizedBy.name} size={18} />
                  <span className="text-sm text-gray-11">{v.quantizedBy.name}</span>
                </div>
              ) : (
                <span className="text-gray-9">—</span>
              )}
            </Table.Cell>
            <Table.Cell className="text-right">
              {v.source ? (
                <a
                  href={v.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-11 hover:underline"
                >
                  Link
                </a>
              ) : (
                <span className="text-gray-9">—</span>
              )}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
};

export default VariantsTable;
