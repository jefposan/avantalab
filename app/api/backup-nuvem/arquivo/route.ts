import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { baixarBackupNuvem, cifrarBackupNuvem, decifrarBackupNuvem, renovarTokenBackup, type ProvedorBackupNuvem } from '@/app/lib/backup-nuvem-servidor';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url); const empresaId = url.searchParams.get('empresaId') || ''; const id = url.searchParams.get('id') || ''; const nome = (url.searchParams.get('nome') || 'backup_avantalab.xlsx').replace(/[^a-zA-Z0-9._ -]/g, '_');
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''; const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!empresaId || !id || !token || !supabaseUrl || !anon || !service) return NextResponse.json({ erro: true, mensagem: 'Solicitação inválida.' }, { status: 400 });
  const cliente = createClient(supabaseUrl, anon); const { data: auth } = await cliente.auth.getUser(token);
  if (!auth.user) return NextResponse.json({ erro: true, mensagem: 'Sessão inválida.' }, { status: 401 });
  const admin = createClient(supabaseUrl, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: vinculo } = await admin.from('usuarios_empresa').select('perfil').eq('empresa_id', empresaId).eq('user_id', auth.user.id).in('perfil', ['gestor_master', 'administrador', 'operador_completo']).eq('status', 'ativo').maybeSingle();
  if (!vinculo) return NextResponse.json({ erro: true, mensagem: 'Sem permissão.' }, { status: 403 });
  try {
    const { data: conexao } = await admin.from('backup_nuvem_conexoes').select('*').eq('empresa_id', empresaId).maybeSingle();
    if (!conexao) throw new Error('Nenhuma conta de nuvem conectada.');
    const provedor = conexao.provedor as ProvedorBackupNuvem; const renovado = await renovarTokenBackup(provedor, decifrarBackupNuvem(conexao.refresh_token_cifrado));
    const salvo = await admin.from('backup_nuvem_conexoes').update({ access_token_cifrado: cifrarBackupNuvem(renovado.accessToken), refresh_token_cifrado: cifrarBackupNuvem(renovado.refreshToken), expira_em: renovado.expiraEm, atualizado_em: new Date().toISOString() }).eq('empresa_id', empresaId);
    if (salvo.error) throw new Error('Não foi possível guardar a renovação da conexão. Tente novamente.');
    const bytes = await baixarBackupNuvem(provedor, renovado.accessToken, id, conexao.pasta_id, empresaId);
    return new NextResponse(bytes, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${nome.endsWith('.xlsx') ? nome : `${nome}.xlsx`}"`, 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ erro: true, mensagem: error instanceof Error ? error.message : 'Não foi possível baixar o arquivo.' }, { status: 500 }); }
}
