import 'server-only';
import { validarRascunhoVozCampo, VOICE_FIELD_OPERATION_SCHEMA } from './schema';
import type { MetricasVozCampo, ModoVozCampo, RascunhoVozCampo } from './types';

const SYSTEM_PROMPT = `Você interpreta comandos de voz em português do Brasil para o aplicativo AvantaLab Operações em Campo.
Retorne somente o objeto exigido pelo schema. Nunca invente IDs, clientes, valores, datas nem execuções.

CATÁLOGO FIXO DE FUNÇÕES
- register_receipt: use em Recebimentos quando a pessoa disser que recebeu, cobrou, deu baixa, lançou pagamento, foi paga, quitou ou acertou um valor. Dados necessários: cliente/local, valor e forma.
- schedule_service: use em Serviços quando a pessoa pedir para agendar, marcar, reservar, encaixar ou programar uma visita/serviço. Dados necessários: cliente/local, data e tipo.
- complete_service: use em Serviços quando a pessoa disser que vai registrar, executar, concluir, realizar ou finalizar um atendimento. Dados necessários pela voz: cliente/local. Se disser rotina, padrão, interna, revisão ou extra, preserve essa indicação para escolher a execução pendente. A aplicação abrirá o nome, a assinatura e a avaliação na tela.
- unsupported: qualquer consulta ou ação fora dessas funções.

Regras:
- Extraia a referência humana completa do cliente ou local. A aplicação pesquisará o cadastro depois.
- O nome pode ser comercial, abreviado, foneticamente próximo ou acompanhado de local, responsável, shopping, sala, bairro ou cidade. Preserve tudo que ajude a localizar; não corrija para uma empresa inventada.
- Sem rascunho anterior, replace_previous é sempre false.
- Com rascunho anterior, uma resposta curta que apenas informa o dado perguntado (por exemplo “Pix”, “quinhentos reais”, “amanhã” ou “a interna”) deve preservar o rascunho e usar replace_previous false.
- Com rascunho anterior, uma fala que inicia claramente outro lançamento, repete um verbo de ação com outro cliente/local ou descreve uma nova solicitação completa deve usar replace_previous true e ignorar todos os dados antigos.
- Em recebimentos, extraia valor e forma: boleto, cartao_credito, cartao_debito, dinheiro ou pix.
- “Cartão” sem débito ou crédito não define a forma; deixe payment_method nulo para a aplicação perguntar.
- Em serviços, tipos de agendamento permitidos: interna, revisao e extra.
- “Retorno” ou “revisar” indicam revisao; “encaixe” ou “fora da rotina” indicam extra; “visita interna” indica interna.
- Datas usam YYYY-MM-DD. Use a data de referência para hoje, amanhã e dias da semana; nunca invente data.
- Um serviço realizado exige assinatura e avaliação na tela. Ainda assim classifique como complete_service; a voz só localizará o cliente e a execução, sem registrar o atendimento.
- Se a pessoa pedir uma operação de outro sistema, retorne unsupported e explique brevemente.
- Não transforme consulta ou frase incerta em escrita.`;

export async function interpretarVozCampo(input: {
  transcription: string;
  mode: ModoVozCampo;
  previousDraft?: RascunhoVozCampo | null;
}) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_AVA || '';
  if (!apiKey) throw new Error('A integração da OpenAI não está configurada no servidor.');
  const startedAt = performance.now();
  const model = process.env.OPENAI_VOICE_COMMAND_MODEL || 'gpt-4o-mini';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 360,
      response_format: { type: 'json_schema', json_schema: VOICE_FIELD_OPERATION_SCHEMA },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            system: input.mode,
            reference_date: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()),
            previous_draft: input.previousDraft || null,
            transcription: input.transcription,
          }),
        },
      ],
    }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    console.error('Erro OpenAI em Operações de Campo:', result?.error?.message || response.status);
    throw new Error('Não foi possível entender sua solicitação agora.');
  }
  let parsed: unknown;
  try { parsed = JSON.parse(String(result?.choices?.[0]?.message?.content || '')); }
  catch { throw new Error('A interpretação retornou um formato inválido. Tente falar novamente.'); }
  const draft = validarRascunhoVozCampo(parsed);
  if (!draft) throw new Error('A interpretação não passou pela validação de segurança. Tente novamente.');
  // A primeira fala jamais pode substituir uma solicitação inexistente. Essa
  // decisão fica vinculada à presença de um rascunho validado no servidor.
  draft.replacePrevious = Boolean(input.previousDraft && draft.replacePrevious);
  const metrics: MetricasVozCampo = {
    interpretationMs: Math.round(performance.now() - startedAt),
    inputTokens: Number.isFinite(result?.usage?.prompt_tokens) ? result.usage.prompt_tokens : null,
    outputTokens: Number.isFinite(result?.usage?.completion_tokens) ? result.usage.completion_tokens : null,
    totalTokens: Number.isFinite(result?.usage?.total_tokens) ? result.usage.total_tokens : null,
  };
  return { draft, metrics };
}
