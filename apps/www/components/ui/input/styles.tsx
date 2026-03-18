import { cva } from 'class-variance-authority';

export const inputContainerIconVariants = cva(['flex', 'items-center', 'justify-center'], {
  variants: {
    size: {
      sm: ['h-4', 'w-4'],
      md: ['h-5', 'w-5'],
      lg: ['h-6', 'w-6'],
    },
  },
});

export const inputContainerVariants = cva(
  [
    'relative',
    'flex',
    'w-fit',
    'items-center',
    'whitespace-nowrap',
    'justify-center',
    'text-gray-11',
    'border',
    'border-gray-7',
    'transition-colors',
    'peer-invalid:text-red-11',
    'peer-invalid:bg-red-3',
    'peer-invalid:border-red-7',
  ],
  {
    variants: {
      size: {
        sm: ['h-9', 'text-sm', 'rounded-md'],
        md: ['h-10', 'text-md', 'rounded-lg'],
        lg: ['h-11', 'text-lg', 'rounded-lg'],
      },
      side: {
        left: ['rounded-r-none', 'order-1'],
        right: ['rounded-l-none', 'order-3'],
      },
      isIcon: {
        true: [],
        false: [],
      },
      containerized: {
        true: [],
        false: [],
      },
      disabled: {
        true: [],
        false: [],
      },
    },
    compoundVariants: [
      { size: 'sm', isIcon: true, className: ['min-w-[2.25rem]'] },
      { size: 'md', isIcon: true, className: ['min-w-[2.5rem]'] },
      { size: 'lg', isIcon: true, className: ['min-w-[2.75rem]'] },
      { size: 'sm', isIcon: false, className: ['px-2'] },
      { size: 'md', isIcon: false, className: ['px-3'] },
      { size: 'lg', isIcon: false, className: ['px-3.5'] },
      { containerized: true, disabled: true, className: ['bg-gray-9'] },
      { containerized: false, disabled: true, className: ['bg-gray-9'] },
      { containerized: true, disabled: false, className: ['bg-gray-3'] },
      { containerized: false, disabled: false, className: ['bg-gray-1'] },
      { containerized: false, side: 'left', className: ['border-r-0'] },
      { containerized: false, side: 'right', className: ['border-l-0'] },
    ],
  },
);

export const inputExtraVariants = cva([], {
  variants: {
    size: {
      sm: [],
      md: [],
      lg: [],
    },
    hasLeft: {
      true: ['border-l-0'],
      false: [],
    },
    hasRight: {
      true: ['border-r-0'],
      false: [],
    },
  },
  compoundVariants: [
    { size: 'sm', hasLeft: false, className: ['rounded-l-md'] },
    { size: 'sm', hasRight: false, className: ['rounded-r-md'] },
    { size: 'md', hasLeft: false, className: ['rounded-l-lg'] },
    { size: 'md', hasRight: false, className: ['rounded-r-lg'] },
    { size: 'lg', hasLeft: false, className: ['rounded-l-lg'] },
    { size: 'lg', hasRight: false, className: ['rounded-r-lg'] },
  ],
});

export const inputParentVariants = cva(
  ['flex', 'focus-within:ring-blue-9', 'focus-within:ring-1'],
  {
    variants: {
      size: {
        sm: ['h-9', 'rounded-md'],
        md: ['h-10', 'rounded-lg'],
        lg: ['h-11', 'rounded-lg'],
      },
      fullWidth: {
        true: ['w-full'],
        false: ['w-fit'],
      },
    },
  },
);

export const inputVariants = cva(
  [
    'peer',
    'flex',
    'order-2',
    'items-center',
    'border',
    'text-gray-12',
    'bg-gray-1',
    'transition-colors',
    'border-gray-7',
    'hover:border-gray-8',
    'focus:outline-none',
    'only:focus-visible:ring-1',
    'focus-visible:ring-blue-9',
    'placeholder:text-gray-11',
    'disabled:bg-gray-9',
    'invalid:bg-red-3',
    'invalid:text-red-11',
    'invalid:border-red-7',
    'invalid:hover:border-red-8',
  ],
  {
    variants: {
      size: {
        sm: ['h-9', 'text-sm', 'px-2'],
        md: ['h-10', 'text-base', 'px-3'],
        lg: ['h-11', 'text-lg', 'px-4'],
      },
      fullWidth: {
        true: ['w-full'],
        false: [],
      },
    },
  },
);
