import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const TAMANHO_MAXIMO = 6 * 1024 * 1024;
const TIPOS_ACEITOS = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function usuarioAutenticado(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !anon || !token) return null;

  const supabase = createClient(url, anon);
  const { data, error } = await supabase.auth.getUser(token);
  return !error && data.user ? data.user.id : null;
}

export async function POST(request: Request) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const userId = await usuarioAutenticado(token);
    if (!userId) {
      return NextResponse.json({ erro: true, mensagem: 'Entre no sistema para continuar.' }, { status: 401 });
    }

    if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
      return NextResponse.json({ erro: true, mensagem: 'Envie uma imagem para continuar.' }, { status: 400 });
    }

    const form = await request.formData();
    const empresaId = String(form.get('empresaId') || '').trim();
    const arquivo = form.get('arquivo');
    if (!empresaId) {
      return NextResponse.json({ erro: true, mensagem: 'Selecione um perfil para continuar.' }, { status: 400 });
    }
    if (!(arquivo instanceof File)) {
      return NextResponse.json({ erro: true, mensagem: 'Selecione uma imagem para continuar.' }, { status: 400 });
    }
    if (!TIPOS_ACEITOS.has(arquivo.type)) {
      return NextResponse.json({ erro: true, mensagem: 'Use uma imagem JPG, PNG ou WEBP.' }, { status: 400 });
    }
    if (!arquivo.size || arquivo.size > TAMANHO_MAXIMO) {
      return NextResponse.json({ erro: true, mensagem: 'A imagem deve ter no máximo 6 MB.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (!supabaseUrl) {
      return NextResponse.json({ erro: true, mensagem: 'Serviço de leitura indisponível.' }, { status: 503 });
    }

    const encaminhamento = new FormData();
    encaminhamento.append('arquivo', arquivo, arquivo.name || 'documento.jpg');
    encaminhamento.append('empresaId', empresaId);
    const resposta = await fetch(supabaseUrl + '/functions/v1/ler-lancamento-foto', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: encaminhamento,
      cache: 'no-store',
    });
    const resultado = await resposta.json().catch(() => null);

    if (!resposta.ok || !resultado) {
      return NextResponse.json(
        { erro: true, mensagem: resultado?.mensagem || 'Não foi possível ler este documento agora.' },
        { status: resposta.status >= 400 ? resposta.status : 502 }
      );
    }

    return NextResponse.json(resultado, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Erro inesperado na leitura de comprovante:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível preparar a leitura do documento.' }, { status: 500 });
  }
}
