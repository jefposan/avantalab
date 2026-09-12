import 'server-only';

import { criarSupabaseAdmin } from './admin-server';
import { executarRegistroDownloadSemBloquear, type DestinoDownloadAvantaVendas, type DispositivoDownloadAvantaVendas, type ParametrosCampanhaAvantaVendas } from './avantavendas-download';

export type EventoDownloadAvantaVendas = {
  tipo: 'acesso' | 'selecao_loja';
  dispositivo: DispositivoDownloadAvantaVendas;
  destino: DestinoDownloadAvantaVendas;
  campanha: ParametrosCampanhaAvantaVendas;
};

export async function registrarEventoDownloadAvantaVendas(evento: EventoDownloadAvantaVendas) {
  const registrado = await executarRegistroDownloadSemBloquear(async () => {
    const db = criarSupabaseAdmin();
    const { error } = await db.from('avantavendas_download_eventos').insert({
      tipo_evento: evento.tipo,
      dispositivo: evento.dispositivo,
      destino: evento.destino,
      utm_source: evento.campanha.utmSource,
      utm_medium: evento.campanha.utmMedium,
      utm_campaign: evento.campanha.utmCampaign,
      utm_content: evento.campanha.utmContent,
      utm_term: evento.campanha.utmTerm,
    });
    if (error) throw error;
  });
  if (!registrado) {
    console.warn('[avantavendas-download] Evento de campanha não registrado.');
  }
  return registrado;
}
