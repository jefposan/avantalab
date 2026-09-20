import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cifrarBackupNuvem, trocarCodigoBackup, type ProvedorBackupNuvem } from '@/app/lib/backup-nuvem-servidor';

export const runtime = 'nodejs';

function destino(request: Request, origem: string, estado: 'conectado' | 'erro', mensagem = '') {
  const url = new URL(origem === 'mobile' ? '/mobile' : '/gestao', request.url);
  url.searchParams.set('backupNuvem', estado); if (mensagem) url.searchParams.set('mensagem', mensagem.slice(0, 180));
  return NextResponse.redirect(url);
}

export async function GET(request: Request, { params }: { params: Promise<{ provedor: string }> }) {
  const { provedor: rota } = await params;
  const provedor = rota === 'google' ? 'google_drive' : rota === 'onedrive' ? 'onedrive' : null as ProvedorBackupNuvem | null;
  const url = new URL(request.url); const estado = url.searchParams.get('state') || ''; const codigo = url.searchParams.get('code') || '';
  if (!provedor || !estado || !codigo) return destino(request, 'web', 'erro', 'Autorização inválida ou incompleta.');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''; const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !service) return destino(request, 'web', 'erro', 'Servidor de backup indisponível.');
  const admin = createClient(supabaseUrl, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: pendencia } = await admin.from('backup_nuvem_oauth_pendencias').select('*').eq('estado', estado).eq('provedor', provedor).is('consumido_em', null).maybeSingle();
  if (!pendencia || new Date(pendencia.expira_em).getTime() < Date.now()) return destino(request, pendencia?.origem || 'web', 'erro', 'A autorização expirou. Conecte a conta novamente.');
  try {
    const credenciais = await trocarCodigoBackup(provedor, codigo, request.url);
    const { error } = await admin.from('backup_nuvem_conexoes').upsert({
      empresa_id: pendencia.empresa_id, provedor, email: credenciais.email || null, pasta_id: credenciais.pastaId,
      access_token_cifrado: cifrarBackupNuvem(credenciais.accessToken), refresh_token_cifrado: cifrarBackupNuvem(credenciais.refreshToken),
      expira_em: credenciais.expiraEm || null, criado_por: pendencia.user_id, atualizado_em: new Date().toISOString(), ultimo_erro: null,
    }, { onConflict: 'empresa_id' });
    if (error) throw error;
    await admin.from('backup_nuvem_oauth_pendencias').update({ consumido_em: new Date().toISOString() }).eq('id', pendencia.id);
    return destino(request, pendencia.origem, 'conectado');
  } catch (error) {
    return destino(request, pendencia.origem, 'erro', error instanceof Error ? error.message : 'Não foi possível conectar esta conta.');
  }
}
