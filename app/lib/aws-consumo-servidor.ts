import { BillingClient, GetCreditsCommand } from '@aws-sdk/client-billing';
import { CloudWatchClient, GetMetricDataCommand, type MetricDataResult } from '@aws-sdk/client-cloudwatch';
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import { FreeTierClient, GetAccountPlanStateCommand, GetFreeTierUsageCommand } from '@aws-sdk/client-freetier';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import type { SupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

type ItemConsumoAws = {
  nome: string;
  usado: number | null;
  limite: number | null;
  formato: 'bytes' | 'numero' | 'minutos' | 'segundos' | 'reais' | 'brl' | 'percentual';
  detalhe?: string;
};

export type PlataformaConsumoAws = {
  nome: string;
  configurado: boolean;
  itens: ItemConsumoAws[];
  avisos: string[];
  link: string;
};

type BlocoConsumo = {
  itens: ItemConsumoAws[];
  avisos: string[];
};

type CredenciaisAws = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

type VerificacaoFacial = {
  tipo: 'cadastro' | 'marcacao';
  status: 'iniciada' | 'aprovada' | 'reprovada' | 'erro' | 'dispensada';
  confianca_prova_vida: number | string | null;
  similaridade: number | string | null;
  criado_em: string;
  concluido_em: string | null;
};

const REGIAO = process.env.AWS_REGION?.trim() || 'us-east-1';
const PRECO_LIVENESS_USD = 0.015;
const PRECO_COMPARE_FACES_USD = 0.001;
const DIAS_TRINTA_MS = 30 * 24 * 60 * 60 * 1000;

function arredondar(valor: number, casas = 2) {
  const fator = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * fator) / fator;
}

function media(valores: number[]) {
  return valores.length ? valores.reduce((total, valor) => total + valor, 0) / valores.length : null;
}

function numero(valor: unknown) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : null;
}

function dataIso(data: Date) {
  return data.toISOString().slice(0, 10);
}

function formatarData(data: Date | undefined) {
  if (!data || Number.isNaN(data.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(data);
}

function mensagemErro(erro: unknown) {
  if (erro instanceof Error) {
    const texto = `${erro.name} ${erro.message}`.toLowerCase();
    if (/accessdenied|access denied|not authorized|unauthorized/.test(texto)) return 'acesso negado pela política IAM';
    if (/unrecognizedclient|invalidsignature|invalid credential/.test(texto)) return 'credencial AWS inválida';
    if (/expiredtoken|token expired/.test(texto)) return 'credencial temporária expirada';
    if (/throttl|too many requests/.test(texto)) return 'limite temporário de consultas atingido';
    if (erro.message === 'conta AWS não identificada') return erro.message;
  }
  return 'falha inesperada';
}

function credenciaisAws(): CredenciaisAws | null {
  // Uma credencial exclusiva de leitura pode ser usada para Billing sem ampliar
  // as permissões da chave operacional do reconhecimento facial.
  const accessKeyId = process.env.AWS_BILLING_ACCESS_KEY_ID?.trim()
    || process.env.AWS_ACCESS_KEY_ID?.trim()
    || '';
  const secretAccessKey = process.env.AWS_BILLING_SECRET_ACCESS_KEY?.trim()
    || process.env.AWS_SECRET_ACCESS_KEY?.trim()
    || '';
  const sessionToken = process.env.AWS_BILLING_SESSION_TOKEN?.trim()
    || process.env.AWS_SESSION_TOKEN?.trim()
    || undefined;
  if (!accessKeyId || !secretAccessKey) return null;
  return { accessKeyId, secretAccessKey, ...(sessionToken ? { sessionToken } : {}) };
}

async function listarVerificacoesFaciais(db: SupabaseClient, inicioIso: string) {
  const pagina = 1000;
  const registros: VerificacaoFacial[] = [];
  for (let inicio = 0; ; inicio += pagina) {
    const { data, error } = await db
      .from('ponto_facial_verificacoes')
      .select('tipo, status, confianca_prova_vida, similaridade, criado_em, concluido_em')
      .gte('criado_em', inicioIso)
      .order('criado_em', { ascending: false })
      .range(inicio, inicio + pagina - 1);
    if (error) throw new Error(error.message);
    const lote = (data || []) as VerificacaoFacial[];
    registros.push(...lote);
    if (lote.length < pagina) return registros;
  }
}

async function consultarUsoRegistrado(db: SupabaseClient): Promise<BlocoConsumo> {
  const itens: ItemConsumoAws[] = [];
  const avisos: string[] = [];
  const agora = new Date();
  const inicioMes = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1));
  const inicio30Dias = new Date(agora.getTime() - DIAS_TRINTA_MS);
  const inicioConsulta = new Date(Math.min(inicioMes.getTime(), inicio30Dias.getTime()));

  const [verificacoes, ativos] = await Promise.all([
    listarVerificacoesFaciais(db, inicioConsulta.toISOString()),
    db
      .from('ponto_facial_funcionarios')
      .select('funcionario_user_id', { count: 'exact', head: true })
      .eq('status', 'ativo'),
  ]);
  const verificacoesMes = verificacoes.filter((item) => new Date(item.criado_em) >= inicioMes);
  const verificacoes30Dias = verificacoes.filter((item) => new Date(item.criado_em) >= inicio30Dias);
  const concluidasMes = verificacoesMes.filter((item) => item.status !== 'iniciada' && item.status !== 'dispensada');
  const aprovadasMes = verificacoesMes.filter((item) => item.status === 'aprovada');
  const reprovadasMes = verificacoesMes.filter((item) => item.status === 'reprovada');
  const errosMes = verificacoesMes.filter((item) => item.status === 'erro');
  const cadastrosMes = verificacoesMes.filter((item) => item.tipo === 'cadastro').length;
  const marcacoesMes = verificacoesMes.filter((item) => item.tipo === 'marcacao').length;
  const comparacoesMes = verificacoesMes.filter((item) => numero(item.similaridade) !== null).length;
  const confiancas = verificacoes30Dias
    .map((item) => numero(item.confianca_prova_vida))
    .filter((valor): valor is number => valor !== null);
  const similaridades = verificacoes30Dias
    .map((item) => numero(item.similaridade))
    .filter((valor): valor is number => valor !== null);
  const duracoes = verificacoes30Dias
    .filter((item) => item.concluido_em)
    .map((item) => (new Date(item.concluido_em!).getTime() - new Date(item.criado_em).getTime()) / 1000)
    .filter((valor) => Number.isFinite(valor) && valor >= 0 && valor <= 15 * 60);
  const diasDecorridos = Math.max(1, agora.getUTCDate());
  const diasNoMes = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() + 1, 0)).getUTCDate();
  const custoTecnico = concluidasMes.length * PRECO_LIVENESS_USD + comparacoesMes * PRECO_COMPARE_FACES_USD;
  const projecaoTecnica = (custoTecnico / diasDecorridos) * diasNoMes;
  const taxaAprovacao = concluidasMes.length ? (aprovadasMes.length / concluidasMes.length) * 100 : 0;

  itens.push(
    {
      nome: 'Funcionários com facial ativo',
      usado: ativos.error ? null : ativos.count || 0,
      limite: null,
      formato: 'numero',
      detalhe: ativos.error ? 'A contagem não pôde ser consultada agora.' : 'Cadastros faciais ativos em todos os perfis.',
    },
    {
      nome: 'Verificações no mês',
      usado: verificacoesMes.length,
      limite: null,
      formato: 'numero',
      detalhe: `${cadastrosMes.toLocaleString('pt-BR')} cadastro(s) e ${marcacoesMes.toLocaleString('pt-BR')} marcação(ões).`,
    },
    {
      nome: 'Média diária no mês',
      usado: arredondar(verificacoesMes.length / diasDecorridos, 1),
      limite: null,
      formato: 'numero',
      detalhe: `Média dos ${diasDecorridos} dia(s) decorridos no mês.`,
    },
    {
      nome: 'Aprovadas no mês',
      usado: aprovadasMes.length,
      limite: null,
      formato: 'numero',
      detalhe: `${reprovadasMes.length.toLocaleString('pt-BR')} reprovada(s) e ${errosMes.length.toLocaleString('pt-BR')} erro(s).`,
    },
    {
      nome: 'Taxa de aprovação',
      usado: arredondar(taxaAprovacao, 1),
      limite: null,
      formato: 'percentual',
      detalhe: 'Sobre verificações concluídas no mês.',
    },
    {
      nome: 'Confiança média (30 dias)',
      usado: media(confiancas) === null ? null : arredondar(media(confiancas)!, 1),
      limite: null,
      formato: 'percentual',
      detalhe: 'Média da prova de vida retornada pelo Rekognition.',
    },
    {
      nome: 'Similaridade média (30 dias)',
      usado: media(similaridades) === null ? null : arredondar(media(similaridades)!, 1),
      limite: null,
      formato: 'percentual',
      detalhe: 'Média das comparações com o cadastro facial.',
    },
    {
      nome: 'Tempo médio (30 dias)',
      usado: media(duracoes) === null ? null : arredondar(media(duracoes)!, 1),
      limite: null,
      formato: 'segundos',
      detalhe: 'Do início da sessão até a conclusão registrada pelo servidor.',
    },
    {
      nome: 'Estimativa técnica no mês',
      usado: arredondar(custoTecnico, 4),
      limite: null,
      formato: 'reais',
      detalhe: `Referência em ${REGIAO}: US$ 0,015 por prova de vida concluída e US$ 0,001 por CompareFaces. O custo oficial pode incluir sessões abandonadas e aparece no Cost Explorer.`,
    },
    {
      nome: 'Projeção técnica do mês',
      usado: arredondar(projecaoTecnica, 4),
      limite: null,
      formato: 'reais',
      detalhe: 'Projeção linear pelo ritmo diário atual; não é uma fatura AWS.',
    },
  );

  return { itens, avisos };
}

async function consultarCustos(credentials: CredenciaisAws): Promise<BlocoConsumo> {
  const itens: ItemConsumoAws[] = [];
  const avisos: string[] = [];
  try {
    const agora = new Date();
    const amanha = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate() + 1));
    const inicioMes = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1));
    const cliente = new CostExplorerClient({ region: 'us-east-1', credentials });
    const resposta = await cliente.send(new GetCostAndUsageCommand({
      TimePeriod: { Start: dataIso(inicioMes), End: dataIso(amanha) },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    }));
    const grupos = resposta.ResultsByTime?.flatMap((periodo) => periodo.Groups || []) || [];
    const custos = grupos.map((grupo) => ({
      servico: String(grupo.Keys?.[0] || ''),
      valor: numero(grupo.Metrics?.UnblendedCost?.Amount) || 0,
    }));
    const totalAws = custos.reduce((total, item) => total + item.valor, 0);
    const rekognition = custos
      .filter((item) => /rekognition/i.test(item.servico))
      .reduce((total, item) => total + item.valor, 0);
    const s3 = custos
      .filter((item) => /simple storage|amazon s3/i.test(item.servico))
      .reduce((total, item) => total + item.valor, 0);
    itens.push(
      { nome: 'Custo AWS no mês', usado: arredondar(totalAws, 4), limite: null, formato: 'reais', detalhe: 'Custo oficial acumulado da conta, antes da aplicação de créditos; pode ter atraso de até 24 horas e é atualizado no painel a cada hora.' },
      { nome: 'Custo Rekognition', usado: arredondar(rekognition, 4), limite: null, formato: 'reais', detalhe: 'Parcela oficial do Amazon Rekognition no mês.' },
      { nome: 'Custo S3', usado: arredondar(s3, 4), limite: null, formato: 'reais', detalhe: 'Total da conta no S3; inclui o cofre de evidências e qualquer outro bucket existente.' },
    );
  } catch (erro) {
    avisos.push(`AWS: custo oficial indisponível (${mensagemErro(erro)}). Conceda somente ce:GetCostAndUsage à credencial de leitura.`);
  }
  return { itens, avisos };
}

async function consultarCreditos(credentials: CredenciaisAws): Promise<BlocoConsumo> {
  const itens: ItemConsumoAws[] = [];
  const avisos: string[] = [];
  let creditoPlano: number | null = null;
  let detalhePlano = '';

  try {
    const clienteFreeTier = new FreeTierClient({ region: 'us-east-1', credentials });
    const plano = await clienteFreeTier.send(new GetAccountPlanStateCommand({}));
    creditoPlano = numero(plano.accountPlanRemainingCredits?.amount);
    const expira = formatarData(plano.accountPlanExpirationDate);
    detalhePlano = `Plano ${plano.accountPlanType === 'FREE' ? 'gratuito' : 'pago'} · ${plano.accountPlanStatus === 'ACTIVE' ? 'ativo' : String(plano.accountPlanStatus || 'situação não informada').toLowerCase()}${expira ? ` · expira em ${expira}` : ''}.`;
  } catch (erro) {
    avisos.push(`AWS: situação do plano gratuito indisponível (${mensagemErro(erro)}). Conceda freetier:GetAccountPlanState.`);
  }

  try {
    const sts = new STSClient({ region: 'us-east-1', credentials });
    const identidade = await sts.send(new GetCallerIdentityCommand({}));
    if (!identidade.Account) throw new Error('conta AWS não identificada');
    const inicio = new Date();
    inicio.setUTCDate(inicio.getUTCDate() - 364);
    const billing = new BillingClient({ region: 'us-east-1', credentials });
    const resposta = await billing.send(new GetCreditsCommand({ accountId: identidade.Account, startDate: inicio }));
    const creditos = (resposta.credits || []).filter((credito) => (
      credito.creditStatus !== 'DISABLED'
      && ((numero(credito.remainingAmount?.currencyAmount) || 0) > 0 || (numero(credito.estimatedAmount?.currencyAmount) || 0) > 0)
    ));
    const restantes = creditos.reduce((total, credito) => total + (numero(credito.remainingAmount?.currencyAmount) || 0), 0);
    const estimados = creditos.reduce((total, credito) => total + (numero(credito.estimatedAmount?.currencyAmount) ?? numero(credito.remainingAmount?.currencyAmount) ?? 0), 0);
    const datasExpiracao = creditos
      .map((credito) => credito.endDate)
      .filter((data): data is Date => Boolean(data) && data!.getTime() >= Date.now())
      .sort((a, b) => a.getTime() - b.getTime());
    if (creditos.length || creditoPlano === null) {
      itens.push({
        nome: 'Créditos disponíveis',
        usado: arredondar(restantes, 2),
        limite: null,
        formato: 'reais',
        detalhe: `${creditos.length.toLocaleString('pt-BR')} crédito(s) com saldo${datasExpiracao[0] ? ` · próximo vencimento em ${formatarData(datasExpiracao[0])}` : ''}.`,
      });
    } else {
      itens.push({ nome: 'Crédito disponível', usado: arredondar(creditoPlano, 2), limite: null, formato: 'reais', detalhe: detalhePlano });
    }
    if (Math.abs(estimados - restantes) >= 0.005) {
      itens.push({
        nome: 'Crédito estimado após fatura aberta',
        usado: arredondar(estimados, 2),
        limite: null,
        formato: 'reais',
        detalhe: 'Saldo estimado pela AWS considerando cobranças ainda não finalizadas.',
      });
    }
  } catch (erro) {
    if (creditoPlano !== null) {
      itens.push({ nome: 'Crédito disponível', usado: arredondar(creditoPlano, 2), limite: null, formato: 'reais', detalhe: detalhePlano });
    }
    avisos.push(`AWS: detalhamento dos créditos indisponível (${mensagemErro(erro)}). Conceda billing:GetCredits; a identificação da conta usa STS sem expor o ID.`);
  }

  if (!itens.some((item) => /Crédito/i.test(item.nome)) && creditoPlano !== null) {
    itens.push({ nome: 'Crédito disponível', usado: arredondar(creditoPlano, 2), limite: null, formato: 'reais', detalhe: detalhePlano });
  }
  return { itens, avisos };
}

async function consultarFreeTier(credentials: CredenciaisAws): Promise<BlocoConsumo> {
  const itens: ItemConsumoAws[] = [];
  const avisos: string[] = [];
  try {
    const cliente = new FreeTierClient({ region: 'us-east-1', credentials });
    const resposta = await cliente.send(new GetFreeTierUsageCommand({ maxResults: 1000 }));
    const ofertas = (resposta.freeTierUsages || []).filter((oferta) => (
      /rekognition|simple storage|amazon s3/i.test(`${oferta.service || ''} ${oferta.description || ''} ${oferta.usageType || ''}`)
    ));
    ofertas.slice(0, 8).forEach((oferta) => {
      const nomeBase = oferta.operation || oferta.description || oferta.usageType || 'Franquia AWS';
      const nome = nomeBase.length > 48 ? `${nomeBase.slice(0, 45)}…` : nomeBase;
      const previsao = numero(oferta.forecastedUsageAmount);
      itens.push({
        nome: `Free Tier · ${nome}`,
        usado: numero(oferta.actualUsageAmount),
        limite: numero(oferta.limit),
        formato: 'numero',
        detalhe: `${oferta.unit || 'unidade(s)'} no mês${previsao !== null ? ` · previsão ${previsao.toLocaleString('pt-BR')}` : ''}${oferta.freeTierType ? ` · ${oferta.freeTierType}` : ''}.`,
      });
    });
    if (!ofertas.length) {
      itens.push({
        nome: 'Free Tier específico',
        usado: null,
        limite: null,
        formato: 'numero',
        detalhe: 'A AWS não retornou franquia específica de Rekognition/S3 para esta conta; créditos gerais podem continuar cobrindo o serviço.',
      });
    }
  } catch (erro) {
    avisos.push(`AWS: uso do Free Tier indisponível (${mensagemErro(erro)}). Conceda freetier:GetFreeTierUsage.`);
  }
  return { itens, avisos };
}

function totalMetrica(resultados: MetricDataResult[], id: string) {
  return (resultados.find((resultado) => resultado.Id === id)?.Values || []).reduce((total, valor) => total + valor, 0);
}

function mediaMetrica(resultados: MetricDataResult[], id: string) {
  return media(resultados.find((resultado) => resultado.Id === id)?.Values || []);
}

async function consultarCloudWatch(credentials: CredenciaisAws): Promise<BlocoConsumo> {
  const itens: ItemConsumoAws[] = [];
  const avisos: string[] = [];
  try {
    const agora = new Date();
    const inicio = new Date(agora.getTime() - DIAS_TRINTA_MS);
    const cliente = new CloudWatchClient({ region: REGIAO, credentials });
    const metrica = (id: string, nome: string, stat: 'Sum' | 'Average', operacao?: string) => ({
      Id: id,
      MetricStat: {
        Metric: {
          Namespace: 'AWS/Rekognition',
          MetricName: nome,
          ...(operacao ? { Dimensions: [{ Name: 'Operation', Value: operacao }] } : {}),
        },
        Period: 86400,
        Stat: stat,
      },
      ReturnData: true,
    });
    const resposta = await cliente.send(new GetMetricDataCommand({
      StartTime: inicio,
      EndTime: agora,
      ScanBy: 'TimestampAscending',
      MetricDataQueries: [
        metrica('sucesso', 'SuccessfulRequestCount', 'Sum'),
        metrica('erro_usuario', 'UserErrorCount', 'Sum'),
        metrica('erro_servidor', 'ServerErrorCount', 'Sum'),
        metrica('limitadas', 'ThrottledCount', 'Sum'),
        metrica('latencia', 'ResponseTime', 'Average'),
        metrica('liveness', 'SuccessfulRequestCount', 'Sum', 'StartFaceLivenessSession'),
        metrica('comparacoes', 'SuccessfulRequestCount', 'Sum', 'CompareFaces'),
      ],
    }));
    const resultados = resposta.MetricDataResults || [];
    const erros = totalMetrica(resultados, 'erro_usuario') + totalMetrica(resultados, 'erro_servidor');
    itens.push(
      { nome: 'Chamadas AWS bem-sucedidas (30 dias)', usado: totalMetrica(resultados, 'sucesso'), limite: null, formato: 'numero', detalhe: 'Todas as operações Rekognition da conta na região configurada.' },
      { nome: 'Liveness iniciados pela AWS', usado: totalMetrica(resultados, 'liveness'), limite: null, formato: 'numero', detalhe: 'Métrica CloudWatch dos últimos 30 dias.' },
      { nome: 'CompareFaces na AWS', usado: totalMetrica(resultados, 'comparacoes'), limite: null, formato: 'numero', detalhe: 'Comparações concluídas segundo o CloudWatch.' },
      { nome: 'Erros AWS (30 dias)', usado: erros, limite: null, formato: 'numero', detalhe: 'Soma de erros do cliente e do serviço Rekognition.' },
      { nome: 'Chamadas limitadas', usado: totalMetrica(resultados, 'limitadas'), limite: null, formato: 'numero', detalhe: 'Requisições recusadas por limite de taxa.' },
      { nome: 'Latência média AWS', usado: mediaMetrica(resultados, 'latencia') === null ? null : arredondar(mediaMetrica(resultados, 'latencia')! / 1000, 2), limite: null, formato: 'segundos', detalhe: `Tempo médio de resposta do Rekognition em ${REGIAO}.` },
    );
  } catch (erro) {
    avisos.push(`AWS: métricas do Rekognition indisponíveis (${mensagemErro(erro)}). Conceda cloudwatch:GetMetricData.`);
  }
  return { itens, avisos };
}

export async function consumoAwsReconhecimentoFacial(db: SupabaseClient): Promise<PlataformaConsumoAws> {
  const credentials = credenciaisAws();
  const plataforma: PlataformaConsumoAws = {
    nome: 'AWS · Reconhecimento facial',
    configurado: Boolean(credentials),
    itens: [],
    avisos: [],
    link: 'https://console.aws.amazon.com/costmanagement/home#/cost-explorer',
  };

  const usoAplicacao = await consultarUsoRegistrado(db).catch((erro): BlocoConsumo => ({
    itens: [],
    avisos: [`AWS: não foi possível consolidar o histórico facial (${mensagemErro(erro)}).`],
  }));

  if (!credentials) {
    plataforma.itens.push(...usoAplicacao.itens);
    plataforma.avisos.push(
      ...usoAplicacao.avisos,
      'AWS: credenciais não encontradas no servidor. Configure AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY; para cobrança, prefira uma chave separada em AWS_BILLING_ACCESS_KEY_ID e AWS_BILLING_SECRET_ACCESS_KEY.',
    );
    return plataforma;
  }

  const [custos, creditos, freeTier, cloudWatch] = await consultarAwsExternoComCache();
  plataforma.itens.push(...custos.itens, ...creditos.itens, ...usoAplicacao.itens, ...cloudWatch.itens, ...freeTier.itens);
  plataforma.avisos.push(...custos.avisos, ...creditos.avisos, ...usoAplicacao.avisos, ...cloudWatch.avisos, ...freeTier.avisos);
  return plataforma;
}

// Cost Explorer cobra por consulta e os dados financeiros não são instantâneos.
// A leitura externa é compartilhada por uma hora, sem colocar credenciais na
// chave do cache; o histórico interno do AvantaLab continua atualizado a cada clique.
const consultarAwsExternoComCache = unstable_cache(
  async (): Promise<[BlocoConsumo, BlocoConsumo, BlocoConsumo, BlocoConsumo]> => {
    const credentials = credenciaisAws();
    if (!credentials) {
      const vazio: BlocoConsumo = { itens: [], avisos: [] };
      return [vazio, vazio, vazio, vazio];
    }
    return Promise.all([
      consultarCustos(credentials),
      consultarCreditos(credentials),
      consultarFreeTier(credentials),
      consultarCloudWatch(credentials),
    ]);
  },
  ['admin-consumo-aws-facial-v1'],
  { revalidate: 3600 },
);
