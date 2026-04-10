'use client';

import { useState } from 'react';

import clsx from 'clsx';
import { Check, Share2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import { toast } from '@/components/ui';

type ShareButtonProps = {
  className?: string;
  label?: string;
};

const ShareButton: React.FC<ShareButtonProps> = ({ className, label }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const copy = () => {
    if (copied) return;

    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast({
      title: 'Copied link to clipboard.',
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
      <span>{label ?? 'Share'}</span>
      {copied ? (
        <Check className="size-3.5 animate-in fade-in zoom-in" />
      ) : (
        <Share2 className="size-3.5 animate-in fade-in" />
      )}
    </button>
  );
};

export default ShareButton;
