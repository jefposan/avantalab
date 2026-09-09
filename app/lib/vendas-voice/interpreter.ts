import { VOICE_INTENT_JSON_SCHEMA, validateVoiceIntentPayload } from './schema';
import type { VoiceEntityCandidate, VoiceIntentPayload, VoiceMetrics } from './types';

const SYSTEM_PROMPT = `Você interpreta comandos de voz em português do Brasil para o Avanta Vendas.
Retorne somente o objeto exigido pelo schema. Nunca invente IDs, clientes, produtos, preços ou execuções.
Intenções permitidas:
- create_order: criar pedido/venda com cliente e itens;
- create_consignment: criar pedido consignado com cliente e itens;
- register_payment: registrar recebimento/pagamento de cliente;
- create_appointment: criar agendamento na agenda do cliente;
- query_customer_history: consultar histórico, saldo ou último pedido de cliente;
- query_sales: consultar pedidos/vendas em today, this_month, last_month ou all;
- unsupported: qualquer outra ação, inclusive despesa, nota fiscal, cadastro, edição e exclusão.

Regras:
- Extraia somente referências faladas. A aplicação pesquisará o banco depois.
- Trate complemento, apelido, profissão, vínculo ou local dito junto ao nome como parte de customerReference. Exemplos: “Fernanda influencer”, “Luciana da Renata” e “Luciana do salão Bella” são referências completas de cliente, não produtos.
- Só crie um item quando houver indicação clara de produto, preferencialmente com quantidade, unidade, verbo de inclusão ou continuação explícita da lista de produtos. Um qualificativo logo após o nome do cliente não é item de pedido.
- Exemplo: “Lance para a Fernanda influencer” inicia create_order com customerReference “Fernanda influencer” e items vazio. Se a aplicação depois perguntar pelos produtos, “Influencer de 100 ml” é resposta de produto porque o contexto já resolveu o cliente.
- Preserve a maneira humana de descrever produtos, incluindo tipo, uso, marca, volume e apelido. “Progressiva Paladium” deve continuar como referência completa; a aplicação cruzará cada termo com nome, SKU, marca, categoria e descrição do catálogo real.
- Em uma lista de pedido, mantenha cada descrição de produto inteira, mesmo quando ela contiver uma marca seguida de uma característica. Por exemplo, “Triliss orgânica” é uma única referência de produto; não descarte “orgânica”, não a transforme em novo item e não misture atributos entre itens diferentes.
- Palavras ausentes na fala podem existir no meio do nome cadastrado. Preserve exatamente “kit cabelos normais” como uma única referência: o catálogo poderá conciliá-la com “Kit Home Care - Cabelos Normais”. Nunca exija que a pessoa diga termos comerciais intermediários que ela não conhece.
- Quando a fala disser “consignado”, “em consignação”, “deixar consignado” ou “mandar em consignado”, use create_consignment. Nunca infira consignação apenas porque o pagamento não foi informado.
- Entenda formulações naturais equivalentes: “faz”, “cria”, “lança”, “manda”, “separa” ou “deixa” podem indicar pedido quando vierem com cliente e produtos; “recebi”, “baixar”, “dar baixa”, “pagamento” ou “quitou” podem indicar register_payment quando vierem com valor. Sem produto ou quantidade, mantenha o rascunho e deixe a aplicação perguntar o dado ausente.
- Não corrija silenciosamente um nome de cliente ou produto: mantenha a referência falada, mesmo se a dicção parecer próxima de outro nome. O resolvedor seguro do catálogo decide se é único ou pede uma escolha.
- Preserve e complete o rascunho anterior quando a fala for uma resposta curta de esclarecimento.
- Se houver candidatos anteriores, use a nova fala para tornar a referência mais específica, sem copiar IDs.
- Para create_order, mantenha todos os itens já informados e acrescente/complemente os novos.
- Quantidades e valores devem ser números positivos.
- Em register_payment, extraia a forma de pagamento somente como Pix, Dinheiro, Cartão de crédito, Cartão de débito, Transferência ou Outro. Se não for dita, use null.
- Em create_appointment, extraia cliente, data, horário, tipo e observação quando forem ditos. A data deve usar YYYY-MM-DD; use a data de referência fornecida no contexto para interpretar “hoje”, “amanhã”, dias da semana e datas relativas. Tipos permitidos: Visita, Entrega, Recebimento, Cobrar ou Outro. Sem tipo, use null; a aplicação assumirá Visita. Sem horário, use null. Nunca invente data.
- Se o período não for dito em query_sales, use this_month.
- Não transforme uma consulta em ação de escrita.`;

type InterpretVoiceInput = {
  transcription: string;
  previousDraft?: VoiceIntentPayload | null;
  candidates?: VoiceEntityCandidate[];
};

export async function interpretVoiceCommand({ transcription, previousDraft, candidates = [] }: InterpretVoiceInput) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_AVA || '';
  if (!apiKey) throw new Error('A integração da OpenAI não está configurada no servidor.');
  const startedAt = performance.now();
  const model = process.env.OPENAI_VOICE_COMMAND_MODEL || 'gpt-4o-mini';
  const compactContext = {
    reference_date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
    previous_draft: previousDraft || null,
    previous_candidates: candidates.slice(0, 6).map(({ label, detail }) => ({ label, detail })),
    transcription,
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 500,
      response_format: { type: 'json_schema', json_schema: VOICE_INTENT_JSON_SCHEMA },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(compactContext) },
      ],
    }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    console.error('Erro OpenAI no laboratório de voz:', result?.error?.message || response.status);
    throw new Error('Não foi possível entender sua solicitação agora.');
  }
  const content = result?.choices?.[0]?.message?.content;
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(content || ''));
  } catch {
    throw new Error('A interpretação retornou um formato inválido. Tente falar novamente.');
  }
  const intent = validateVoiceIntentPayload(parsed);
  if (!intent) throw new Error('A interpretação não passou pela validação de segurança. Tente novamente.');
  const metrics: VoiceMetrics = {
    interpretationMs: Math.round(performance.now() - startedAt),
    inputTokens: Number.isFinite(result?.usage?.prompt_tokens) ? result.usage.prompt_tokens : null,
    outputTokens: Number.isFinite(result?.usage?.completion_tokens) ? result.usage.completion_tokens : null,
    totalTokens: Number.isFinite(result?.usage?.total_tokens) ? result.usage.total_tokens : null,
  };
  return { intent, metrics, model };
}
