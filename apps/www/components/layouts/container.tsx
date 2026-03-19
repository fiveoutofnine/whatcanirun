import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type ContainerLayoutProps = React.HTMLAttributes<HTMLDivElement> & {
  children?: React.ReactNode;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const ContainerLayout: React.FC<ContainerLayoutProps> = ({ className, children, ...rest }) => {
  return (
    <div
      className={twMerge(clsx('mx-auto w-full max-w-7xl grow p-4 md:px-16 md:py-12', className))}
      {...rest}
    >
      {children}
    </div>
  );
};

export default ContainerLayout;
