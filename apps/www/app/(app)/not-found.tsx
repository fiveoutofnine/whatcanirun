import ErrorLayout from '@/components/layouts/error';

export default function NotFound() {
  return <ErrorLayout statusCode={404} />;
}
