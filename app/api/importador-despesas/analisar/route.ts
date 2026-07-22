import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 180;

const LIMITE_ARQUIVO = 10 * 1024 * 1024;
type TipoDocumento = 'automatico' | 'extrato-bancario' | 'fatura-cartao';

function chaveOpenAI() {
  return process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_AVA || '';
}

async function usuarioAutenticado(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!url || !anon || !token) return null;
  const supabase = createClient(url, anon);
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
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

function textoDaResposta(resultado: any) {
  for (const saida of resultado?.output || []) {
    for (const conteudo of saida?.content || []) {
      if (conteudo?.type === 'output_text' && typeof conteudo.text === 'string') return conteudo.text;
    }
  }
  return '';
}

function itensValidos(valor: unknown) {
  if (!Array.isArray(valor)) return [];
  return valor.filter((item) => item && typeof item === 'object'
    && typeof item.descricao === 'string' && item.descricao.trim()
    && Number.isFinite(item.valor) && item.valor > 0);
}

export async function POST(request: Request) {
  try {
    const usuario = await usuarioAutenticado(request);
    if (!usuario) return NextResponse.json({ erro: true, mensagem: 'Faça login para analisar um documento.' }, { status: 401 });

    const formulario = await request.formData();
    const arquivo = formulario.get('arquivo');
    const tipoInformado = formulario.get('tipoDocumento');
    const tipoDocumento: TipoDocumento = tipoInformado === 'fatura-cartao' || tipoInformado === 'extrato-bancario'
      ? tipoInformado
      : 'automatico';
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
    let resposta: Response;
    try {
      resposta = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(175_000),
        body: JSON.stringify({
          model: process.env.OPENAI_IMPORT_MODEL || 'gpt-5.6-sol',
          reasoning: { effort: process.env.OPENAI_IMPORT_REASONING || 'high' },
          max_output_tokens: 30_000,
          store: false,
          safety_identifier: createHash('sha256').update(`importador:${usuario.id}`).digest('hex'),
          input: [{
            role: 'user',
            content: [
              { type: 'input_file', filename: arquivo.name, file_data: `data:application/pdf;base64,${bytes.toString('base64')}`, detail: 'high' },
              { type: 'input_text', text: instrucao },
            ],
          }],
          text: { format: { type: 'json_schema', name: 'analise_financeira_pdf', strict: true, schema } },
        }),
      });
    } finally {
      bytes.fill(0);
    }
    const resultado = await resposta.json().catch(() => null);
    if (!resposta.ok) {
      console.error('Erro OpenAI importador:', resultado?.error?.message || resposta.status);
      return NextResponse.json({ erro: true, mensagem: 'A IA não conseguiu analisar o PDF agora. Tente novamente em alguns minutos.' }, { status: 502 });
    }

    const conteudo = textoDaResposta(resultado);
    let analise: any = null;
    try { analise = conteudo ? JSON.parse(conteudo) : null; }
    catch { return NextResponse.json({ erro: true, mensagem: 'A resposta da IA ficou incompleta. Envie o PDF novamente.' }, { status: 502 }); }
    const despesas = itensValidos(analise?.despesas);
    const estornos = itensValidos(analise?.estornos);
    if (!despesas.length) return NextResponse.json({ erro: true, mensagem: 'Nenhuma despesa foi identificada com segurança no PDF.' }, { status: 422 });

    const totalDespesas = despesas.reduce((soma, item) => soma + item.valor, 0);
    const totalEstornos = estornos.reduce((soma, item) => soma + item.valor, 0);
    const totalCalculado = totalDespesas - totalEstornos;
    const totalDocumento = Number.isFinite(analise?.total_documento) ? analise.total_documento : null;
    const diferenca = totalDocumento === null ? null : totalCalculado - totalDocumento;
    if (diferenca !== null && Math.abs(diferenca) > 0.02) {
      console.warn('Conferência incompleta no importador:', {
        despesas: despesas.length,
        estornos: estornos.length,
        totalCalculado: totalCalculado.toFixed(2),
        totalDocumento: totalDocumento.toFixed(2),
      });
      return NextResponse.json({
        erro: true,
        mensagem: `A análise ficou incompleta: o líquido reconhecido foi R$ ${totalCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, mas o documento informa R$ ${totalDocumento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Nenhum lançamento foi preparado.`,
      }, { status: 422 });
    }

    return NextResponse.json({
      erro: false,
      tipo_documento: analise.tipo_documento,
      despesas,
      estornos,
      subtotais: Array.isArray(analise.subtotais) ? analise.subtotais : [],
      total_documento: totalDocumento,
      total_despesas: Number(totalDespesas.toFixed(2)),
      total_estornos: Number(totalEstornos.toFixed(2)),
      total_calculado: Number(totalCalculado.toFixed(2)),
      diferenca: diferenca === null ? null : Number(diferenca.toFixed(2)),
      modelo: process.env.OPENAI_IMPORT_MODEL || 'gpt-5.6-sol',
    });
  } catch (error) {
    console.error('Erro inesperado no importador:', error instanceof Error ? error.message : error);
    const mensagem = error instanceof Error && error.name === 'TimeoutError'
      ? 'A análise excedeu o tempo limite. Tente novamente.'
      : 'Não foi possível analisar este documento.';
    return NextResponse.json({ erro: true, mensagem }, { status: 500 });
  }
}
