import Hero from './(components)/hero';

import ContainerLayout from '@/components/layouts/container';

export default async function Page() {
  return (
    <ContainerLayout className="flex flex-col space-y-4">
      <Hero />
    </ContainerLayout>
  );
}
