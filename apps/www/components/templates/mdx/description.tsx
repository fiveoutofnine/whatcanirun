import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const Description: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  ...rest
}) => {
  return (
    <p
      className={twMerge(clsx('not-prose mb-4 mt-4 text-lg text-gray-11 md:mb-6', className))}
      {...rest}
    />
  );
};

export default Description;
