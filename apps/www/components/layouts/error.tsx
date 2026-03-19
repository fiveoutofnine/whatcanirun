import { XCircle } from 'lucide-react';

import StateInfo from '@/components/templates/state-info';
import { Button } from '@/components/ui';

// ---------------------------------------–-------------------------------------
// Props
// ---------------------------------------–-------------------------------------

type ErrorLayoutProps = {
  statusCode?: number;
  title?: string;
  message?: React.ReactNode;
  children?: React.ReactNode;
};

// ---------------------------------------–-------------------------------------
// Component
// ---------------------------------------–-------------------------------------

const ErrorLayout: React.FC<ErrorLayoutProps> = ({
  statusCode,
  title,
  message: errorMessage,
  children,
}) => {
  const header = title ?? (statusCode === 404 ? 'Page not found' : 'Internal server error');
  const message =
    errorMessage ?? (statusCode === 404 ? 'That page does not exist.' : 'Something went wrong.');

  return (
    <div className="flex w-full flex-grow items-center justify-center">
      <StateInfo
        className="h-fit"
        intent="fail"
        title={header}
        description={message}
        icon={<XCircle />}
      >
        {children ?? (
          <Button variant="secondary" href="/">
            Return home
          </Button>
        )}
      </StateInfo>
    </div>
  );
};

export default ErrorLayout;
