import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const BUCKET = 'notas-lancamentos';
const TAMANHO_MAXIMO = 6 * 1024 * 1024;
const EXTENSOES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function configuracao() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    service: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

async function acessoLancamento(request: Request, lancamentoId: string) {
  const { url, anon, service } = configuracao();
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!url || !anon || !service || !token || !lancamentoId) return null;

  const usuario = createClient(url, anon);
  const { data: autenticacao, error: erroAutenticacao } = await usuario.auth.getUser(token);
  if (erroAutenticacao || !autenticacao.user) return null;

  const admin = createClient(url, service);
  const { data: lancamento, error: erroLancamento } = await admin
    .from('lancamentos')
    .select('id, empresa_id, nota_arquivo_path')
    .eq('id', lancamentoId)
    .maybeSingle();
  if (erroLancamento || !lancamento) return null;

  const { data: vinculo, error: erroVinculo } = await admin
    .from('usuarios_empresa')
    .select('id')
    .eq('empresa_id', lancamento.empresa_id)
    .eq('user_id', autenticacao.user.id)
    .eq('status', 'ativo')
    .maybeSingle();
  if (erroVinculo || !vinculo) return null;

  return { admin, lancamento, empresaId: String(lancamento.empresa_id) };
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const lancamentoId = String(form.get('lancamentoId') || '').trim();
    const arquivo = form.get('arquivo');
    const acesso = await acessoLancamento(request, lancamentoId);
    if (!acesso) {
      return NextResponse.json({ erro: true, mensagem: 'Você não tem acesso a este lançamento.' }, { status: 403 });
    }
    if (!(arquivo instanceof File) || !EXTENSOES[arquivo.type] || !arquivo.size || arquivo.size > TAMANHO_MAXIMO) {
      return NextResponse.json({ erro: true, mensagem: 'Use uma imagem JPG, PNG ou WEBP de até 6 MB.' }, { status: 400 });
    }

    const caminho = `${acesso.empresaId}/${lancamentoId}.${EXTENSOES[arquivo.type]}`;
    const { error: erroUpload } = await acesso.admin.storage.from(BUCKET).upload(caminho, arquivo, {
      contentType: arquivo.type,
      upsert: true,
      cacheControl: '3600',
    });
    if (erroUpload) {
      console.error('Erro ao arquivar nota do lançamento:', erroUpload);
      return NextResponse.json({ erro: true, mensagem: 'Não foi possível arquivar a nota.' }, { status: 502 });
    }

    const { error: erroAtualizar } = await acesso.admin
      .from('lancamentos')
      .update({ nota_arquivo_path: caminho })
      .eq('id', lancamentoId)
      .eq('empresa_id', acesso.empresaId);
    if (erroAtualizar) {
      await acesso.admin.storage.from(BUCKET).remove([caminho]);
      return NextResponse.json({ erro: true, mensagem: 'Não foi possível vincular a nota ao lançamento.' }, { status: 502 });
    }

    return NextResponse.json({ erro: false, caminho });
  } catch (error) {
    console.error('Erro inesperado ao arquivar nota:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível arquivar a nota.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lancamentoId = url.searchParams.get('lancamentoId') || '';
  const acesso = await acessoLancamento(request, lancamentoId);
  if (!acesso) {
    return NextResponse.json({ erro: true, mensagem: 'Você não tem acesso a este lançamento.' }, { status: 403 });
  }
  if (!acesso.lancamento.nota_arquivo_path) {
    return NextResponse.json({ erro: true, mensagem: 'Este lançamento não possui nota anexada.' }, { status: 404 });
  }

  const { data, error } = await acesso.admin.storage
    .from(BUCKET)
    .createSignedUrl(acesso.lancamento.nota_arquivo_path, 300);
  if (error || !data?.signedUrl) {
    console.error('Erro ao gerar URL da nota:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível abrir a nota.' }, { status: 502 });
  }

  return NextResponse.json({ erro: false, url: data.signedUrl });
}

export async function DELETE(request: Request) {
  try {
    const { lancamentoId } = await request.json();
    const acesso = await acessoLancamento(request, String(lancamentoId || ''));
    if (!acesso) {
      return NextResponse.json({ erro: true, mensagem: 'Você não tem acesso a este lançamento.' }, { status: 403 });
    }
    if (!acesso.lancamento.nota_arquivo_path) return NextResponse.json({ erro: false });

    const caminho = acesso.lancamento.nota_arquivo_path;
    const { error: erroArquivo } = await acesso.admin.storage.from(BUCKET).remove([caminho]);
    if (erroArquivo) {
      console.error('Erro ao remover arquivo da nota:', erroArquivo);
      return NextResponse.json({ erro: true, mensagem: 'Não foi possível remover a nota.' }, { status: 502 });
    }

    const { error: erroAtualizar } = await acesso.admin
      .from('lancamentos')
      .update({ nota_arquivo_path: null })
      .eq('id', acesso.lancamento.id)
      .eq('empresa_id', acesso.empresaId);
    if (erroAtualizar) {
      return NextResponse.json({ erro: true, mensagem: 'Não foi possível remover a nota.' }, { status: 502 });
    }
    return NextResponse.json({ erro: false });
  } catch {
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível remover a nota.' }, { status: 500 });
  }
}
