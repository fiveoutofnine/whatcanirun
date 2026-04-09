'use client';

import { useState } from 'react';

import { Check, Copy } from 'lucide-react';

import { Button, toast } from '@/components/ui';

type CopyRunIdButtonProps = {
  runId: string;
};

const CopyRunIdButton: React.FC<CopyRunIdButtonProps> = ({ runId }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const copy = () => {
    if (copied) return;

    navigator.clipboard.writeText(runId);
    setCopied(true);
    toast({
      title: 'Copied run ID to clipboard.',
      description: <span className="select-all font-mono">{runId}</span>,
      intent: 'success',
      hasCloseButton: true,
    });
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Button
      size="sm"
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
      Copy Run ID
    </Button>
  );
};

export default CopyRunIdButton;
