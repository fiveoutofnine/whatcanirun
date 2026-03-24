import { cacheLife } from 'next/cache';

import Hero from './(components)/hero';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { devices, models, runs } from '@/lib/db/schema';

import ContainerLayout from '@/components/layouts/container';

export default async function Page() {
  'use cache';
  cacheLife({ stale: 300, revalidate: 300 });

  const data = await db
    .selectDistinctOn([runs.modelId, runs.deviceId, runs.runtimeName], {
      runtimeName: runs.runtimeName,
      ttftP50Ms: runs.ttftP50Ms,
      decodeTpsMean: runs.decodeTpsMean,
      prefillTpsMean: runs.prefillTpsMean,
      idleRssMb: runs.idleRssMb,
      peakRssMb: runs.peakRssMb,
      trialsPassed: runs.trialsPassed,
      trialsTotal: runs.trialsTotal,
      model: {
        id: models.id,
        name: models.displayName,
        format: models.format,
        parameters: models.parameters,
        quant: models.quant,
      },
      device: {
        id: devices.id,
        name: devices.osName,
        cpu: devices.cpu,
        gpu: devices.gpu,
        ramGb: devices.ramGb,
      },
    })
    .from(runs)
    .innerJoin(models, eq(runs.modelId, models.id))
    .innerJoin(devices, eq(runs.deviceId, devices.id));

  return (
    <ContainerLayout className="flex flex-col space-y-4">
      <Hero />
      <pre className="w-full">{JSON.stringify(data, null, 2)}</pre>
    </ContainerLayout>
  );
}
