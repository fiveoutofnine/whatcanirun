import { buttonVariants } from '../button/styles';
import { cva } from 'class-variance-authority';

export const selectContainerVariants = cva(['relative'], {
  variants: {
    fullWidth: {
      true: ['w-full'],
      false: ['w-fit'],
    },
  },
});

export const selectExtraVariants = cva(['appearance-none', 'peer', 'space-x-0'], {
  variants: {
    size: {
      sm: ['pl-2', 'pr-6'],
      md: ['pl-3', 'pr-[2.125rem]'],
      lg: ['pl-4', 'pr-[2.625rem]'],
      xl: ['pl-4', 'pr-[2.875rem]'],
    },
  },
});

export const selectIconContainerVariants = cva(
  [
    'absolute',
    'top-0',
    'bottom-0',
    'my-auto',
    'flex',
    'items-center',
    'justify-center',
    'pointer-events-none',
    'transition-colors',
  ],
  {
    variants: {
      size: {
        sm: ['w-3', 'right-2'],
        md: ['w-4', 'right-3'],
        lg: ['w-[1.125rem]', 'right-4'],
        xl: ['w-5', 'right-4'],
      },
      variant: {
        primary: [],
        secondary: [],
        outline: [],
        ghost: [],
        solid: [],
      },
      intent: {
        none: [
          'peer-data-[variant=primary]:text-gray-11',
          'peer-data-[variant=secondary]:text-gray-11',
          'peer-data-[variant=outline]:text-gray-11',
          'peer-data-[variant=ghost]:text-gray-11',
        ],
        info: [
          'peer-data-[variant=primary]:text-white',
          'peer-data-[variant=secondary]:text-blue-11',
          'peer-data-[variant=outline]:text-blue-11',
          'peer-data-[variant=ghost]:text-blue-11',
        ],
        success: [
          'peer-data-[variant=primary]:text-white',
          'peer-data-[variant=secondary]:text-green-11',
          'peer-data-[variant=outline]:text-green-11',
          'peer-data-[variant=ghost]:text-green-11',
        ],
        fail: [
          'peer-data-[variant=primary]:text-white',
          'peer-data-[variant=secondary]:text-red-11',
          'peer-data-[variant=outline]:text-red-11',
          'peer-data-[variant=ghost]:text-red-11',
        ],
        warning: [
          'peer-data-[variant=primary]:text-black',
          'peer-data-[variant=secondary]:text-yellow-11',
          'peer-data-[variant=outline]:text-yellow-11',
          'peer-data-[variant=ghost]:text-yellow-11',
        ],
        orange: [
          'peer-data-[variant=primary]:text-white',
          'peer-data-[variant=secondary]:text-orange-11',
          'peer-data-[variant=outline]:text-orange-11',
          'peer-data-[variant=ghost]:text-orange-11',
        ],
        black: [
          'peer-data-[variant=solid]:text-white',
          'peer-data-[variant=solid]:border-black',
          'peer-data-[variant=solid]:peer-hover:text-black',
        ],
        white: [
          'peer-data-[variant=solid]:text-black',
          'peer-data-[variant=solid]:border-white',
          'peer-data-[variant=solid]:peer-hover:text-white',
        ],
        brand: [
          'peer-data-[variant=solid]:text-white',
          'peer-data-[variant=solid]:border-brand',
          'peer-data-[variant=solid]:peer-hover:text-brand',
        ],
      },
      disabled: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      { variant: 'primary', disabled: true, className: 'text-gray-7' },
      { variant: 'secondary', disabled: true, className: 'text-gray-11' },
      { variant: 'outline', disabled: true, className: 'text-gray-7' },
      { variant: 'ghost', disabled: true, className: 'text-gray-11' },
      { variant: 'solid', disabled: true, className: 'text-gray-11' },
    ],
  },
);

export { buttonVariants as selectVariants };
