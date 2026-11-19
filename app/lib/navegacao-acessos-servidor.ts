import type { SupabaseClient } from '@supabase/supabase-js';

/** Invalidação sem dados pessoais ou concessões. Persistência confirmada não é desfeita se Realtime falhar. */
export async function notificarAcessosModulos(db: SupabaseClient, empresaId: string) {
  let canal: ReturnType<SupabaseClient['channel']> | undefined;
  try {
    canal = db.channel(`avantalab-acessos-modulos-v1:${empresaId}`);
    const resultado = await canal.httpSend('atualizados', {}, { timeout: 1500 });
    if (!resultado.success) console.warn('Não foi possível emitir atualização de acessos; recuperação silenciosa permanece ativa.');
  } catch { console.warn('Aviso de acessos indisponível; a alteração confirmada foi preservada.'); }
  finally { if (canal) await db.removeChannel(canal).catch(() => {}); }
}
