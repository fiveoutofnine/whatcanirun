'use client';

import { useState } from 'react';

import { Check, Copy } from 'lucide-react';

import { RUN_COMMAND } from '@/lib/constants/cli';

import { Button, toast } from '@/components/ui';

const HeroCopyCommandButton: React.FC = () => {
  const [copied, setCopied] = useState<boolean>(false);

  return (
    <Button
      className="rounded-full transition-transform hover:scale-[1.02] active:scale-[0.98]"
      variant="primary"
      rightIcon={
        copied ? (
          <Check className="animate-in fade-in zoom-in" />
        ) : (
          <Copy className="animate-in fade-in" />
        )
      }
      onClick={() => {
        if (copied) return;
        navigator.clipboard.writeText(RUN_COMMAND);
        setCopied(true);
        toast({
          title: 'Copied command to clipboard.',
          description: RUN_COMMAND,
          intent: 'success',
          hasCloseButton: true,
        });
        setTimeout(() => setCopied(false), 3000);
      }}
    >
      {RUN_COMMAND}
    </Button>
  );
};

export default HeroCopyCommandButton;
