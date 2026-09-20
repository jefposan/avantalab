import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import {
  cifrarBackupNuvem, configuracaoProvedor, decifrarBackupNuvem, enviarBackupNuvem,
  listarBackupsNuvem, renovarTokenBackup, type ProvedorBackupNuvem, urlAutorizacaoBackup,
} from '@/app/lib/backup-nuvem-servidor';

export const runtime = 'nodejs';

// A instância é criada com as variáveis de ambiente em tempo de execução; não
// há schema TypeScript gerado para estas tabelas privadas neste projeto.
type Contexto = { admin: any; userId: string; perfil: string };
const perfisBackup = ['gestor_master', 'administrador', 'operador_completo'];

async function contexto(request: Request, empresaId: string): Promise<Contexto | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''; const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!url || !anon || !service || !token || !empresaId) return null;
  const cliente = createClient(url, anon); const { data } = await cliente.auth.getUser(token);
  if (!data.user) return null;
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: vinculo } = await admin.from('usuarios_empresa').select('perfil').eq('empresa_id', empresaId).eq('user_id', data.user.id).in('perfil', perfisBackup).eq('status', 'ativo').maybeSingle();
  return vinculo ? { admin, userId: data.user.id, perfil: vinculo.perfil } : null;
}

function provedorValido(valor: unknown): ProvedorBackupNuvem | null { return valor === 'google_drive' || valor === 'onedrive' ? valor : null; }
function falha(mensagem: string, status = 400) { return NextResponse.json({ erro: true, mensagem }, { status }); }

async function tokenAtual(ctx: Contexto, empresaId: string) {
  const { data: conexao, error } = await ctx.admin.from('backup_nuvem_conexoes').select('*').eq('empresa_id', empresaId).maybeSingle();
  if (error || !conexao) throw new Error('Nenhuma conta de nuvem está conectada a este perfil.');
  const provedor = conexao.provedor as ProvedorBackupNuvem;
  const refresh = decifrarBackupNuvem(conexao.refresh_token_cifrado);
  const renovado = await renovarTokenBackup(provedor, refresh);
  await ctx.admin.from('backup_nuvem_conexoes').update({ access_token_cifrado: cifrarBackupNuvem(renovado.accessToken), refresh_token_cifrado: cifrarBackupNuvem(renovado.refreshToken), expira_em: renovado.expiraEm, atualizado_em: new Date().toISOString(), ultimo_erro: null }).eq('empresa_id', empresaId);
  return { provedor, accessToken: renovado.accessToken, pastaId: String(conexao.pasta_id || '') };
}

export async function GET(request: Request) {
  const url = new URL(request.url); const empresaId = url.searchParams.get('empresaId') || ''; const ctx = await contexto(request, empresaId);
  if (!ctx) return falha('Acesso permitido apenas a usuários autorizados do perfil.', 403);
  try {
    if (url.searchParams.get('acao') === 'arquivos') {
      const token = await tokenAtual(ctx, empresaId); const arquivos = await listarBackupsNuvem(token.provedor, token.accessToken, token.pastaId);
      return NextResponse.json({ arquivos, provedor: token.provedor });
    }
    const { data } = await ctx.admin.from('backup_nuvem_conexoes').select('provedor,email,criado_em,ultimo_envio_em,ultimo_erro').eq('empresa_id', empresaId).maybeSingle();
    return NextResponse.json({ conexao: data || null, podeConectar: ctx.perfil === 'gestor_master' });
  } catch (error) { return falha(error instanceof Error ? error.message : 'Não foi possível consultar o backup em nuvem.', 500); }
}

export async function POST(request: Request) {
  const tipo = request.headers.get('content-type') || '';
  const corpo = tipo.includes('multipart/form-data') ? await request.formData() : await request.json().catch(() => ({}));
  const empresaId = String(corpo.get?.('empresaId') ?? corpo.empresaId ?? ''); const ctx = await contexto(request, empresaId);
  if (!ctx) return falha('Acesso permitido apenas a usuários autorizados do perfil.', 403);
  const acao = String(corpo.get?.('acao') ?? corpo.acao ?? '');
  try {
    if (acao === 'iniciar') {
      if (ctx.perfil !== 'gestor_master') return falha('Somente o Gestor Master pode conectar uma conta de nuvem.', 403);
      const provedor = provedorValido(corpo.get?.('provedor') ?? corpo.provedor); if (!provedor) return falha('Provedor de nuvem inválido.');
      configuracaoProvedor(provedor);
      const estado = randomBytes(32).toString('base64url'); const origem = String(corpo.get?.('origem') ?? corpo.origem ?? 'web') === 'mobile' ? 'mobile' : 'web';
      await ctx.admin.from('backup_nuvem_oauth_pendencias').delete().eq('empresa_id', empresaId).eq('user_id', ctx.userId);
      const { error } = await ctx.admin.from('backup_nuvem_oauth_pendencias').insert({ estado, empresa_id: empresaId, user_id: ctx.userId, provedor, origem, expira_em: new Date(Date.now() + 10 * 60_000).toISOString() });
      if (error) throw error;
      return NextResponse.json({ url: urlAutorizacaoBackup(provedor, request.url, estado) });
    }
    if (acao === 'enviar') {
      const arquivo = corpo.get('arquivo'); if (!(arquivo instanceof File) || !/\.xlsx$/i.test(arquivo.name) || arquivo.size > 25 * 1024 * 1024) return falha('Selecione um backup Excel de até 25 MB.');
      const token = await tokenAtual(ctx, empresaId); const resultado = await enviarBackupNuvem(token.provedor, token.accessToken, token.pastaId, arquivo.name.replace(/[^a-zA-Z0-9._ -]/g, '_'), await arquivo.arrayBuffer());
      await ctx.admin.from('backup_nuvem_conexoes').update({ ultimo_envio_em: new Date().toISOString(), ultimo_erro: null }).eq('empresa_id', empresaId);
      return NextResponse.json({ arquivo: { id: resultado.id, nome: resultado.name || arquivo.name } });
    }
    return falha('Ação inválida.');
  } catch (error) {
    await ctx.admin.from('backup_nuvem_conexoes').update({ ultimo_erro: error instanceof Error ? error.message.slice(0, 500) : 'Falha ao comunicar com a nuvem.' }).eq('empresa_id', empresaId);
    return falha(error instanceof Error ? error.message : 'Não foi possível concluir a operação de backup em nuvem.', 500);
  }
}

export async function DELETE(request: Request) {
  const empresaId = new URL(request.url).searchParams.get('empresaId') || ''; const ctx = await contexto(request, empresaId);
  if (!ctx || ctx.perfil !== 'gestor_master') return falha('Somente o Gestor Master pode desconectar uma conta de nuvem.', 403);
  const { error } = await ctx.admin.from('backup_nuvem_conexoes').delete().eq('empresa_id', empresaId);
  return error ? falha(error.message, 500) : NextResponse.json({ ok: true });
}
