import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const TAMANHO_MAXIMO = 6 * 1024 * 1024;
const TIPOS_ACEITOS = new Set(['image/jpeg', 'image/png', 'image/webp']);
const TESTE_LOCAL = process.env.NODE_ENV !== 'production';

type LeituraIA = {
  data_documento: string | null;
  valor_total: number | null;
  despesa_sugerida: string | null;
  confianca_data: number;
  confianca_valor: number;
  confianca_despesa: number;
  observacao: string;
};

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
  return !error && data.user ? data.user.id : null;
}

function limitarConfianca(valor: unknown) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.max(0, Math.min(1, numero)) : 0;
}

function normalizarLeitura(valor: unknown, tiposDespesa: string[]): LeituraIA {
  const leitura = (valor && typeof valor === 'object' ? valor : {}) as Partial<LeituraIA>;
  const data = typeof leitura.data_documento === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(leitura.data_documento)
    ? leitura.data_documento
    : null;
  const total = Number(leitura.valor_total);
  const sugestao = typeof leitura.despesa_sugerida === 'string' && tiposDespesa.includes(leitura.despesa_sugerida)
    ? leitura.despesa_sugerida
    : null;

  return {
    data_documento: data,
    valor_total: Number.isFinite(total) && total > 0 ? total : null,
    despesa_sugerida: sugestao,
    confianca_data: limitarConfianca(leitura.confianca_data),
    confianca_valor: limitarConfianca(leitura.confianca_valor),
    confianca_despesa: sugestao ? limitarConfianca(leitura.confianca_despesa) : 0,
    observacao: typeof leitura.observacao === 'string' ? leitura.observacao.slice(0, 280) : '',
  };
}

function schemaLeitura(tiposDespesa: string[]) {
  const sugestao = tiposDespesa.length
    ? { anyOf: [{ type: 'string', enum: tiposDespesa }, { type: 'null' }] }
    : { type: 'null' };

  return {
    name: 'leitura_comprovante',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        data_documento: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        valor_total: { anyOf: [{ type: 'number' }, { type: 'null' }] },
        despesa_sugerida: sugestao,
        confianca_data: { type: 'number' },
        confianca_valor: { type: 'number' },
        confianca_despesa: { type: 'number' },
        observacao: { type: 'string' },
      },
      required: [
        'data_documento',
        'valor_total',
        'despesa_sugerida',
        'confianca_data',
        'confianca_valor',
        'confianca_despesa',
        'observacao',
      ],
    },
  };
}

function tiposInformados(valor: FormDataEntryValue | null) {
  return [...new Set(String(valor || '')
    .split(',')
    .map((tipo) => tipo.trim())
    .filter(Boolean)
    .slice(0, 40))];
}

export async function POST(request: Request) {
  try {
    const userId = TESTE_LOCAL ? null : await usuarioAutenticado(request);
    if (!userId && !TESTE_LOCAL) {
      return NextResponse.json({ erro: true, mensagem: 'Entre no sistema para usar este teste.' }, { status: 401 });
    }

    if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
      return NextResponse.json({ erro: true, mensagem: 'Envie uma imagem para continuar.' }, { status: 400 });
    }
    const form = await request.formData();
    const empresaId = String(form.get('empresaId') || '').trim();
    const arquivo = form.get('arquivo');
    if (!(arquivo instanceof File)) {
      return NextResponse.json({ erro: true, mensagem: 'Selecione uma imagem para continuar.' }, { status: 400 });
    }
    if (!TIPOS_ACEITOS.has(arquivo.type)) {
      return NextResponse.json({ erro: true, mensagem: 'Use uma imagem JPG, PNG ou WEBP.' }, { status: 400 });
    }
    if (!arquivo.size || arquivo.size > TAMANHO_MAXIMO) {
      return NextResponse.json({ erro: true, mensagem: 'A imagem deve ter no máximo 6 MB.' }, { status: 400 });
    }

    let tiposDespesa = tiposInformados(form.get('tiposDespesa'));
    if (userId) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      if (!url || !serviceRole) {
        return NextResponse.json({ erro: true, mensagem: 'Serviço de teste indisponível.' }, { status: 503 });
      }
      if (!empresaId) {
        return NextResponse.json({ erro: true, mensagem: 'Selecione um perfil para continuar.' }, { status: 400 });
      }

      const db = createClient(url, serviceRole);
      const { data: vinculo, error: erroVinculo } = await db
        .from('usuarios_empresa')
        .select('id')
        .eq('user_id', userId)
        .eq('empresa_id', empresaId)
        .eq('status', 'ativo')
        .maybeSingle();
      if (erroVinculo || !vinculo) {
        return NextResponse.json({ erro: true, mensagem: 'Você não tem acesso a este perfil.' }, { status: 403 });
      }

      const { data: despesas } = await db
        .from('despesas_cadastradas')
        .select('nome')
        .eq('empresa_id', empresaId)
        .order('nome', { ascending: true });
      tiposDespesa = [...new Set((despesas || [])
        .map((despesa) => String(despesa.nome || '').trim())
        .filter(Boolean))];
    }
    if (!tiposDespesa.length) {
      return NextResponse.json({ erro: true, mensagem: 'Informe ao menos um tipo de despesa para a sugestão.' }, { status: 400 });
    }

    const apiKey = chaveOpenAI();
    if (!apiKey) {
      return NextResponse.json({ erro: true, mensagem: 'A leitura por IA ainda não está configurada.' }, { status: 503 });
    }

    const imagemBase64 = Buffer.from(await arquivo.arrayBuffer()).toString('base64');
    const resposta = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0,
        max_tokens: 300,
        response_format: { type: 'json_schema', json_schema: schemaLeitura(tiposDespesa) },
        messages: [
          {
            role: 'system',
            content: 'Você lê comprovantes e notas para um lançamento financeiro. Extraia somente a data do documento e o valor total. A data deve ser YYYY-MM-DD ou null. O valor deve ser o total final a pagar, nunca subtotal, troco, desconto ou valor parcelado. Sugira um tipo de despesa apenas se ele corresponder exatamente a uma das opções fornecidas. Não crie tipos. Quando houver dúvida, use null e confiança baixa. Não extraia nem retorne dados além do schema.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Tipos de despesa disponíveis: ${tiposDespesa.length ? tiposDespesa.join(' | ') : 'nenhum tipo cadastrado'}.` },
              { type: 'image_url', image_url: { url: `data:${arquivo.type};base64,${imagemBase64}`, detail: 'high' } },
            ],
          },
        ],
      }),
      cache: 'no-store',
    });

    const json = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      console.error('Erro na leitura de comprovante:', json?.error?.message || resposta.status);
      return NextResponse.json({ erro: true, mensagem: 'Não foi possível ler este documento agora.' }, { status: 502 });
    }

    const conteudo = json?.choices?.[0]?.message?.content;
    let leituraBruta: unknown = null;
    try {
      leituraBruta = JSON.parse(String(conteudo || ''));
    } catch {
      return NextResponse.json({ erro: true, mensagem: 'A IA retornou uma leitura inválida. Tente outra imagem.' }, { status: 502 });
    }

    return NextResponse.json({
      erro: false,
      leitura: normalizarLeitura(leituraBruta, tiposDespesa),
      tiposDespesa,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Erro inesperado na leitura de comprovante:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível preparar a leitura do documento.' }, { status: 500 });
  }
}
