import { NextResponse } from 'next/server';
import { exigirAdmin } from '../../lib/admin-server';

export const runtime = 'nodejs';

// ─────────────────────────────────────────────────────────────
// /api/admin-consumo — uso x limite das plataformas (Supabase,
// Vercel e GitHub) para o painel /admin.
//
// Tokens (variáveis de ambiente, todas opcionais — sem elas o
// painel mostra o que dá e instruções do que falta):
//   VERCEL_TOKEN   → token de acesso (vercel.com/account/tokens)
//   VERCEL_TEAM_ID → id do time (opcional; conta pessoal = vazio)
//   GITHUB_TOKEN   → PAT clássico (escopos: repo + user)
//   GITHUB_REPO    → ex.: jefposan/avantalab
//
// O Supabase não precisa de token novo: usa a service role + a
// função SQL admin_metricas_uso() (SQL devolvido no aviso caso
// ainda não exista no banco).
// ─────────────────────────────────────────────────────────────

// Limites do PLANO GRATUITO de cada plataforma. Se fizer upgrade,
// ajuste aqui para o painel comparar com o novo teto.
const LIMITES = {
  supabase: {
    dbBytes: 500 * 1024 * 1024,       // 500 MB
    storageBytes: 1024 * 1024 * 1024, // 1 GB
    usuariosMau: 50000,               // 50 mil usuários ativos/mês
    egressGb: 5,                      // 5 GB/mês (não exposto via API)
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
  formato: 'bytes' | 'numero' | 'minutos' | 'reais';
  detalhe?: string;
};

type Plataforma = {
  nome: string;
  configurado: boolean;
  itens: Item[];
  avisos: string[];
  link: string; // painel oficial para conferência
};

async function consumoSupabase(db: Awaited<ReturnType<typeof exigirAdmin>>['db']): Promise<Plataforma> {
  const plataforma: Plataforma = {
    nome: 'Supabase',
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
      { nome: 'Banco de dados', usado: Number(m.db_bytes) || 0, limite: LIMITES.supabase.dbBytes, formato: 'bytes' },
      { nome: 'Storage (arquivos)', usado: Number(m.storage_bytes) || 0, limite: LIMITES.supabase.storageBytes, formato: 'bytes' },
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

export async function GET(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 401 });

    const [supabase, vercel, github] = await Promise.all([
      consumoSupabase(db),
      consumoVercel(),
      consumoGithub(),
    ]);
    return NextResponse.json({ erro: false, plataformas: [supabase, vercel, github], geradoEm: new Date().toISOString() });
  } catch (error) {
    console.error('Erro no consumo de plataformas:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível consultar o consumo.' }, { status: 500 });
  }
}
