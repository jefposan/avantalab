import {notFound} from 'next/navigation';
import FiscalSettingsPreview from './FiscalSettingsPreview';
import '../../vendas/sistema/vendas.css';
export default function FiscalDefaultsPreview(){if(process.env.NODE_ENV!=='development')notFound();return <FiscalSettingsPreview/>;}
