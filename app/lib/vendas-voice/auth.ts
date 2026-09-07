import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { obterContextoContaVendas, type ContextoContaVendas } from '@/app/api/vendas/_lib/contexto-conta';

export type VoiceSalesContext = ContextoContaVendas & {
  db: SupabaseClient;
};

export async function getVoiceSalesContext(request: Request, accountId: string): Promise<VoiceSalesContext | null> {
  const context = await obterContextoContaVendas(request, accountId);
  if (!context) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!url || !anon || !token) return null;
  const db = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { ...context, db };
}

export function canOperateVoiceSales(context: VoiceSalesContext) {
  return context.papel !== 'consulta';
}

export async function isVoiceCommandEnabled(context: VoiceSalesContext) {
  const { data, error } = await context.db
    .from('vendas_mobile_contas_preferencias')
    .select('preferencias')
    .eq('conta_id', context.contaId)
    .maybeSingle();
  if (error) throw new Error('Não foi possível conferir a configuração da Solicitação por Voz.');
  const preferencias = data?.preferencias;
  return Boolean(
    preferencias
    && typeof preferencias === 'object'
    && !Array.isArray(preferencias)
    && (preferencias as Record<string, unknown>).solicitacaoVozAtiva === true,
  );
}
