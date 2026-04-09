'use client';

import { useState } from 'react';

import clsx from 'clsx';
import { Check, Copy } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import { toast } from '@/components/ui';

type CopyBenchmarkCommandButtonProps = {
  className?: string;
  command: string;
};

const CopyBenchmarkCommandButton: React.FC<CopyBenchmarkCommandButtonProps> = ({
  className,
  command,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const copy = () => {
    if (copied) return;

    navigator.clipboard.writeText(command);
    setCopied(true);
    toast({
      title: 'Copied benchmark command to clipboard.',
      description: <span className="select-all font-mono">{command}</span>,
      intent: 'success',
      hasCloseButton: true,
    });
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <button
      type="button"
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1 rounded text-gray-11 underline decoration-dotted transition-colors hover:text-gray-12 focus-visible:outline-none',
          className,
        ),
      )}
      onClick={copy}
    >
      <span>Copy benchmark command</span>
      {copied ? (
        <Check className="size-3.5 animate-in fade-in zoom-in" />
      ) : (
        <Copy className="size-3.5 animate-in fade-in" />
      )}
    </button>
  );
};

export default CopyBenchmarkCommandButton;
