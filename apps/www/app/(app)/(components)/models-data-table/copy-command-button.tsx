import { useState } from 'react';

import type { ModelsDataTableValue } from './types';
import { Check, Copy } from 'lucide-react';

import { Button, toast, Tooltip } from '@/components/ui';
import { IconButton } from '@/components/ui';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type CopyCommandButtonProps = {
  className?: string;
  row: ModelsDataTableValue;
  iconButton?: boolean;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const CopyCommandButton: React.FC<CopyCommandButtonProps> = ({
  className,
  row,
  iconButton = false,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const source = row.modelSource;

  if (!source) return null;

  const copy = () => {
    if (copied) return;

    const command = `bunx whatcanirun@latest run --model ${source} --runtime ${row.runtimeName} --submit`;
    navigator.clipboard.writeText(command);
    setCopied(true);
    toast({
      title: 'Copied command to clipboard.',
      description: <span className="select-all font-mono">{command}</span>,
      intent: 'success',
      hasCloseButton: true,
    });
    setTimeout(() => setCopied(false), 3000);
  };

  if (iconButton) {
    return (
      <div className="flex justify-end">
        <Tooltip
          content="Copy command to run the benchmark"
          side="left"
          inverted={false}
          triggerProps={{ asChild: true }}
        >
          <IconButton className={className} variant="outline" intent="none" onClick={copy}>
            {copied ? (
              <Check className="animate-in fade-in zoom-in" />
            ) : (
              <Copy className="animate-in fade-in" />
            )}
          </IconButton>
        </Tooltip>
      </div>
    );
  }

  return (
    <Button
      className={className}
      variant="outline"
      intent="none"
      rightIcon={
        copied ? (
          <Check className="animate-in fade-in zoom-in" />
        ) : (
          <Copy className="animate-in fade-in" />
        )
      }
      onClick={copy}
    >
      Copy benchmark command
    </Button>
  );
};

export default CopyCommandButton;
