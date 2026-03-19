import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const Article: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { fullBleedCodeBlocks?: boolean }
> = ({ className, fullBleedCodeBlocks = false, ...rest }) => {
  return (
    <article
      className={twMerge(
        clsx(
          'prose prose-gray max-w-none grow dark:prose-invert md:px-0',
          'prose-h1:mb-4',
          'prose-h2:mb-2 prose-h2:mt-6 prose-h2:md:mb-4 prose-h2:md:mt-8',
          'prose-h3:mb-2 prose-h3:mt-5 prose-h3:md:mb-4 prose-h3:md:mt-6',
          'prose-h4:mb-2 prose-h4:mt-5',
          'prose-blockquote:border-gray-6',
          'prose-li:text-gray-11 prose-li:marker:text-gray-9 [&_li_p]:my-2',
          fullBleedCodeBlocks
            ? clsx(
                // Container
                '[&_[code-block-container]]:-mx-4 [&_[code-block-container]]:rounded-none [&_[code-block-container]]:border-x-0',
                'md:[&_[code-block-container]]:mx-0 md:[&_[code-block-container]]:rounded-xl md:[&_[code-block-container]]:border-x',
                // Pre
                '[&_[code-block-pre]]:rounded-none',
                'md:[&_[code-block-pre]]:rounded-b-[0.6875rem]',
              )
            : '',
          className,
        ),
      )}
      {...rest}
    />
  );
};

export default Article;
