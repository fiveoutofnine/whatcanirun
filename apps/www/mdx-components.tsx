import Image from 'next/image';
import { isValidElement } from 'react';

import type { MDXComponents } from 'mdx/types';

import {
  A,
  Blockquote,
  Callout,
  Code,
  Description,
  H1,
  H2,
  H3,
  H4,
  Hr,
  MathDisplay,
  P,
} from '@/components/templates/mdx';
import RelativeDate from '@/components/templates/relative-date';
import { CodeBlock } from '@/components/ui';
import type { CodeBlockProps } from '@/components/ui/code-block/types';

// This file is required to use MDX in `app` directory.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <A {...props} />,
    blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => <Blockquote {...props} />,
    code: (props: React.HTMLAttributes<HTMLModElement>) => <Code {...props} />,
    h1: (props: React.HtmlHTMLAttributes<HTMLHeadingElement>) => <H1 {...props} />,
    h2: (props: React.HtmlHTMLAttributes<HTMLHeadingElement>) => <H2 {...props} />,
    h3: (props: React.HtmlHTMLAttributes<HTMLHeadingElement>) => <H3 {...props} />,
    h4: (props: React.HtmlHTMLAttributes<HTMLHeadingElement>) => <H4 {...props} />,
    hr: (props: React.HTMLAttributes<HTMLHRElement>) => <Hr {...props} />,
    p: (props: React.HtmlHTMLAttributes<HTMLParagraphElement>) => <P {...props} />,
    pre: ({
      children,
      ...rest
    }: React.HTMLAttributes<HTMLPreElement> & Omit<CodeBlockProps, 'children'>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const childrenProps: any = isValidElement(children) ? children.props : undefined;
      const language = childrenProps?.className ? childrenProps.className.substring(9) : undefined;
      const code = typeof childrenProps?.children === 'string' ? childrenProps.children.trim() : '';

      return (
        <CodeBlock language={language} {...rest}>
          {code}
        </CodeBlock>
      );
    },
    Blockquote,
    Callout,
    Description,
    Image,
    MathDisplay,
    RelativeDate,
    ...components,
  };
}
