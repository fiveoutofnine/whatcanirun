import { unstable_cache as cache } from 'next/cache';
import { Suspense } from 'react';

import AnimatedCLIDemo from '../animated-cli-demo';
import HeroDescription from './description';
import HeroHeading from './heading';
import { countDistinct, sql } from 'drizzle-orm';
import { ArrowRight } from 'lucide-react';

import { db } from '@/lib/db';
import { view__model_stats_by_device } from '@/lib/db/schema';

import LogoIcon from '@/components/common/logo-icon';
import { Button } from '@/components/ui';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const Hero: React.FC = async () => {
  const rows = await cache(
    async () =>
      await db
        .select({
          chipId: view__model_stats_by_device.deviceChipId,
          cpu: sql<string>`MIN(${view__model_stats_by_device.deviceCpu})`.as('cpu'),
          cpuCores: sql<number>`MIN(${view__model_stats_by_device.deviceCpuCores})`.as('cpu_cores'),
          gpu: sql<string>`MIN(${view__model_stats_by_device.deviceGpu})`.as('gpu'),
          gpuCores: sql<number>`MIN(${view__model_stats_by_device.deviceGpuCores})`.as('gpu_cores'),
          ramGb: sql<number>`MIN(${view__model_stats_by_device.deviceRamGb})`.as('ram_gb'),
          modelCount: countDistinct(view__model_stats_by_device.modelId).as('model_count'),
        })
        .from(view__model_stats_by_device)
        .groupBy(view__model_stats_by_device.deviceChipId),
    ['hero-chip-options'],
    { tags: ['hero'], revalidate: 600 },
  )();

  const chips = rows.map((r) => ({
    chipId: r.chipId,
    cpu: r.cpu,
    cpuCores: r.cpuCores,
    gpu: r.gpu,
    gpuCores: r.gpuCores,
    ramGb: r.ramGb,
    modelCount: r.modelCount,
  }));

  return (
    <div className="mb-8 flex flex-col items-center gap-4 md:mb-12 lg:flex-row lg:gap-16">
      <div className="flex min-w-0 flex-1 flex-col">
        <HeroHeading chips={chips} />
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
