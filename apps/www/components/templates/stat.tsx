import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type StatNameProps = React.HTMLAttributes<HTMLDivElement>;

type StatProps = React.HTMLAttributes<HTMLDivElement>;

type StatValueProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof statValueVariants>;

type StatComposition = {
  Name: React.FC<StatNameProps>;
  Value: React.FC<StatValueProps>;
};

const statValueVariants = cva(['line-clamp-1', 'text-sm', 'leading-[1.125rem]', 'w-full'], {
  variants: {
    empty: {
      true: ['text-gray-11', 'italic'],
      false: ['text-gray-12'],
    },
  },
});

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const Stat: React.FC<StatProps> & StatComposition = ({ className, children, ...rest }) => {
  return (
    <div className={twMerge(clsx('flex flex-col items-start gap-0.5', className))} {...rest}>
      {children}
    </div>
  );
};

const StatName: React.FC<StatNameProps> = ({ className, children, ...rest }) => {
  return (
    <div
      className={twMerge(clsx('line-clamp-1 w-full text-xs leading-4 text-gray-11', className))}
      {...rest}
    >
      {children}
    </div>
  );
};

const StatValue: React.FC<StatValueProps> = ({ className, empty = false, children, ...rest }) => {
  return (
    <div className={twMerge(clsx(statValueVariants({ empty }), className))} {...rest}>
      {children}
    </div>
  );
};

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

Stat.Name = StatName;
Stat.Value = StatValue;

export default Stat;
