import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type StateInfoProps = StateInfoVariantProps & {
  className?: string;
  title: string | number;
  description: React.ReactNode;
  icon: React.ReactNode;
  children?: React.ReactNode;
};

type StateInfoVariantProps = VariantProps<typeof stateInfoIconParentContainerVariants>;

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const stateInfoIconParentContainerVariants = cva(
  ['flex', 'items-center', 'justify-center', 'rounded-full', 'border'],
  {
    variants: {
      size: {
        sm: ['size-10'],
        md: ['size-14'],
      },
      intent: {
        none: ['border-gray-6', 'bg-gray-3', 'text-gray-11'],
        info: ['border-info-6', 'bg-info-3', 'text-info-11'],
        success: ['border-green-6', 'bg-green-3', 'text-green-11'],
        fail: ['border-red-6', 'bg-red-3', 'text-red-11'],
        warning: ['border-yellow-6', 'bg-yellow-3', 'text-yellow-11'],
        orange: ['border-orange-6', 'bg-orange-3', 'text-orange-11'],
      },
    },
  },
);

const stateInfoIconContainerVariants = cva(['flex', 'items-center', 'justify-center'], {
  variants: {
    size: {
      sm: ['size-5'],
      md: ['size-7'],
    },
  },
});

const stateInfoTitleVariants = cva(
  ['font-medium', 'text-center', 'tracking-tight', 'text-gray-12'],
  {
    variants: {
      size: {
        sm: ['mb-0.5', 'mt-2', 'text-lg', 'leading-6'],
        md: ['mb-1', 'mt-2', 'text-2xl', 'leading-8'],
      },
    },
  },
);

const stateInfoDescriptionVariants = cva(['text-center', 'text-gray-11', 'text-balance'], {
  variants: {
    size: {
      sm: ['text-sm', 'leading-normal'],
      md: ['text-base', 'leading-normal'],
    },
  },
});

const stateInfoActionContainerVariants = cva(['w-full', 'flex', 'justify-center'], {
  variants: {
    size: {
      sm: ['mt-1'],
      md: ['mt-2'],
    },
  },
});

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const StateInfo: React.FC<StateInfoProps> = ({
  className,
  size = 'md',
  intent = 'none',
  title,
  description,
  icon,
  children,
}) => {
  return (
    <div className={twMerge(clsx('flex w-full max-w-sm flex-col items-center', className))}>
      <div className={stateInfoIconParentContainerVariants({ size, intent })}>
        <span className={stateInfoIconContainerVariants({ size })}>{icon}</span>
      </div>
      <h2 className={stateInfoTitleVariants({ size })}>{title}</h2>
      <p className={stateInfoDescriptionVariants({ size })}>{description}</p>
      {children ? (
        <div className={stateInfoActionContainerVariants({ size })}>{children}</div>
      ) : null}
    </div>
  );
};

export default StateInfo;
