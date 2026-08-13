import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { autenticarPerfilCobranca } from '@/app/lib/cobranca-servidor';

export const runtime = 'nodejs';
type DocumentoProjeto = { id: string; participantIds?: string[]; nodes?: Array<{ assigneeIds?: string[] }> };
type PessoaProjeto = { id: string };
type Documento = { projects?: DocumentoProjeto[]; people?: PessoaProjeto[]; [key: string]: unknown };

export async function GET(request: Request) {
  const empresaId = String(new URL(request.url).searchParams.get('empresaId') || '').trim();
  const interno = await autenticarPerfilCobranca(request, empresaId);
  if (interno) {
    const { data, error } = await interno.db.from('projetos_documentos').select('documento').eq('empresa_id', empresaId).maybeSingle();
    if (error) return NextResponse.json({ erro: true, mensagem: 'Não foi possível carregar os projetos.' }, { status: 500 });
    return NextResponse.json({ documento: data?.documento || null });
  }
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''; const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const cliente = createClient(url, anon); const { data: auth } = await cliente.auth.getUser(token);
  if (!auth.user) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 403 });
  const db = createClient(url, service);
  const { data: acessos } = await db.from('projetos_compartilhamentos').select('projeto_id').eq('empresa_id', empresaId).eq('user_id', auth.user.id).eq('situacao', 'ativo');
  const ids = new Set((acessos || []).map((item) => item.projeto_id));
  if (!ids.size) return NextResponse.json({ erro: true, mensagem: 'Nenhum projeto foi compartilhado com esta conta.' }, { status: 403 });
  const { data, error } = await db.from('projetos_documentos').select('documento').eq('empresa_id', empresaId).maybeSingle();
  if (error || !data?.documento) return NextResponse.json({ erro: true, mensagem: 'Não foi possível carregar os projetos.' }, { status: 500 });
  const documento = data.documento as Documento;
  const projects = (documento.projects || []).filter((project) => ids.has(project.id));
  const peopleIds = new Set(projects.flatMap((project) => [...(project.participantIds || []), ...(project.nodes || []).flatMap((node) => node.assigneeIds || [])]));
  return NextResponse.json({ documento: { ...documento, people: (documento.people || []).filter((person) => peopleIds.has(person.id)), projects } });
}

export async function PUT(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const documento = corpo.documento as Documento | undefined;
  if (!empresaId || !documento || !Array.isArray(documento.projects)) return NextResponse.json({ erro: true, mensagem: 'Dados do projeto inválidos.' }, { status: 400 });
  const interno = await autenticarPerfilCobranca(request, empresaId);
  if (interno) {
    if (!['gestor_master', 'administrador', 'operador_completo'].includes(interno.vinculo.perfil || '')) return NextResponse.json({ erro: true, mensagem: 'Seu acesso é somente visualização.' }, { status: 403 });
    const { error } = await interno.db.from('projetos_documentos').upsert({ empresa_id: empresaId, documento, atualizado_por: interno.usuario.id, atualizado_em: new Date().toISOString() }, { onConflict: 'empresa_id' });
    if (error) return NextResponse.json({ erro: true, mensagem: 'Não foi possível salvar os projetos.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''; const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const { data: auth } = await createClient(url, anon).auth.getUser(token);
  if (!auth.user) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 403 });
  const db = createClient(url, service);
  const { data: acessos } = await db.from('projetos_compartilhamentos').select('projeto_id').eq('empresa_id', empresaId).eq('user_id', auth.user.id).eq('situacao', 'ativo').eq('acesso', 'editor');
  const permitidos = new Set((acessos || []).map((item) => item.projeto_id));
  if (!permitidos.size || documento.projects.some((project) => !permitidos.has(project.id))) return NextResponse.json({ erro: true, mensagem: 'Você só pode alterar projetos compartilhados com você.' }, { status: 403 });
  const { data: atual, error: leituraErro } = await db.from('projetos_documentos').select('documento').eq('empresa_id', empresaId).maybeSingle();
  if (leituraErro || !atual?.documento) return NextResponse.json({ erro: true, mensagem: 'Não foi possível salvar os projetos.' }, { status: 500 });
  const original = atual.documento as Documento;
  const recebidos = new Map(documento.projects.map((project) => [project.id, project]));
  const projects = (original.projects || []).map((project) => recebidos.get(project.id) || project);
  const { error } = await db.from('projetos_documentos').update({ documento: { ...original, projects }, atualizado_por: auth.user.id, atualizado_em: new Date().toISOString() }).eq('empresa_id', empresaId);
  if (error) return NextResponse.json({ erro: true, mensagem: 'Não foi possível salvar os projetos.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
