import { Suspense } from 'react';

import AnimatedCLIDemo from '../animated-cli-demo';
import HeroDescription from './description';
import { ArrowRight } from 'lucide-react';

import Logo from '@/components/common/logo';
import LogoIcon from '@/components/common/logo-icon';
import { Button } from '@/components/ui';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const Hero: React.FC = async () => {
  return (
    <div className="mb-8 flex flex-col items-center gap-4 md:mb-12 lg:flex-row lg:gap-16">
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="mb-2 text-3xl font-normal leading-snug tracking-tight text-gray-11 md:mb-4 md:text-5xl md:leading-[1.167]">
          <Logo className="inline select-text text-3xl md:text-5xl" /> on an{' '}
          <span className="font-semibold text-gray-12"> M1 Max</span> with{' '}
          <span className="font-semibold text-gray-12">64 GB RAM</span>?
        </h1>
        <Suspense fallback={<HeroDescription.Fallback />}>
          <HeroDescription />
        </Suspense>
        <div className="mt-4 flex gap-2 md:mt-6">
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
      <div className="w-full min-w-0 lg:min-w-[32rem] lg:max-w-[32rem]">
        <AnimatedCLIDemo />
      </div>
    </div>
  );
};

export default Hero;
