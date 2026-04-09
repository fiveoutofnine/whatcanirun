import { forwardRef } from 'react';

import { buttonGroupStyles, buttonIconVariants, buttonVariants } from './styles';
import type { ButtonGroupProps, ButtonProps } from './types';
import { Slot } from '@radix-ui/react-slot';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

import { isExternalHref } from '@/lib/preserved-device-navigation';

import PreservedDeviceLink from '@/components/common/preserved-device-link';

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      size = 'md',
      variant = 'primary',
      intent = 'none',
      disabled = false,
      href,
      leftIcon,
      rightIcon,
      newTab = false,
      children,
      ...rest
    },
    ref,
  ) => {
    const props = {
      className: twMerge(
        clsx(
          buttonVariants({ size, variant, intent: !disabled ? intent : undefined, disabled }),
          className,
        ),
      ),
      'data-variant': variant,
      'data-disabled': disabled,
      'aria-disabled': disabled,
      disabled,
      ref,
      ...rest,
    };

    // Destructure `ref` from `props: React.ButtonHTMLAttributes<HTMLButtonElement>`,
    // so the remaining props are type-compatible with `<Link />` for the
    // `<Slot />` component to merge in.
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    const { ref: _, ...restWithoutRef } = props;

    if (href && !disabled) {
      const linkProps = newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {};

      return (
        <Slot ref={ref} {...restWithoutRef}>
          {isExternalHref(href) ? (
            <a href={href} {...linkProps}>
              {leftIcon && variant !== 'text' ? (
                <span className={buttonIconVariants({ size })} button-left-icon="">
                  {leftIcon}
                </span>
              ) : null}
              <span button-content="">{children}</span>
              {rightIcon && variant !== 'text' ? (
                <span className={buttonIconVariants({ size })} button-right-icon="">
                  {rightIcon}
                </span>
              ) : null}
            </a>
          ) : (
            <PreservedDeviceLink href={href} {...linkProps}>
              {leftIcon && variant !== 'text' ? (
                <span className={buttonIconVariants({ size })} button-left-icon="">
                  {leftIcon}
                </span>
              ) : null}
              <span button-content="">{children}</span>
              {rightIcon && variant !== 'text' ? (
                <span className={buttonIconVariants({ size })} button-right-icon="">
                  {rightIcon}
                </span>
              ) : null}
            </PreservedDeviceLink>
          )}
        </Slot>
      );
    }

    return (
      <button {...props}>
        {leftIcon && variant !== 'text' ? (
          <span className={buttonIconVariants({ size })} button-left-icon="">
            {leftIcon}
          </span>
        ) : null}
        <span button-content="">{children}</span>
        {rightIcon && variant !== 'text' ? (
          <span className={buttonIconVariants({ size })} button-right-icon="">
            {rightIcon}
          </span>
        ) : null}
      </button>
    );
  },
);

const ButtonGroup: React.FC<ButtonGroupProps> = ({ className, children, ...rest }) => {
  return (
    <div className={twMerge(clsx(buttonGroupStyles, className))} {...rest}>
      {children}
    </div>
  );
};

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

Button.displayName = 'Button';
ButtonGroup.displayName = 'ButtonGroup';

export { ButtonGroup };
export default Button;
