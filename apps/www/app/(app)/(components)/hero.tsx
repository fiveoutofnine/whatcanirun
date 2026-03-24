import Logo from '@/components/common/logo';
import { Button } from '@/components/ui';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const Hero: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold leading-snug tracking-tight text-gray-12 md:text-5xl md:leading-snug">
        <Logo className="inline select-text text-3xl md:text-5xl" />?
      </h1>
      <div className="flex gap-2">
        <Button variant="outline" href="/docs">
          Submit run
        </Button>
        <Button variant="ghost" href="/docs">
          Docs
        </Button>
      </div>
    </div>
  );
};

export default Hero;
