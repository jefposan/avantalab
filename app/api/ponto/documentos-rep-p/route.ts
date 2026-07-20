import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exigirAdmin } from '@/app/lib/admin-server';

export const runtime = 'nodejs';

const erro = (mensagem: string, status = 400) => NextResponse.json({ erro: true, mensagem }, { status });

async function autorizarEmpresa(request: Request, empresaId: string) {
  const { autorizado, db } = await exigirAdmin(request);
  if (autorizado) return { db, solicitante: null as string | null };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const auth = request.headers.get('authorization');
  if (!supabaseUrl || !anon || !auth) return null;

  const usuario = createClient(supabaseUrl, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await usuario.auth.getUser();
  if (!user) return null;
  const { data: vinculo } = await db
    .from('usuarios_empresa')
    .select('user_id')
    .eq('empresa_id', empresaId)
    .eq('user_id', user.id)
    .eq('status', 'ativo')
    .in('perfil', ['gestor_master', 'administrador'])
    .maybeSingle();
  if (!vinculo) return null;
  return { db, solicitante: user.id };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const empresaId = url.searchParams.get('empresaId');
    const documentoId = url.searchParams.get('documentoId');
    if (!empresaId) return erro('Empresa não informada.');

    const contexto = await autorizarEmpresa(request, empresaId);
    if (!contexto) return erro('Acesso não autorizado para esta empresa.', 403);

    if (!documentoId) {
      const { data, error } = await contexto.db
        .from('rep_p_documentos_gerados')
        .select('id, tipo, periodo_inicio, periodo_fim, arquivo_nome, sha256, modo, gerado_em')
        .eq('empresa_id', empresaId)
        .order('gerado_em', { ascending: false });
      if (error) throw error;
      return NextResponse.json({ documentos: data || [] }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const { data: documento, error } = await contexto.db
      .from('rep_p_documentos_gerados')
      .select('id, empresa_id, arquivo_nome, storage_path')
      .eq('id', documentoId)
      .eq('empresa_id', empresaId)
      .maybeSingle();
    if (error) throw error;
    if (!documento) return erro('Documento não encontrado.', 404);

    const { data: arquivo, error: erroArquivo } = await contexto.db.storage.from('rep-p-documentos').download(documento.storage_path);
    if (erroArquivo || !arquivo) throw erroArquivo || new Error('Arquivo não disponível.');
    const { error: erroAuditoria } = await contexto.db.from('rep_p_documentos_auditoria').insert({ documento_id: documento.id, empresa_id: empresaId, ator_user_id: contexto.solicitante, evento: 'baixado' });
    if (erroAuditoria) throw erroAuditoria;
    return new NextResponse(arquivo, { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${documento.arquivo_nome}"`, 'Cache-Control': 'private, no-store' } });
  } catch (causa) {
    console.error('Erro ao consultar documento REP-P:', causa instanceof Error ? causa.message : causa);
    return erro('Não foi possível acessar o documento REP-P.', 500);
  }
}
