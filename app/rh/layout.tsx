import type { Metadata } from 'next';
import RhShell from './components/RhShell';
export const metadata: Metadata = { title: 'Recursos Humanos | AvantaLab Gestão' };
export default function Layout({ children }: { children: React.ReactNode }) { return <RhShell>{children}</RhShell>; }
