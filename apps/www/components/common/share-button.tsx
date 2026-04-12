'use client';

import { useState } from 'react';

import clsx from 'clsx';
import { Check, Share2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import { toast } from '@/components/ui';

type ShareButtonProps = {
  className?: string;
  label?: string;
  title?: string;
};

const ShareButton: React.FC<ShareButtonProps> = ({ className, label, title }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const copy = async (url: string) => {
    if (copied) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: 'Copied link to clipboard.',
        intent: 'success',
        hasCloseButton: true,
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({
        title: 'Unable to share link.',
        description: 'Your browser did not allow clipboard access.',
        intent: 'fail',
        hasCloseButton: true,
      });
    }
  };

  const handleClick = async () => {
    const url = window.location.href;
    const shareData = title ? { title, url } : { url };

    if (
      typeof navigator.share === 'function' &&
      (!navigator.canShare || navigator.canShare(shareData))
    ) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    await copy(url);
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
      onClick={handleClick}
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
