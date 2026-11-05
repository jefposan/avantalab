import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { conferirLiberacao } from '@/app/lib/acessos-usuario-servidor';

export const runtime = 'nodejs';
const BUCKET = 'notas-lancamentos';
const EXTENSOES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Registro = { id: string | number; empresa_id: string; nota_arquivo_path?: string | null; revisao: number };

async function acessoOperacao(request: Request, operacaoId: string, acao: string) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const empresaId = new URL(request.url).searchParams.get('empresaId') || '';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!token || !uuid.test(operacaoId) || !uuid.test(empresaId) || !url || !anon || !service) return null;
  const usuario = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: auth, error } = await usuario.auth.getUser(token);
  if (error || !auth.user) return null;
  const sessao = await usuario.rpc('avantalab_sessao_perfil_permitida', { p_empresa_id: empresaId });
  if (sessao.error || sessao.data !== true) return null;
  const admin = createClient(url, service, { auth: { persistSession: false } });
  if (!await conferirLiberacao(admin, auth.user.id, empresaId, 'dashboard')) return null;
  const vinculo = await admin.from('usuarios_empresa').select('perfil').eq('user_id', auth.user.id).eq('empresa_id', empresaId).eq('status', 'ativo').maybeSingle();
  if (vinculo.error || !vinculo.data || vinculo.data.perfil === 'funcionario_ponto') return null;
  // O caminho do arquivo vem exclusivamente do recibo privado do banco.
  // Nunca aceitar caminhos ou IDs financeiros informados pelo cliente.
  const { data: recibo, error: erroRecibo } = await admin.from('edicoes_financeiras_mobile')
    .select('pedido,resultado').eq('operacao_id', operacaoId).eq('empresa_id', empresaId).eq('user_id', auth.user.id).maybeSingle();
  if (erroRecibo) throw erroRecibo;
  if (!recibo?.resultado || recibo.pedido.acao !== acao || recibo.pedido.tipo !== 'despesa'
    || recibo.resultado.acao !== acao || recibo.resultado.tipo !== 'despesa') return null;
  return { admin, empresaId, resultado: recibo.resultado as { registros: Registro[]; originais: Registro[] } };
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const operacaoId = String(form.get('operacaoId') || '');
    const arquivo = form.get('arquivo');
    if (!(arquivo instanceof File) || !EXTENSOES[arquivo.type] || !arquivo.size || arquivo.size > 6 * 1024 * 1024)
      return NextResponse.json({ erro: true }, { status: 400 });
    const acesso = await acessoOperacao(request, operacaoId, 'incluir');
    if (!acesso) return NextResponse.json({ erro: true }, { status: 403 });
    const original = acesso.resultado.registros[0];
    if (!original || original.empresa_id !== acesso.empresaId) return NextResponse.json({ erro: true }, { status: 403 });
    const caminho = `${acesso.empresaId}/${original.id}-${operacaoId}.${EXTENSOES[arquivo.type]}`;
    const atual = await acesso.admin.from('lancamentos').select('*').eq('id', original.id).eq('empresa_id', acesso.empresaId).maybeSingle();
    if (atual.error) throw atual.error;
    if (atual.data?.nota_arquivo_path === caminho) return NextResponse.json({ erro: false, registro: atual.data });
    if (!atual.data || atual.data.nota_arquivo_path || Number(atual.data.revisao) !== Number(original.revisao))
      return NextResponse.json({ erro: true, mensagem: 'O lançamento mudou antes de anexar a nota. O arquivo permanece no aparelho.' }, { status: 409 });
    const upload = await acesso.admin.storage.from(BUCKET).upload(caminho, arquivo, { upsert: true, contentType: arquivo.type, cacheControl: '3600' });
    if (upload.error) throw upload.error;
    const salvo = await acesso.admin.from('lancamentos').update({ nota_arquivo_path: caminho }).eq('id', original.id)
      .eq('empresa_id', acesso.empresaId).eq('revisao', original.revisao).is('nota_arquivo_path', null).select('*').maybeSingle();
    if (salvo.error) throw salvo.error;
    if (!salvo.data) {
      // Outro envio pode ter concluído enquanto este aguardava. Não remover
      // o objeto compartilhado em uma corrida: isso apagaria a nota confirmada.
      const confirmado = await acesso.admin.from('lancamentos').select('*').eq('id', original.id).eq('empresa_id', acesso.empresaId).maybeSingle();
      if (confirmado.data?.nota_arquivo_path === caminho) return NextResponse.json({ erro: false, registro: confirmado.data });
      return NextResponse.json({ erro: true }, { status: 409 });
    }
    return NextResponse.json({ erro: false, registro: salvo.data });
  } catch { return NextResponse.json({ erro: true, mensagem: 'Anexo pendente. Tente novamente.' }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const acesso = await acessoOperacao(request, String(body.operacaoId || ''), 'excluir');
    if (!acesso) return NextResponse.json({ erro: true }, { status: 403 });
    const caminhos = [...new Set(acesso.resultado.originais.filter(r => r.empresa_id === acesso.empresaId)
      .map(r => r.nota_arquivo_path).filter((p): p is string => Boolean(p && p.startsWith(`${acesso.empresaId}/`) && !p.includes('..'))))];
    for (const caminho of caminhos) {
      const referencia = await acesso.admin.from('lancamentos').select('id').eq('nota_arquivo_path', caminho).limit(1);
      if (referencia.error) throw referencia.error;
      if (referencia.data?.length) continue; // Não apagar arquivo ainda em uso.
      const removido = await acesso.admin.storage.from(BUCKET).remove([caminho]);
      if (removido.error) throw removido.error;
    }
    return NextResponse.json({ erro: false });
  } catch { return NextResponse.json({ erro: true, mensagem: 'Limpeza de anexo pendente.' }, { status: 503 }); }
}
