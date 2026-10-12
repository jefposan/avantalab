'use client';
import { useState } from 'react';
import { MarketplaceSaleAlertView } from '@/app/components/MarketplaceLiveMonitor';
const alert = { id: '00000000-0000-4000-8000-000000000001', connection_id: '00000000-0000-4000-8000-000000000002',
  provider: 'mercado_livre', listing_id: 'MLB123456', title: 'Produto de exemplo · teste visual', quantity: 2,
  sold_at: '2026-10-11T18:00:00Z', order_id: '000000', account_name: 'DEMONSTRAÇÃO · não é uma venda real', permalink: null };
/** Só desenvolvimento. Não consulta banco, não cria aviso e não altera estoque. */
export default function SaleAlertPreview() {
  const [open, setOpen] = useState(true), [message, setMessage] = useState('');
  return <main className="min-h-screen bg-slate-100 p-6"><h1 className="text-xl font-semibold">Validação visual · nova venda</h1>
    <p className="mt-4">Dados fictícios. Nenhuma venda, leitura ou quantidade é gravada.</p>
    {!open && <p className="mt-6" role="status">Aviso fechado nesta simulação.</p>}
    {open && <MarketplaceSaleAlertView alert={alert} remaining={1} message={message} onAcknowledge={() => setOpen(false)}
      onOpen={() => setMessage('Botão acionado. Neste teste não abrimos a plataforma nem alteramos dados.')} />}
  </main>;
}
