import { notFound } from 'next/navigation';
import SaleAlertPreview from './SaleAlertPreview';
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <SaleAlertPreview />;
}
