import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';

export const runtime = 'nodejs';
export const maxDuration = 180;

const LIMITE_ARQUIVO = 10 * 1024 * 1024;
const LIMITE_PAGINAS = 5;
const LIMITE_TOKENS_SAIDA = 18_000;
type TipoDocumento = 'automatico' | 'extrato-bancario' | 'fatura-cartao';
type ConfiguracaoAnalise = {
  modelo: string;
  raciocinio: string;
  timeoutMs: number;
};
type ResultadoOpenAI = {
  error?: { message?: string };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    output_tokens_details?: { reasoning_tokens?: number };
  };
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};
type ItemFinanceiroReconhecido = Record<string, unknown> & {
  descricao: string;
  valor: number;
};
type AnaliseBruta = {
  tipo_documento?: string;
  total_documento?: unknown;
  despesas?: unknown;
  estornos?: unknown;
  subtotais?: unknown;
};
type ConsumoExecucao = {
  modelos: string[];
  entrada: number;
  saida: number;
  raciocinio: number;
  total: number;
};
type StatusAuditoria = 'concluida' | 'falha_validacao' | 'falha_api' | 'falha_tecnica';

const ANALISE_PRIMARIA: ConfiguracaoAnalise = {
  modelo: process.env.OPENAI_IMPORT_PRIMARY_MODEL || 'gpt-5.6-terra',
  raciocinio: process.env.OPENAI_IMPORT_PRIMARY_REASONING || 'medium',
  timeoutMs: 90_000,
};

const ANALISE_CONTINGENCIA: ConfiguracaoAnalise = {
  modelo: process.env.OPENAI_IMPORT_FALLBACK_MODEL || 'gpt-5.6-sol',
  raciocinio: process.env.OPENAI_IMPORT_FALLBACK_REASONING || 'high',
  timeoutMs: 80_000,
};

function chaveOpenAI() {
  return process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_AVA || '';
}

function mensagemComEnviosRestantes(mensagem: string, restantes: number) {
  return `${mensagem} ${restantes === 1 ? 'Resta 1 envio neste mês.' : `Restam ${restantes} envios neste mês.`}`;
}

async function contextoAutenticado(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!url || !anon || !token) return null;
  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  return error || !data.user ? null : { usuario: data.user, supabase };
}

const itemFinanceiro = {
  type: 'object',
  additionalProperties: false,
  properties: {
    pagina: { type: 'integer' },
    cartao_final: { type: ['string', 'null'] },
    data: { type: ['string', 'null'] },
    descricao: { type: 'string' },
    valor: { type: 'number' },
    confianca: { type: 'string', enum: ['alta', 'media', 'baixa'] },
  },
  required: ['pagina', 'cartao_final', 'data', 'descricao', 'valor', 'confianca'],
};

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tipo_documento: { type: 'string', enum: ['extrato-bancario', 'fatura-cartao'] },
    total_documento: { type: ['number', 'null'] },
    despesas: { type: 'array', items: itemFinanceiro },
    estornos: { type: 'array', items: itemFinanceiro },
    subtotais: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          secao: { type: 'string' },
          valor: { type: 'number' },
        },
        required: ['secao', 'valor'],
      },
    },
  },
  required: ['tipo_documento', 'total_documento', 'despesas', 'estornos', 'subtotais'],
};

function textoDaResposta(resultado: ResultadoOpenAI | null) {
  for (const saida of resultado?.output || []) {
    for (const conteudo of saida?.content || []) {
      if (conteudo?.type === 'output_text' && typeof conteudo.text === 'string') return conteudo.text;
    }
  }
  return '';
}

function itensValidos(valor: unknown): ItemFinanceiroReconhecido[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((item): item is ItemFinanceiroReconhecido =>
    Boolean(item) && typeof item === 'object'
    && typeof item.descricao === 'string' && Boolean(item.descricao.trim())
    && typeof item.valor === 'number' && Number.isFinite(item.valor) && item.valor > 0);
}

function acumularConsumo(consumo: ConsumoExecucao, modelo: string, resultado: ResultadoOpenAI | null) {
  if (!consumo.modelos.includes(modelo)) consumo.modelos.push(modelo);
  const entrada = Math.max(0, Number(resultado?.usage?.input_tokens) || 0);
  const saida = Math.max(0, Number(resultado?.usage?.output_tokens) || 0);
  const raciocinio = Math.max(0, Number(resultado?.usage?.output_tokens_details?.reasoning_tokens) || 0);
  const totalInformado = Math.max(0, Number(resultado?.usage?.total_tokens) || 0);
  consumo.entrada += entrada;
  consumo.saida += saida;
  consumo.raciocinio += raciocinio;
  consumo.total += totalInformado || entrada + saida;
}

async function finalizarAuditoria({
  supabase,
  analiseId,
  status,
  consumo,
  codigo,
}: {
  supabase: SupabaseClient;
  analiseId: string;
  status: StatusAuditoria;
  consumo: ConsumoExecucao;
  codigo: string;
}) {
  const { error } = await supabase.rpc('finalizar_importador_ia_analise', {
    p_analise_id: analiseId,
    p_status: status,
    p_modelos_utilizados: consumo.modelos,
    p_contingencia_utilizada: consumo.modelos.length > 1,
    p_tokens_entrada: consumo.entrada,
    p_tokens_saida: consumo.saida,
    p_tokens_raciocinio: consumo.raciocinio,
    p_tokens_total: consumo.total,
    p_codigo_resultado: codigo,
  });
  if (error) console.error('Erro ao finalizar auditoria do importador:', error.message);
}

async function consultarOpenAI({
  apiKey,
  arquivo,
  fileData,
  instrucao,
  usuarioId,
  configuracao,
}: {
  apiKey: string;
  arquivo: File;
  fileData: string;
  instrucao: string;
  usuarioId: string;
  configuracao: ConfiguracaoAnalise;
}) {
  const resposta = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(configuracao.timeoutMs),
    body: JSON.stringify({
      model: configuracao.modelo,
      reasoning: { effort: configuracao.raciocinio },
      max_output_tokens: LIMITE_TOKENS_SAIDA,
      store: false,
      safety_identifier: createHash('sha256').update(`importador:${usuarioId}`).digest('hex'),
      input: [{
        role: 'user',
        content: [
          { type: 'input_file', filename: arquivo.name, file_data: fileData, detail: 'high' },
          { type: 'input_text', text: instrucao },
        ],
      }],
      text: { format: { type: 'json_schema', name: 'analise_financeira_pdf', strict: true, schema } },
    }),
  });
  const resultado = await resposta.json().catch(() => null) as ResultadoOpenAI | null;
  return { resposta, resultado };
}

function validarAnalise(resultado: ResultadoOpenAI | null) {
  const conteudo = textoDaResposta(resultado);
  let analise: AnaliseBruta | null = null;
  try {
    analise = conteudo ? JSON.parse(conteudo) as AnaliseBruta : null;
  } catch {
    return {
      ok: false as const,
      status: 502,
      motivo: 'resposta_json_incompleta',
      mensagem: 'A resposta da IA ficou incompleta. Envie o PDF novamente.',
    };
  }
  if (!analise) {
    return {
      ok: false as const,
      status: 502,
      motivo: 'resposta_vazia',
      mensagem: 'A resposta da IA ficou incompleta. Envie o PDF novamente.',
    };
  }

  const despesas = itensValidos(analise?.despesas);
  const estornos = itensValidos(analise?.estornos);
  if (!despesas.length) {
    return {
      ok: false as const,
      status: 422,
      motivo: 'nenhuma_despesa',
      mensagem: 'Nenhuma despesa foi identificada com segurança no PDF.',
    };
  }

  const totalDespesas = despesas.reduce((soma, item) => soma + item.valor, 0);
  const totalEstornos = estornos.reduce((soma, item) => soma + item.valor, 0);
  const totalCalculado = totalDespesas - totalEstornos;
  const totalDocumentoBruto = analise?.total_documento;
  const totalDocumento = typeof totalDocumentoBruto === 'number' && Number.isFinite(totalDocumentoBruto)
    ? totalDocumentoBruto
    : null;
  const diferenca = totalDocumento === null ? null : totalCalculado - totalDocumento;

  if (totalDocumento !== null && Math.abs(totalCalculado - totalDocumento) > 0.02) {
    return {
      ok: false as const,
      status: 422,
      motivo: 'divergencia_total',
      mensagem: `A análise ficou incompleta: o líquido reconhecido foi R$ ${totalCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, mas o documento informa R$ ${totalDocumento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Nenhum lançamento foi preparado.`,
      diagnostico: {
        despesas: despesas.length,
        estornos: estornos.length,
        totalCalculado: totalCalculado.toFixed(2),
        totalDocumento: totalDocumento.toFixed(2),
      },
    };
  }

  return {
    ok: true as const,
    analise,
    despesas,
    estornos,
    totalDespesas,
    totalEstornos,
    totalCalculado,
    totalDocumento,
    diferenca,
  };
}

export async function POST(request: Request) {
  let auditoria: {
    supabase: SupabaseClient;
    analiseId: string;
    consumo: ConsumoExecucao;
    enviosRestantes: number;
  } | null = null;
  try {
    const contexto = await contextoAutenticado(request);
    if (!contexto) return NextResponse.json({ erro: true, mensagem: 'Faça login para analisar um documento.' }, { status: 401 });
    const { usuario, supabase } = contexto;

    const formulario = await request.formData();
    const arquivo = formulario.get('arquivo');
    const empresaId = String(formulario.get('empresaId') || '').trim();
    const tipoInformado = formulario.get('tipoDocumento');
    const tipoDocumento: TipoDocumento = tipoInformado === 'fatura-cartao' || tipoInformado === 'extrato-bancario'
      ? tipoInformado
      : 'automatico';
    if (!empresaId) return NextResponse.json({ erro: true, mensagem: 'Selecione o perfil antes de analisar o documento.' }, { status: 400 });
    if (!(arquivo instanceof File)) return NextResponse.json({ erro: true, mensagem: 'Envie o PDF para análise.' }, { status: 400 });
    if (arquivo.type !== 'application/pdf' && !arquivo.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ erro: true, mensagem: 'A análise visual aceita somente arquivos PDF.' }, { status: 415 });
    }
    if (!arquivo.size || arquivo.size > LIMITE_ARQUIVO) {
      return NextResponse.json({ erro: true, mensagem: 'O PDF deve ter até 10 MB.' }, { status: 413 });
    }

    const apiKey = chaveOpenAI();
    if (!apiKey) return NextResponse.json({ erro: true, mensagem: 'A análise por IA não está configurada no servidor.' }, { status: 503 });

    const bytes = Buffer.from(await arquivo.arrayBuffer());
    try {
      let paginas = 0;
      try {
        const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
        paginas = pdf.getPageCount();
      } catch {
        return NextResponse.json({ erro: true, mensagem: 'Não foi possível conferir as páginas deste PDF. Tente gerar o arquivo novamente.' }, { status: 422 });
      }
      if (!paginas) return NextResponse.json({ erro: true, mensagem: 'O PDF não possui páginas para analisar.' }, { status: 422 });
      if (paginas > LIMITE_PAGINAS) {
        return NextResponse.json({ erro: true, mensagem: 'Extratos e faturas podem ter no máximo 5 páginas por envio.' }, { status: 413 });
      }

      const { data: reserva, error: erroReserva } = await supabase.rpc('reservar_importador_ia_analise', {
        p_empresa_id: empresaId,
        p_tipo_documento: tipoDocumento,
        p_paginas: paginas,
      });
      const dadosReserva = reserva && typeof reserva === 'object'
        ? reserva as { id?: unknown; envios_restantes?: unknown }
        : null;
      const analiseId = typeof dadosReserva?.id === 'string' ? dadosReserva.id : '';
      const enviosRestantes = Math.max(0, Math.min(2, Number(dadosReserva?.envios_restantes) || 0));
      if (erroReserva || !analiseId) {
        const motivo = erroReserva?.message || '';
        if (motivo.includes('LIMITE_MENSAL_ATINGIDO')) {
          return NextResponse.json({ erro: true, mensagem: 'O limite mensal para analisar extratos e faturas foi atingido.' }, { status: 429 });
        }
        if (motivo.includes('PERFIL_SEM_ACESSO')) {
          return NextResponse.json({ erro: true, mensagem: 'Você não tem acesso a este perfil.' }, { status: 403 });
        }
        console.error('Erro ao reservar análise do importador:', motivo);
        return NextResponse.json({ erro: true, mensagem: 'Não foi possível autorizar a análise deste documento agora.' }, { status: 503 });
      }

      const consumo: ConsumoExecucao = { modelos: [], entrada: 0, saida: 0, raciocinio: 0, total: 0 };
      auditoria = { supabase, analiseId, consumo, enviosRestantes };
      const fileData = `data:application/pdf;base64,${bytes.toString('base64')}`;
      const instrucao = `Analise visualmente o PDF inteiro, página por página e coluna por coluna. O tipo informado é ${tipoDocumento}.
As páginas podem ter duas colunas independentes: nunca combine registros da esquerda com registros da direita.

Para fatura de cartão:
- despesas: todas as compras, tarifas, anuidades, produtos e serviços que pertencem ao período atual, sempre com valor positivo;
- estornos: cada lançamento negativo ou crédito transacional do período atual, com valor positivo nesta lista separada;
- preserve lançamentos repetidos quando forem linhas distintas;
- exclua compras de próximas faturas, parcelas futuras, limites, pagamento mínimo, total financiado, simulações, juros futuros, saldos e campos de resumo;
- total_documento é o total dos lançamentos atuais/total desta fatura, não limite nem opção de pagamento;
- transcreva em subtotais os totais por cartão/seção usados para conferir o total.

Para extrato bancário:
- despesas: somente saídas efetivas;
- estornos: créditos que revertam uma saída identificável;
- exclua entradas comuns, saldos, limites e totais de resumo.

Não invente data, descrição ou valor. Informe datas em ISO YYYY-MM-DD, inferindo o ano pelo vencimento/período da própria fatura quando a linha mostrar apenas DD/MM. Informe a página de cada item. Retorne todos os itens do período atual.`;
      const configuracoes = [ANALISE_PRIMARIA, ANALISE_CONTINGENCIA].filter((configuracao, indice, lista) =>
        indice === 0
        || configuracao.modelo !== lista[0].modelo
        || configuracao.raciocinio !== lista[0].raciocinio);
      let falhaValidacao: ReturnType<typeof validarAnalise> | null = null;

      for (const [indice, configuracao] of configuracoes.entries()) {
        const { resposta, resultado } = await consultarOpenAI({
          apiKey,
          arquivo,
          fileData,
          instrucao,
          usuarioId: usuario.id,
          configuracao,
        });
        acumularConsumo(consumo, configuracao.modelo, resultado);

        if (!resposta.ok) {
          console.error('Erro OpenAI importador:', resultado?.error?.message || resposta.status);
          await finalizarAuditoria({ supabase, analiseId, status: 'falha_api', consumo, codigo: `openai_${resposta.status}` });
          auditoria = null;
          return NextResponse.json({
            erro: true,
            mensagem: mensagemComEnviosRestantes('A IA não conseguiu analisar o PDF agora. Tente novamente em alguns minutos.', enviosRestantes),
            envios_restantes: enviosRestantes,
          }, { status: 502 });
        }

        const validacao = validarAnalise(resultado);
        if (!validacao.ok) {
          falhaValidacao = validacao;
          console.warn('Conferência incompleta no importador:', {
            modelo: configuracao.modelo,
            motivo: validacao.motivo,
            ...('diagnostico' in validacao ? validacao.diagnostico : {}),
          });
          if (indice < configuracoes.length - 1) continue;
          await finalizarAuditoria({ supabase, analiseId, status: 'falha_validacao', consumo, codigo: validacao.motivo });
          auditoria = null;
          return NextResponse.json(
            {
              erro: true,
              mensagem: mensagemComEnviosRestantes(validacao.mensagem, enviosRestantes),
              envios_restantes: enviosRestantes,
            },
            { status: validacao.status },
          );
        }

        await finalizarAuditoria({ supabase, analiseId, status: 'concluida', consumo, codigo: 'conferida' });
        auditoria = null;
        return NextResponse.json({
          erro: false,
          tipo_documento: validacao.analise.tipo_documento,
          despesas: validacao.despesas,
          estornos: validacao.estornos,
          subtotais: Array.isArray(validacao.analise.subtotais) ? validacao.analise.subtotais : [],
          total_documento: validacao.totalDocumento,
          total_despesas: Number(validacao.totalDespesas.toFixed(2)),
          total_estornos: Number(validacao.totalEstornos.toFixed(2)),
          total_calculado: Number(validacao.totalCalculado.toFixed(2)),
          diferenca: validacao.diferenca === null ? null : Number(validacao.diferenca.toFixed(2)),
          modelo: configuracao.modelo,
          contingencia_utilizada: indice > 0,
          envios_restantes: enviosRestantes,
        });
      }

      await finalizarAuditoria({ supabase, analiseId, status: 'falha_validacao', consumo, codigo: 'sem_resultado' });
      auditoria = null;
      return NextResponse.json(
        {
          erro: true,
          mensagem: mensagemComEnviosRestantes(
            falhaValidacao?.mensagem || 'Não foi possível conferir os valores do documento.',
            enviosRestantes,
          ),
          envios_restantes: enviosRestantes,
        },
        { status: falhaValidacao?.status || 422 },
      );
    } finally {
      bytes.fill(0);
    }
  } catch (error) {
    if (auditoria) {
      await finalizarAuditoria({
        ...auditoria,
        status: 'falha_tecnica',
        codigo: error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'erro_inesperado',
      });
    }
    console.error('Erro inesperado no importador:', error instanceof Error ? error.message : error);
    const mensagem = error instanceof Error && error.name === 'TimeoutError'
      ? 'A análise excedeu o tempo limite. Tente novamente.'
      : 'Não foi possível analisar este documento.';
    return NextResponse.json({
      erro: true,
      mensagem: auditoria ? mensagemComEnviosRestantes(mensagem, auditoria.enviosRestantes) : mensagem,
      ...(auditoria ? { envios_restantes: auditoria.enviosRestantes } : {}),
    }, { status: 500 });
  }
}
