'use client';

import { usePathname } from 'next/navigation';

import { Link } from 'lucide-react';

import { toast } from '@/components/ui';

const H4: React.FC<React.HtmlHTMLAttributes<HTMLHeadingElement>> = ({ children, ...rest }) => {
  const pathname = usePathname();

  const stringChildren: string[] = (
    Array.isArray(children) ? children : [typeof children === 'string' ? children : '']
  ).filter((child) => typeof child === 'string' && child.length > 0);

  if (stringChildren.length > 0) {
    const id = stringChildren
      .join('-')
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with a single hyphen
      .trim();

    return (
      <h4 id={id} {...rest}>
        <a
          href={`#${id}`}
          className="not-prose group -mx-1 flex w-fit items-center gap-2 rounded-md px-1 text-base font-medium tracking-tight no-underline"
          onClick={() => {
            navigator.clipboard.writeText(
              `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://x-drop.vercel.app'}${pathname}#${id}`,
            );
            toast({
              intent: 'success',
              title: 'Copied URL to clipboard',
              description: `${pathname}#${id}`,
              hasCloseButton: true,
            });
          }}
        >
          {children}
          <Link className="hidden size-3 text-gray-11 animate-in fade-in-50 group-hover:flex group-focus-visible:flex" />
        </a>
      </h4>
    );
  }

  return <h4 {...rest}>{children}</h4>;
};

export default H4;
