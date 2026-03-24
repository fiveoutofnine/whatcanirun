import ContainerLayout from '@/components/layouts/container';
import { db } from '@/lib/db';

export default async function Page() {
  /* const data = await db.query.runs.findMany({
    columns: {
      id: true,
    },
    with: {
      user: true,
      model: true,
    }
  }); */
  const data = await db.query.runs.findMany({});

  return <ContainerLayout className="flex flex-col space-y-4">
    <pre className='whitespace-break w-full'>{JSON.stringify(data, null, 2)}</pre>
  </ContainerLayout>;
}
