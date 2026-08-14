import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { autenticarPerfilCobranca } from '@/app/lib/cobranca-servidor';

export const runtime = 'nodejs';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAPEIS_DE_GESTAO = ['gestor_master', 'administrador', 'operador_completo'];
const normalizarEmail = (valor: unknown) => String(valor || '').trim().toLocaleLowerCase('pt-BR');

function resposta(mensagem: string, status = 400) {
  return NextResponse.json({ erro: true, mensagem }, { status });
}

async function criarTokenConvite() {
  const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)).then((bytes) => Array.from(new Uint8Array(bytes)).map((item) => item.toString(16).padStart(2, '0')).join(''));
  return { token, tokenHash };
}

function linkDoProjeto(request: Request, empresaId: string, projetoId: string, token?: string) {
  const origem = new URL(request.url).origin;
  return `${origem}/projetos?empresaId=${encodeURIComponent(empresaId)}&projetoId=${encodeURIComponent(projetoId)}${token ? `&convite=${token}` : ''}`;
}

async function localizarConta(db: SupabaseClient, email: string) {
  const { data, error } = await db.from('usuarios_contas').select('user_id,nome,email').eq('email', email).maybeSingle();
  if (error) throw new Error('Não foi possível consultar o cadastro.');
  return data;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const empresaId = String(url.searchParams.get('empresaId') || '').trim();
  const projetoId = String(url.searchParams.get('projetoId') || '').trim();
  const acesso = await autenticarPerfilCobranca(request, empresaId);
  if (!acesso || !projetoId || !PAPEIS_DE_GESTAO.includes(acesso.vinculo.perfil || '')) return resposta('Você não tem permissão para consultar os acessos deste projeto.', 403);
  const { data, error } = await acesso.db.from('projetos_compartilhamentos')
    .select('id,nome,email,acesso,situacao,user_id,criado_em,revogado_em')
    .eq('empresa_id', empresaId).eq('projeto_id', projetoId).neq('situacao', 'revogado').order('criado_em');
  if (error) return resposta('Não foi possível carregar os acessos do projeto.', 500);
  const userIds = [...new Set((data || []).map((item) => item.user_id).filter((item): item is string => Boolean(item)))];
  const { data: membrosInternos, error: erroMembrosInternos } = userIds.length
    ? await acesso.db.from('usuarios_empresa').select('user_id').eq('empresa_id', empresaId).eq('status', 'ativo').in('user_id', userIds)
    : { data: [], error: null };
  if (erroMembrosInternos) return resposta('Não foi possível validar os acessos internos deste projeto.', 500);
  const usuariosInternos = new Set((membrosInternos || []).map((item) => String(item.user_id)));
  return NextResponse.json({ compartilhamentos: (data || []).filter((item) => !item.user_id || !usuariosInternos.has(String(item.user_id))) });
}

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const projetoId = String(corpo.projetoId || '').trim();
  const nome = String(corpo.nome || '').trim();
  const email = normalizarEmail(corpo.email);
  const acessoSelecionado = corpo.acesso === 'observador' ? 'observador' : 'editor';
  if (!empresaId || !projetoId || nome.length < 2 || !EMAIL.test(email)) return resposta('Informe nome e e-mail válidos.');
  const acesso = await autenticarPerfilCobranca(request, empresaId);
  if (!acesso || !PAPEIS_DE_GESTAO.includes(acesso.vinculo.perfil || '')) return resposta('Você não tem permissão para compartilhar este projeto.', 403);
  try {
    const conta = await localizarConta(acesso.db, email);
    if (conta?.user_id) {
      const { data: membroInterno, error: erroMembroInterno } = await acesso.db.from('usuarios_empresa')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('user_id', conta.user_id)
        .eq('status', 'ativo')
        .limit(1)
        .maybeSingle();
      if (erroMembroInterno) throw new Error('Não foi possível validar o vínculo deste usuário.');
      if (membroInterno) {
        return NextResponse.json({
          erro: true,
          codigo: 'usuario_ja_vinculado_ao_perfil',
          mensagem: 'Este usuário já participa deste perfil. O acesso aos projetos deve seguir a hierarquia definida na equipe.',
        }, { status: 409 });
      }
    }
    const { data: existente, error: erroExistente } = await acesso.db.from('projetos_compartilhamentos')
      .select('id,nome,email,acesso,situacao,user_id,expira_em')
      .eq('empresa_id', empresaId).eq('projeto_id', projetoId).eq('email', email).maybeSingle();
    if (erroExistente) throw new Error('Não foi possível verificar os acessos deste projeto.');
    if (existente && existente.situacao !== 'revogado') {
      return NextResponse.json({
        erro: true,
        codigo: 'acesso_existente',
        mensagem: `${existente.nome} já possui acesso a este projeto. Nenhum novo cadastro foi criado.`,
        compartilhamento: existente,
      }, { status: 409 });
    }
    const agora = new Date();
    const convite = await criarTokenConvite();
    const registro = {
      empresa_id: empresaId, projeto_id: projetoId, nome, email, acesso: acessoSelecionado,
      user_id: conta?.user_id || null, situacao: conta ? 'ativo' : 'pendente',
      token_hash: conta ? null : convite.tokenHash, expira_em: conta ? null : new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      criado_por: acesso.usuario.id, revogado_em: null,
    };
    const { data, error } = await acesso.db.from('projetos_compartilhamentos').upsert(registro, { onConflict: 'empresa_id,projeto_id,email' }).select('id,nome,email,acesso,situacao,user_id,expira_em').single();
    if (error) throw error;
    const link = linkDoProjeto(request, empresaId, projetoId, conta ? undefined : convite.token);
    return NextResponse.json({ ok: true, encontrado: Boolean(conta), compartilhamento: data, link, mensagem: conta ? 'Acesso liberado. Compartilhe o link para a pessoa entrar com o login e senha dela.' : 'Convite criado. Copie o link e encaminhe para a pessoa criar o acesso.' });
  } catch (error) {
    return resposta(error instanceof Error ? error.message : 'Não foi possível criar o compartilhamento.', 500);
  }
}

export async function PATCH(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const id = String(corpo.id || '').trim();
  const acao = String(corpo.acao || '').trim();
  const acesso = await autenticarPerfilCobranca(request, empresaId);
  if (!acesso || !id || !PAPEIS_DE_GESTAO.includes(acesso.vinculo.perfil || '')) return resposta('Você não tem permissão para revogar este acesso.', 403);
  if (acao === 'renovar_convite') {
    const { data: compartilhamento, error: erroConsulta } = await acesso.db.from('projetos_compartilhamentos')
      .select('id,projeto_id,situacao').eq('id', id).eq('empresa_id', empresaId).maybeSingle();
    if (erroConsulta || !compartilhamento || compartilhamento.situacao !== 'pendente') return resposta('Este convite não está mais pendente.', 400);
    const convite = await criarTokenConvite();
    const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await acesso.db.from('projetos_compartilhamentos').update({ token_hash: convite.tokenHash, expira_em: expiraEm }).eq('id', id).eq('empresa_id', empresaId);
    if (error) return resposta('Não foi possível gerar um novo link de convite.', 500);
    return NextResponse.json({ ok: true, link: linkDoProjeto(request, empresaId, compartilhamento.projeto_id, convite.token), mensagem: 'Novo link de convite gerado. O anterior deixou de valer.' });
  }
  const { error } = await acesso.db.from('projetos_compartilhamentos').update({ situacao: 'revogado', revogado_em: new Date().toISOString(), token_hash: null }).eq('id', id).eq('empresa_id', empresaId);
  if (error) return resposta('Não foi possível revogar o acesso.', 500);
  return NextResponse.json({ ok: true });
}
