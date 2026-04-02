'use client';

import ErrorLayout from '@/components/layouts/error';

export default function Error({ error }: { error: Error }) {
  return <ErrorLayout statusCode={500} message={error.message} />;
}
