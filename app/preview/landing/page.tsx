import { permanentRedirect } from 'next/navigation';

export default function PreviewLandingRedirect() {
  permanentRedirect('/');
}
