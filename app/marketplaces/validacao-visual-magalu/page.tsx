import { notFound } from 'next/navigation';
import MagaluPostSalePreview from './MagaluPostSalePreview';
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <MagaluPostSalePreview />;
}
