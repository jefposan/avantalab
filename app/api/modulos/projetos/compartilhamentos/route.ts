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
  return NextResponse.json({ compartilhamentos: data || [] });
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
    const agora = new Date();
    const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
    const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)).then((bytes) => Array.from(new Uint8Array(bytes)).map((item) => item.toString(16).padStart(2, '0')).join(''));
    const registro = {
      empresa_id: empresaId, projeto_id: projetoId, nome, email, acesso: acessoSelecionado,
      user_id: conta?.user_id || null, situacao: conta ? 'ativo' : 'pendente',
      token_hash: conta ? null : tokenHash, expira_em: conta ? null : new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      criado_por: acesso.usuario.id, revogado_em: null,
    };
    const { data, error } = await acesso.db.from('projetos_compartilhamentos').upsert(registro, { onConflict: 'empresa_id,projeto_id,email' }).select('id,nome,email,acesso,situacao,user_id,expira_em').single();
    if (error) throw error;
    const origem = new URL(request.url).origin;
    const link = `${origem}/projetos?empresaId=${encodeURIComponent(empresaId)}&projetoId=${encodeURIComponent(projetoId)}${conta ? '' : `&convite=${token}`}`;
    return NextResponse.json({ ok: true, encontrado: Boolean(conta), compartilhamento: data, link, mensagem: conta ? 'Acesso liberado. Compartilhe o link para a pessoa entrar com o login e senha dela.' : 'Convite criado. Copie o link e encaminhe para a pessoa criar o acesso.' });
  } catch (error) {
    return resposta(error instanceof Error ? error.message : 'Não foi possível criar o compartilhamento.', 500);
  }
}

export async function PATCH(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const id = String(corpo.id || '').trim();
  const acesso = await autenticarPerfilCobranca(request, empresaId);
  if (!acesso || !id || !PAPEIS_DE_GESTAO.includes(acesso.vinculo.perfil || '')) return resposta('Você não tem permissão para revogar este acesso.', 403);
  const { error } = await acesso.db.from('projetos_compartilhamentos').update({ situacao: 'revogado', revogado_em: new Date().toISOString(), token_hash: null }).eq('id', id).eq('empresa_id', empresaId);
  if (error) return resposta('Não foi possível revogar o acesso.', 500);
  return NextResponse.json({ ok: true });
}
