import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { clientesServidor, respostaErro, usuarioDaRequisicao } from '../_lib';

export const runtime = 'nodejs';

const BUCKET = 'recebimentos-comprovantes';
const TAMANHO_MAXIMO = 6 * 1024 * 1024;
const EXTENSOES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const FORMAS_PAGAMENTO = new Set(['boleto', 'cartao_credito', 'cartao_debito', 'dinheiro', 'pix']);

function campo(form: FormData, nome: string) {
  return String(form.get(nome) ?? '').trim();
}

function assinaturaDeImagemValida(bytes: Uint8Array, mimeType: string) {
  if (mimeType === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    const assinatura = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= assinatura.length && assinatura.every((valor, indice) => bytes[indice] === valor);
  }
  if (mimeType === 'image/webp') {
    return bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
      && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  }
  return false;
}

export async function POST(request: Request) {
  let arquivoEnviado: string | null = null;
  try {
    const clientes = clientesServidor();
    if (!clientes) return respostaErro('Configuração do servidor incompleta.', 500);
    const user = await usuarioDaRequisicao(request, clientes.url, clientes.anonKey);
    if (!user) return respostaErro('Sessão não encontrada.', 401);

    const form = await request.formData();
    const empresaId = campo(form, 'empresaId');
    const lancamentoExistenteId = campo(form, 'lancamentoId') || null;
    const novoLancamentoId = lancamentoExistenteId ? null : crypto.randomUUID();
    const recebimentoEmpresaId = campo(form, 'recebimentoEmpresaId') || null;
    const subempresaId = campo(form, 'subempresaId') || null;
    const valorRecebido = Number(campo(form, 'valorRecebido'));
    const observacao = campo(form, 'observacao');
    const formaPagamento = campo(form, 'formaPagamento');
    const arquivo = form.get('comprovante');

    if (!empresaId) return respostaErro('Empresa não informada.');
    if (!lancamentoExistenteId && !recebimentoEmpresaId) return respostaErro('Selecione o cliente do recebimento.');
    if (!Number.isFinite(valorRecebido) || valorRecebido < 0) return respostaErro('Informe um valor recebido válido.');
    if (!FORMAS_PAGAMENTO.has(formaPagamento)) return respostaErro('Selecione uma forma de pagamento.');
    if (arquivo != null && (!(arquivo instanceof File) || !arquivo.size)) {
      return respostaErro('Não foi possível ler o comprovante selecionado.');
    }
    if (arquivo instanceof File && (!EXTENSOES[arquivo.type] || arquivo.size > TAMANHO_MAXIMO)) {
      return respostaErro('Use uma imagem JPG, PNG ou WEBP de até 6 MB.');
    }

    const lancamentoId = lancamentoExistenteId ?? novoLancamentoId;
    if (!lancamentoId) return respostaErro('Não foi possível identificar o lançamento.', 500);

    if (arquivo instanceof File) {
      const bytes = new Uint8Array(await arquivo.arrayBuffer());
      if (!assinaturaDeImagemValida(bytes, arquivo.type)) {
        return respostaErro('O arquivo selecionado não corresponde a uma imagem válida.');
      }
      const extensao = EXTENSOES[arquivo.type];
      arquivoEnviado = `${empresaId}/${lancamentoId}/${crypto.randomUUID()}.${extensao}`;
      const { error: erroUpload } = await clientes.admin.storage.from(BUCKET).upload(arquivoEnviado, bytes, {
        contentType: arquivo.type,
        cacheControl: '3600',
        upsert: false,
      });
      if (erroUpload) {
        console.error('Erro ao enviar comprovante de recebimento:', erroUpload);
        return respostaErro('Não foi possível enviar o comprovante. Tente novamente.', 502);
      }
    }

    const authorization = request.headers.get('authorization') ?? '';
    const clienteUsuario = createClient(clientes.url, clientes.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data, error } = await clienteUsuario.rpc('recebimentos_registrar_colaborador', {
      p_empresa_id: empresaId,
      p_lancamento_existente_id: lancamentoExistenteId,
      p_novo_lancamento_id: novoLancamentoId,
      p_recebimento_empresa_id: recebimentoEmpresaId,
      p_subempresa_id: subempresaId,
      p_valor_recebido: Number(valorRecebido.toFixed(2)),
      p_observacao: observacao || null,
      p_forma_pagamento: formaPagamento,
      p_comprovante_path: arquivoEnviado,
      p_comprovante_nome: arquivo instanceof File ? arquivo.name.slice(0, 255) : null,
      p_comprovante_mime: arquivo instanceof File ? arquivo.type : null,
      p_comprovante_tamanho: arquivo instanceof File ? arquivo.size : null,
    });
    if (error || !data) {
      if (arquivoEnviado) await clientes.admin.storage.from(BUCKET).remove([arquivoEnviado]);
      arquivoEnviado = null;
      return respostaErro(error?.message || 'Não foi possível registrar o recebimento.', 400);
    }

    return NextResponse.json({
      erro: false,
      lancamentoId: String((data as { id?: unknown }).id ?? lancamentoId),
      comprovante: Boolean(arquivoEnviado),
    });
  } catch (error) {
    if (arquivoEnviado) {
      const clientes = clientesServidor();
      if (clientes) await clientes.admin.storage.from(BUCKET).remove([arquivoEnviado]);
    }
    console.error('Erro inesperado ao registrar recebimento:', error);
    return respostaErro('Não foi possível registrar o recebimento.', 500);
  }
}
