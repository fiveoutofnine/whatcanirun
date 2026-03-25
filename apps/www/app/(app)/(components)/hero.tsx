import AnimatedTerminal from './animated-terminal';
import { ArrowRight } from 'lucide-react';

import Logo from '@/components/common/logo';
import LogoIcon from '@/components/common/logo-icon';
import { Button } from '@/components/ui';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const Hero: React.FC = () => {
  return (
    <div className="mb-12 flex flex-col gap-6">
      <h1 className="text-3xl font-normal leading-snug tracking-tight text-gray-11 md:text-5xl md:leading-[1.167]">
        <Logo className="inline select-text text-3xl md:text-5xl" /> on an{' '}
        <span className="font-semibold text-gray-12"> M1 Max</span> with{' '}
        <span className="font-semibold text-gray-12">64 GB RAM</span>
        <sup className="text-gray-11">*</sup>?
      </h1>
      <AnimatedTerminal />
      <div className="flex gap-2">
        <Button
          variant="primary"
          href="https://github.com/fiveoutofnine/whatcanirun"
          leftIcon={<LogoIcon.GitHub />}
          newTab
        >
          fiveoutofnine/whatcanirun
        </Button>
        <Button variant="ghost" href="/docs" rightIcon={<ArrowRight />}>
          Docs
        </Button>
      </div>
    </div>
  );
};

export default Hero;
