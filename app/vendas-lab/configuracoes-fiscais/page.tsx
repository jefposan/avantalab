import {notFound} from 'next/navigation';
import FiscalDefaultsPanel from '../../vendas/components/FiscalDefaultsPanel';
import '../../vendas/sistema/vendas.css';
export default function FiscalDefaultsPreview(){if(process.env.NODE_ENV!=='development')notFound();return <main className="vendas-app note-local-page"><div className="page-content"><header className="page-heading"><div><span>Prévia local — dados demonstrativos</span><h1>Configurações fiscais</h1><p>Alterações nesta prévia não são enviadas ao banco.</p></div></header><FiscalDefaultsPanel demo/><details className="settings-form-section"><summary>Configurações avançadas</summary><p>Na empresa conectada, as regras fiscais e exceções já existentes permanecem disponíveis.</p></details></div></main>;}
