import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { exigirAdmin } from '../../lib/admin-server';
import { obterSaldoAsaas } from '../../lib/asaas';

export const runtime = 'nodejs';

// ─────────────────────────────────────────────────────────────
// /api/admin-consumo — uso x limite das plataformas (Supabase,
// Vercel, GitHub, OpenAI e Asaas) para o painel /admin.
//
// Tokens (variáveis de ambiente, todas opcionais — sem elas o
// painel mostra o que dá e instruções do que falta):
//   VERCEL_TOKEN   → token de acesso (vercel.com/account/tokens)
//   VERCEL_TEAM_ID → id do time (opcional; conta pessoal = vazio)
//   GITHUB_TOKEN   → PAT clássico (escopos: repo + user)
//   GITHUB_REPO    → ex.: jefposan/avantalab
//   OPENAI_ADMIN_KEY → chave administrativa da organização OpenAI
//   ASAAS_API_KEY  → mesma chave já usada pela integração de pagamentos
//   CLOUDFLARE_API_TOKEN → token com Account > Account Analytics > Read
//   CLOUDFLARE_ZONE_ID   → identificador da zona avantalab.com.br
//
// O Supabase não precisa de token novo: usa a service role + a
// função SQL admin_metricas_uso() (SQL devolvido no aviso caso
// ainda não exista no banco).
// ─────────────────────────────────────────────────────────────

// Limites contratados atualmente. O painel não recebe o plano pela API pública
// do Supabase, por isso estes valores acompanham a assinatura da organização.
const LIMITES = {
  supabase: {
    plano: 'Pro',
    dbBytes: 8 * 1024 * 1024 * 1024,        // 8 GB
    storageBytes: 100 * 1024 * 1024 * 1024, // 100 GB
    usuariosMau: 100000,                    // 100 mil usuários ativos/mês
    egressGb: 250,                          // 250 GB/mês (não exposto via API)
  },
  vercel: {
    bandwidthGb: 100,     // fast data transfer 100 GB/mês (Hobby)
    deploysDia: 100,      // 100 deploys/dia (Hobby)
  },
  github: {
    actionsMinutos: 2000, // 2.000 min/mês (Free, repositórios privados)
    packagesBytes: 500 * 1024 * 1024, // 500 MB
    repoRecomendadoBytes: 1024 * 1024 * 1024, // recomendação < 1 GB (soft 5 GB)
  },
};

const SQL_METRICAS_SUPABASE = `create or replace function public.admin_metricas_uso()
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'db_bytes', pg_database_size(current_database()),
    'storage_bytes', coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0),
    'usuarios_auth', (select count(*) from auth.users)
  );
$$;
revoke execute on function public.admin_metricas_uso() from public, anon, authenticated;`;

type Item = {
  nome: string;
  usado: number | null;   // null = não medível via API
  limite: number | null;  // null = sem teto conhecido
  formato: 'bytes' | 'numero' | 'minutos' | 'reais' | 'brl' | 'percentual';
  detalhe?: string;
};

type Plataforma = {
  nome: string;
  configurado: boolean;
  itens: Item[];
  avisos: string[];
  link: string; // painel oficial para conferência
};

type CloudflareTotals = {
  requests?: { all?: number; cached?: number };
  bandwidth?: { all?: number; cached?: number };
  pageviews?: { all?: number };
  uniques?: { all?: number };
  threats?: { all?: number };
};

type CloudflareGraphqlResponse = {
  data?: {
    viewer?: {
      zones?: Array<{
        totals?: Array<{
          sum?: {
            bytes?: number;
            cachedBytes?: number;
            cachedRequests?: number;
            pageViews?: number;
            requests?: number;
            threats?: number;
          };
          uniq?: { uniques?: number };
        }>;
      }>;
    };
  };
  errors?: Array<{ message?: string }>;
};

async function historicoImportadorIa(db: Awaited<ReturnType<typeof exigirAdmin>>['db']) {
  const { data, error } = await db
    .from('importador_ia_analises')
    .select('id, empresa_id, competencia, envio_mes, tipo_documento, paginas, status, modelos_utilizados, contingencia_utilizada, tokens_entrada, tokens_saida, tokens_raciocinio, tokens_total, codigo_resultado, criado_em, finalizado_em')
    .order('tokens_total', { ascending: false })
    .order('criado_em', { ascending: false })
    .limit(100);

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return [];
    throw error;
  }

  const empresaIds = [...new Set((data || []).map((item) => String(item.empresa_id || '')).filter(Boolean))];
  const { data: empresas, error: erroEmpresas } = empresaIds.length
    ? await db.from('empresas').select('id, nome').in('id', empresaIds)
    : { data: [], error: null };
  if (erroEmpresas) throw erroEmpresas;
  const nomes = new Map((empresas || []).map((empresa) => [String(empresa.id), String(empresa.nome || 'Perfil sem nome')]));

  return (data || []).map((item) => ({
    ...item,
    nome_perfil: nomes.get(String(item.empresa_id)) || 'Perfil removido',
  }));
}

async function consumoSupabase(db: Awaited<ReturnType<typeof exigirAdmin>>['db']): Promise<Plataforma> {
  const plataforma: Plataforma = {
    nome: `Supabase ${LIMITES.supabase.plano}`,
    configurado: true,
    itens: [],
    avisos: [],
    link: 'https://supabase.com/dashboard/org/_/usage',
  };
  try {
    const { data, error } = await db.rpc('admin_metricas_uso');
    if (error) throw error;
    const m = (typeof data === 'string' ? JSON.parse(data) : data) || {};
    plataforma.itens.push(
      { nome: 'Banco de dados', usado: Number(m.db_bytes) || 0, limite: LIMITES.supabase.dbBytes, formato: 'bytes', detalhe: 'Limite incluído no plano Pro.' },
      { nome: 'Storage (arquivos)', usado: Number(m.storage_bytes) || 0, limite: LIMITES.supabase.storageBytes, formato: 'bytes', detalhe: '100 GB incluídos no plano Pro.' },
      { nome: 'Usuários (contas)', usado: Number(m.usuarios_auth) || 0, limite: LIMITES.supabase.usuariosMau, formato: 'numero', detalhe: 'Limite do plano é por usuários ATIVOS/mês; aqui mostramos o total de contas.' },
    );
    plataforma.itens.push({ nome: 'Egress (tráfego)', usado: null, limite: LIMITES.supabase.egressGb, formato: 'numero', detalhe: 'Não exposto via API — confira no painel do Supabase.' });
  } catch (e) {
    plataforma.configurado = false;
    plataforma.avisos.push(
      'Função admin_metricas_uso() não encontrada no banco. Rode este SQL uma vez no SQL Editor do Supabase:',
      SQL_METRICAS_SUPABASE,
    );
  }
  return plataforma;
}

async function consumoVercel(): Promise<Plataforma> {
  const token = process.env.VERCEL_TOKEN || '';
  const teamId = process.env.VERCEL_TEAM_ID || '';
  const plataforma: Plataforma = {
    nome: 'Vercel',
    configurado: Boolean(token),
    itens: [],
    avisos: [],
    link: 'https://vercel.com/dashboard/usage',
  };
  if (!token) {
    plataforma.avisos.push('Defina VERCEL_TOKEN (vercel.com/account/tokens) para medir deploys e custos. VERCEL_TEAM_ID é opcional (conta pessoal = vazio).');
    plataforma.itens.push({ nome: 'Bandwidth (fast data transfer)', usado: null, limite: LIMITES.vercel.bandwidthGb, formato: 'numero', detalhe: 'GB/mês do plano Hobby — confira no painel.' });
    return plataforma;
  }
  const headers = { Authorization: `Bearer ${token}` };
  const sufixoTeam = teamId ? `&teamId=${encodeURIComponent(teamId)}` : '';

  // Deploys nos últimos 30 dias (funciona em qualquer plano).
  try {
    const desde = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const resp = await fetch(`https://api.vercel.com/v6/deployments?limit=100&since=${desde}${sufixoTeam}`, { headers });
    const json = await resp.json();
    if (resp.ok) {
      const qtd = (json.deployments || []).length;
      plataforma.itens.push({
        nome: 'Deploys (30 dias)',
        usado: qtd,
        limite: null,
        formato: 'numero',
        detalhe: `Limite Hobby: ${LIMITES.vercel.deploysDia}/dia.${qtd >= 100 ? ' (100+ — lista limitada)' : ''}`,
      });
    } else {
      plataforma.avisos.push('Vercel: token inválido ou sem acesso aos deployments (' + (json?.error?.message || resp.status) + ').');
    }
  } catch {
    plataforma.avisos.push('Vercel: não foi possível consultar os deployments agora.');
  }

  // Custos/uso do mês (endpoint /v1/billing/charges — FOCUS, JSONL).
  try {
    const agora = new Date();
    const inicioMes = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1)).toISOString();
    const resp = await fetch(
      `https://api.vercel.com/v1/billing/charges?from=${encodeURIComponent(inicioMes)}&to=${encodeURIComponent(agora.toISOString())}${sufixoTeam}`,
      { headers },
    );
    if (resp.ok) {
      const texto = await resp.text();
      let custoTotal = 0;
      const porServico = new Map<string, number>();
      texto.split('\n').forEach((linha) => {
        if (!linha.trim()) return;
        try {
          const registro = JSON.parse(linha);
          const custo = Number(registro.BilledCost ?? registro.EffectiveCost ?? 0) || 0;
          custoTotal += custo;
          const servico = String(registro.ServiceName || registro.ChargeDescription || 'Outros');
          porServico.set(servico, (porServico.get(servico) || 0) + custo);
        } catch { /* linha inválida — ignora */ }
      });
      plataforma.itens.push({ nome: 'Custo do mês (US$)', usado: Math.round(custoTotal * 100) / 100, limite: null, formato: 'reais', detalhe: 'Plano Hobby: US$ 0 dentro dos limites.' });
      [...porServico.entries()]
        .filter(([, custo]) => custo > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([servico, custo]) => {
          plataforma.itens.push({ nome: `· ${servico}`, usado: Math.round(custo * 100) / 100, limite: null, formato: 'reais' });
        });
    } else if (resp.status === 402 || resp.status === 403 || resp.status === 404) {
      plataforma.avisos.push('Uso detalhado (bandwidth etc.) não disponível via API no plano Hobby — confira no painel de Usage da Vercel.');
    }
  } catch {
    plataforma.avisos.push('Vercel: não foi possível consultar o billing agora.');
  }
  return plataforma;
}

async function consumoGithub(): Promise<Plataforma> {
  const token = process.env.GITHUB_TOKEN || '';
  const repo = process.env.GITHUB_REPO || 'jefposan/avantalab';
  const [owner] = repo.split('/');
  const plataforma: Plataforma = {
    nome: 'GitHub',
    configurado: Boolean(token),
    itens: [],
    avisos: [],
    link: `https://github.com/settings/billing/summary`,
  };
  if (!token) {
    plataforma.avisos.push('Defina GITHUB_TOKEN (PAT clássico com escopos "repo" e "user") e GITHUB_REPO (ex.: jefposan/avantalab) para medir o uso.');
    return plataforma;
  }
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'avantalab-admin',
  };

  // Tamanho do repositório.
  try {
    const resp = await fetch(`https://api.github.com/repos/${repo}`, { headers });
    const json = await resp.json();
    if (resp.ok) {
      plataforma.itens.push({
        nome: 'Tamanho do repositório',
        usado: Number(json.size || 0) * 1024, // API devolve em KB
        limite: LIMITES.github.repoRecomendadoBytes,
        formato: 'bytes',
        detalhe: 'Recomendação do GitHub: < 1 GB (limite rígido: 5 GB).',
      });
    } else {
      plataforma.avisos.push(`GitHub: não foi possível ler o repositório ${repo} (${json?.message || resp.status}).`);
    }
  } catch {
    plataforma.avisos.push('GitHub: não foi possível consultar o repositório agora.');
  }

  // Uso de billing do mês (Actions/Packages) — PAT clássico.
  try {
    const agora = new Date();
    const resp = await fetch(
      `https://api.github.com/users/${owner}/settings/billing/usage?year=${agora.getUTCFullYear()}&month=${agora.getUTCMonth() + 1}`,
      { headers },
    );
    const json = await resp.json();
    if (resp.ok) {
      const itens: { product?: string; unitType?: string; quantity?: number }[] = json.usageItems || [];
      const soma = (produto: string, unidade: string) => itens
        .filter((i) => String(i.product || '').toLowerCase() === produto && String(i.unitType || '').toLowerCase() === unidade)
        .reduce((total, i) => total + (Number(i.quantity) || 0), 0);
      plataforma.itens.push(
        { nome: 'Actions (minutos no mês)', usado: soma('actions', 'minutes'), limite: LIMITES.github.actionsMinutos, formato: 'minutos' },
        { nome: 'Packages (GB armazenados)', usado: soma('packages', 'gigabytes') || soma('packages', 'gigabytehours'), limite: LIMITES.github.packagesBytes / (1024 * 1024 * 1024), formato: 'numero' },
      );
    } else if (resp.status === 403 || resp.status === 404) {
      plataforma.avisos.push('GitHub: uso de Actions/Packages indisponível — o endpoint de billing exige PAT clássico (fine-grained não funciona).');
    }
  } catch {
    plataforma.avisos.push('GitHub: não foi possível consultar o billing agora.');
  }

  // Rate limit da própria API (útil como termômetro).
  try {
    const resp = await fetch('https://api.github.com/rate_limit', { headers });
    const json = await resp.json();
    const core = json?.resources?.core;
    if (resp.ok && core) {
      plataforma.itens.push({ nome: 'API rate limit (hora)', usado: Number(core.used) || 0, limite: Number(core.limit) || null, formato: 'numero' });
    }
  } catch { /* opcional */ }
  return plataforma;
}

async function consumoOpenAI(): Promise<Plataforma> {
  const adminKey = process.env.OPENAI_ADMIN_KEY || '';
  const plataforma: Plataforma = {
    nome: 'OpenAI API',
    configurado: Boolean(adminKey),
    itens: [],
    avisos: [],
    link: 'https://platform.openai.com/settings/organization/billing/overview',
  };

  plataforma.itens.push({
    nome: 'Crédito disponível',
    usado: null,
    limite: null,
    formato: 'reais',
    detalhe: 'O saldo pré-pago não é exposto pela API oficial. Use “Abrir painel” para conferir o valor atual.',
  });

  if (!adminKey) {
    plataforma.avisos.push('Defina OPENAI_ADMIN_KEY para consultar o custo oficial da organização no mês. A chave comum OPENAI_API_KEY não possui acesso administrativo ao billing.');
    plataforma.itens.unshift({ nome: 'Custo no mês (US$)', usado: null, limite: null, formato: 'reais' });
    return plataforma;
  }

  try {
    const agora = new Date();
    const inicioMes = Math.floor(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1) / 1000);
    const fim = Math.floor(agora.getTime() / 1000);
    const parametros = new URLSearchParams({
      start_time: String(inicioMes),
      end_time: String(fim),
      bucket_width: '1d',
      limit: '31',
    });
    const resp = await fetch(`https://api.openai.com/v1/organization/costs?${parametros.toString()}`, {
      headers: {
        Authorization: `Bearer ${adminKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const mensagem = json?.error?.message || `HTTP ${resp.status}`;
      throw new Error(mensagem);
    }
    const custo = (json.data || []).reduce((totalBucket: number, bucket: { results?: Array<{ amount?: { value?: number } }> }) => (
      totalBucket + (bucket.results || []).reduce((total: number, item) => total + (Number(item.amount?.value) || 0), 0)
    ), 0);
    plataforma.itens.unshift({
      nome: 'Custo no mês (US$)',
      usado: Math.round(custo * 10000) / 10000,
      limite: null,
      formato: 'reais',
      detalhe: 'Valor oficial acumulado desde o primeiro dia do mês, consultado pela API administrativa da organização.',
    });
  } catch (error) {
    plataforma.configurado = false;
    plataforma.itens.unshift({ nome: 'Custo no mês (US$)', usado: null, limite: null, formato: 'reais' });
    plataforma.avisos.push(`OpenAI: não foi possível consultar os custos (${error instanceof Error ? error.message : 'falha inesperada'}).`);
  }

  return plataforma;
}

async function consumoAsaas(): Promise<Plataforma> {
  const configurado = Boolean(process.env.ASAAS_API_KEY?.trim());
  const plataforma: Plataforma = {
    nome: 'Asaas',
    configurado,
    itens: [],
    avisos: [],
    link: 'https://www.asaas.com/',
  };

  if (!configurado) {
    plataforma.itens.push({ nome: 'Saldo disponível', usado: null, limite: null, formato: 'brl' });
    plataforma.avisos.push('Defina ASAAS_API_KEY para consultar o saldo da conta vinculada ao sistema.');
    return plataforma;
  }

  const resposta = await obterSaldoAsaas();
  const saldo = Number(resposta.data?.balance);
  if (!resposta.ok || !Number.isFinite(saldo)) {
    plataforma.configurado = false;
    plataforma.itens.push({ nome: 'Saldo disponível', usado: null, limite: null, formato: 'brl' });
    plataforma.avisos.push(`Asaas: não foi possível consultar o saldo (${resposta.erro || 'resposta inválida'}).`);
    return plataforma;
  }

  plataforma.itens.push({
    nome: 'Saldo disponível',
    usado: saldo,
    limite: null,
    formato: 'brl',
    detalhe: 'Valor disponível na conta Asaas vinculada ao sistema.',
  });
  return plataforma;
}

async function consultarCloudflare30Dias(zoneId: string): Promise<CloudflareTotals> {
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim() || '';
  if (!token) throw new Error('token não configurado');

  const agora = new Date();
  const inicio = new Date(agora);
  inicio.setUTCDate(inicio.getUTCDate() - 29);

  // Sem dimensão de data, o GraphQL devolve um único total consolidado para
  // todo o intervalo. Isso também evita somar o mesmo visitante em dias distintos.
  const query = `
    query AdminCloudflareUsage($zoneTag: string, $start: Date, $end: Date) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          totals: httpRequests1dGroups(
            limit: 1
            filter: { date_geq: $start, date_leq: $end }
          ) {
            sum {
              bytes
              cachedBytes
              cachedRequests
              pageViews
              requests
              threats
            }
            uniq {
              uniques
            }
          }
        }
      }
    }
  `;
  const resposta = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: {
        zoneTag: zoneId,
        start: inicio.toISOString().slice(0, 10),
        end: agora.toISOString().slice(0, 10),
      },
    }),
    cache: 'no-store',
  });
  const dados = await resposta.json().catch(() => ({})) as CloudflareGraphqlResponse;
  if (!resposta.ok || dados.errors?.length) {
    const mensagem = dados.errors?.map((erro) => erro.message).filter(Boolean).join('; ');
    throw new Error(mensagem || `HTTP ${resposta.status}`);
  }

  const zona = dados.data?.viewer?.zones?.[0];
  if (!zona) {
    throw new Error('zona não encontrada ou não autorizada para este token');
  }
  const totais = zona.totals?.[0];
  if (!totais) return {};

  return {
    requests: {
      all: Number(totais.sum?.requests) || 0,
      cached: Number(totais.sum?.cachedRequests) || 0,
    },
    bandwidth: {
      all: Number(totais.sum?.bytes) || 0,
      cached: Number(totais.sum?.cachedBytes) || 0,
    },
    pageviews: { all: Number(totais.sum?.pageViews) || 0 },
    uniques: { all: Number(totais.uniq?.uniques) || 0 },
    threats: { all: Number(totais.sum?.threats) || 0 },
  };
}

// A consulta é compartilhada entre administradores e revalidada somente a cada hora.
// O token nunca sai deste módulo de servidor nem é incluído na chave de cache.
const consultarCloudflareComCache = unstable_cache(
  consultarCloudflare30Dias,
  ['admin-consumo-cloudflare-30-dias-v2'],
  { revalidate: 3600 },
);

async function consumoCloudflare(): Promise<Plataforma> {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim() || '';
  const tokenConfigurado = Boolean(process.env.CLOUDFLARE_API_TOKEN?.trim());
  const plataforma: Plataforma = {
    nome: 'Cloudflare',
    configurado: Boolean(zoneId && tokenConfigurado),
    itens: [],
    avisos: [],
    link: 'https://dash.cloudflare.com/',
  };

  if (!plataforma.configurado) {
    plataforma.avisos.push('Defina CLOUDFLARE_API_TOKEN (Account > Account Analytics > Read) e CLOUDFLARE_ZONE_ID para acompanhar os dados dos últimos 30 dias.');
    return plataforma;
  }

  try {
    const totais = await consultarCloudflareComCache(zoneId);
    const requisicoes = Number(totais.requests?.all) || 0;
    const requisicoesCache = Number(totais.requests?.cached) || 0;
    const trafego = Number(totais.bandwidth?.all) || 0;
    const trafegoCache = Number(totais.bandwidth?.cached) || 0;
    const percentualCache = trafego > 0 ? Math.round((trafegoCache / trafego) * 1000) / 10 : null;

    plataforma.itens.push(
      { nome: 'Requisições (30 dias)', usado: requisicoes, limite: null, formato: 'numero' },
      { nome: 'Tráfego (30 dias)', usado: trafego, limite: null, formato: 'bytes' },
      {
        nome: 'Cache servido',
        usado: percentualCache,
        limite: null,
        formato: 'percentual',
        detalhe: `${requisicoesCache.toLocaleString('pt-BR')} requisições atendidas pelo cache.`,
      },
      { nome: 'Visualizações de página', usado: Number(totais.pageviews?.all) || 0, limite: null, formato: 'numero' },
      { nome: 'Visitantes únicos', usado: Number(totais.uniques?.all) || 0, limite: null, formato: 'numero' },
      {
        nome: 'Ameaças mitigadas',
        usado: Number(totais.threats?.all) || 0,
        limite: null,
        formato: 'numero',
        detalhe: 'Eventos bloqueados ou mitigados pela proteção da zona.',
      },
    );
  } catch (error) {
    plataforma.configurado = false;
    const mensagem = error instanceof Error ? error.message : 'falha inesperada';
    const parecePermissao = /unauthori[sz]ed|not authorized|access|permission|auth/i.test(mensagem);
    plataforma.avisos.push(
      `Cloudflare: não foi possível consultar as métricas (${mensagem}).${parecePermissao ? ' Confirme no token a permissão Account > Account Analytics > Read e o acesso à zona.' : ''}`,
    );
  }

  return plataforma;
}

export async function GET(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 401 });

    const [supabase, vercel, github, openai, asaas, cloudflare, historicoIa] = await Promise.all([
      consumoSupabase(db),
      consumoVercel(),
      consumoGithub(),
      consumoOpenAI(),
      consumoAsaas(),
      consumoCloudflare(),
      historicoImportadorIa(db),
    ]);
    return NextResponse.json({
      erro: false,
      plataformas: [supabase, vercel, github, openai, asaas, cloudflare],
      historicoIa,
      geradoEm: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro no consumo de plataformas:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível consultar o consumo.' }, { status: 500 });
  }
}
