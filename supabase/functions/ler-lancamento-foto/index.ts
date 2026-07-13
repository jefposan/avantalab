import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const TAMANHO_MAXIMO = 6 * 1024 * 1024;
const TIPOS_ACEITOS = new Set(['image/jpeg', 'image/png', 'image/webp']);

type LeituraIA = {
  data_documento: string | null;
  valor_total: number | null;
  despesa_sugerida: string | null;
  confianca_data: number;
  confianca_valor: number;
  confianca_despesa: number;
  observacao: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
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
  return {
    name: 'leitura_comprovante',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        data_documento: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        valor_total: { anyOf: [{ type: 'number' }, { type: 'null' }] },
        despesa_sugerida: { anyOf: [{ type: 'string', enum: tiposDespesa }, { type: 'null' }] },
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

function base64(bytes: Uint8Array) {
  let binario = '';
  const tamanhoBloco = 0x8000;
  for (let inicio = 0; inicio < bytes.length; inicio += tamanhoBloco) {
    binario += String.fromCharCode(...bytes.subarray(inicio, inicio + tamanhoBloco));
  }
  return btoa(binario);
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ erro: true, mensagem: 'A leitura por IA ainda não está configurada.' }, 503);
    }

    const authorization = req.headers.get('authorization') || '';
    const supabaseUsuario = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: autenticacao, error: erroAutenticacao } = await supabaseUsuario.auth.getUser();
    if (erroAutenticacao || !autenticacao.user) {
      return jsonResponse({ erro: true, mensagem: 'Entre no sistema para continuar.' }, 401);
    }

    const form = await req.formData();
    const empresaId = String(form.get('empresaId') || '').trim();
    const arquivo = form.get('arquivo');
    if (!empresaId || !(arquivo instanceof File)) {
      return jsonResponse({ erro: true, mensagem: 'Envie uma imagem e selecione um perfil.' }, 400);
    }
    if (!TIPOS_ACEITOS.has(arquivo.type) || !arquivo.size || arquivo.size > TAMANHO_MAXIMO) {
      return jsonResponse({ erro: true, mensagem: 'Use uma imagem JPG, PNG ou WEBP de até 6 MB.' }, 400);
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: vinculo, error: erroVinculo } = await db
      .from('usuarios_empresa')
      .select('id')
      .eq('user_id', autenticacao.user.id)
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo')
      .maybeSingle();
    if (erroVinculo || !vinculo) {
      return jsonResponse({ erro: true, mensagem: 'Você não tem acesso a este perfil.' }, 403);
    }

    const { data: despesas } = await db
      .from('despesas_cadastradas')
      .select('nome')
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true });
    const tiposDespesa = [...new Set((despesas || [])
      .map((despesa) => String(despesa.nome || '').trim())
      .filter(Boolean))];
    if (!tiposDespesa.length) {
      return jsonResponse({ erro: true, mensagem: 'Cadastre ao menos um tipo de despesa para receber a sugestão.' }, 400);
    }

    const imagemBase64 = base64(new Uint8Array(await arquivo.arrayBuffer()));
    const resposta = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + OPENAI_API_KEY,
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
              { type: 'text', text: 'Tipos de despesa disponíveis: ' + tiposDespesa.join(' | ') + '.' },
              { type: 'image_url', image_url: { url: 'data:' + arquivo.type + ';base64,' + imagemBase64, detail: 'high' } },
            ],
          },
        ],
      }),
    });

    const json = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      console.error('Erro na leitura de comprovante:', json?.error?.message || resposta.status);
      return jsonResponse({ erro: true, mensagem: 'Não foi possível ler este documento agora.' }, 502);
    }

    let leituraBruta: unknown = null;
    try {
      leituraBruta = JSON.parse(String(json?.choices?.[0]?.message?.content || ''));
    } catch {
      return jsonResponse({ erro: true, mensagem: 'A IA retornou uma leitura inválida. Tente outra imagem.' }, 502);
    }

    return jsonResponse({
      erro: false,
      leitura: normalizarLeitura(leituraBruta, tiposDespesa),
      tiposDespesa,
    });
  } catch (error) {
    console.error('Erro inesperado na leitura de comprovante:', error);
    return jsonResponse({ erro: true, mensagem: 'Não foi possível preparar a leitura do documento.' }, 500);
  }
});
