import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {FiscalNoteLayoutPreview} from '../../vendas/sistema/VendasServicosPrototype';
import '../../vendas/sistema/vendas.css';
export const metadata:Metadata={title:'Prévia local da emissão — AvantaLab',robots:{index:false,follow:false,nocache:true}};
export default function FiscalEmissionPreviewPage(){if(process.env.NODE_ENV!=='development')notFound();return <FiscalNoteLayoutPreview/>;}
