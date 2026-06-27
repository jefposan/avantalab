import type { Viewport } from 'next';
import AvaChatClient from './AvaChatClient';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: '#ffffff',
};

export default function AvaPage() {
  return <AvaChatClient />;
}
