import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const cep = (new URL(request.url).searchParams.get('cep') || '').replace(/\D/g, '');
  if (cep.length !== 8) {
    return NextResponse.json({ erro: true, mensagem: 'Informe um CEP com 8 dígitos.' }, { status: 400 });
  }

  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), 5000);
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: controlador.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!resposta.ok) throw new Error('CEP indisponível');
    const dados = await resposta.json();
    if (dados.erro) return NextResponse.json({ erro: true, mensagem: 'CEP não encontrado.' }, { status: 404 });
    return NextResponse.json({
      ok: true,
      cep: dados.cep,
      rua: dados.logradouro || '',
      complemento: dados.complemento || '',
      bairro: dados.bairro || '',
      cidade: dados.localidade || '',
      estado: dados.uf || '',
    });
  } catch {
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível consultar o CEP. Preencha o endereço manualmente.' }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
