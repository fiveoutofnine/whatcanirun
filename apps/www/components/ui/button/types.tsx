import { buttonVariants } from './styles';
import type { VariantProps } from 'class-variance-authority';

// -----------------------------------------------------------------------------
// Variant props
// -----------------------------------------------------------------------------

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

// -----------------------------------------------------------------------------
// Component props
// -----------------------------------------------------------------------------

export type ButtonGroupProps = React.HTMLAttributes<HTMLDivElement>;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  Omit<ButtonVariantProps, 'variant' | 'intent'> &
  (
    | {
        variant?: 'solid';
        intent?: 'black' | 'white' | 'brand';
      }
    | {
        variant?: Exclude<ButtonVariantProps['variant'], 'solid'>;
        intent?: Exclude<ButtonVariantProps['intent'], 'black' | 'white' | 'brand'>;
      }
  ) & {
    href?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    newTab?: boolean;
  };
