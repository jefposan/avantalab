// ─────────────────────────────────────────────────────────────
// Cobrança — camada de DECISÃO de acesso (o "cérebro").
//
// Regra de ouro: enquanto COBRANCA_ATIVA = false, TUDO fica liberado
// para todo mundo. Nada muda no sistema. Só quando ligarmos a flag
// (depois de tudo pronto e testado) é que as regras passam a valer.
//
// Este arquivo é só lógica pura — não acessa banco nem telas.
// ─────────────────────────────────────────────────────────────

// 🔌 Chave de liga/desliga da versão paga, controlada por ambiente.
// Sem a variável definida → DESLIGADA (produção segue igual).
// Para testar no preview: definir NEXT_PUBLIC_COBRANCA_ATIVA=true lá.
export const COBRANCA_ATIVA = process.env.NEXT_PUBLIC_COBRANCA_ATIVA === 'true';

// Dias de trial do perfil empresa (contados da criação do perfil).
export const TRIAL_DIAS = 7;

// Data de lançamento da cobrança. Perfis criados ANTES desta data mantêm
// acesso (clientes atuais / avaliadores). Padrão no futuro: hoje TODOS são
// tratados como "clientes atuais" (nada muda). No go-live, definimos a data
// real via NEXT_PUBLIC_COBRANCA_LANCAMENTO.
export const DATA_LANCAMENTO = process.env.NEXT_PUBLIC_COBRANCA_LANCAMENTO || '2099-01-01T00:00:00Z';

export type TipoPerfil = 'empresa' | 'pessoal';

// Planos pagos e preços (R$). Fonte única da verdade.
export type PlanoPago = 'empresa' | 'pessoal_premium';
export type Ciclo = 'mensal' | 'anual';
export const PRECOS: Record<PlanoPago, Record<Ciclo, number>> = {
  empresa: { mensal: 34.9, anual: 348.0 },
  pessoal_premium: { mensal: 9.9, anual: 99.0 },
};

export type StatusAssinatura =
  | 'trial'        // empresa nos 7 dias de teste
  | 'ativa'        // assinatura paga em dia
  | 'expirada'     // trial venceu ou pagamento parou
  | 'cancelada'
  | 'cortesia'     // liberado por cupom (Premium Pessoal)
  | 'inadimplente';

// Estado de cobrança de um perfil (o que lemos da tabela `assinaturas`).
export type EstadoAcesso = {
  tipoPerfil: TipoPerfil;
  status: StatusAssinatura;
  validoAte: string | null;   // até quando o acesso vale (nulo = sem prazo)
  trialFim: string | null;    // fim do trial (perfil empresa)
  plano: string | null;       // ex.: 'empresa', 'pessoal_premium'
  ciclo: string | null;       // 'mensal' | 'anual'
};

export type DadosCobrancaAssinatura = {
  nome: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
};

// Rótulo amigável do status, para exibir ao usuário.
export function rotuloStatusAssinatura(status: StatusAssinatura): string {
  const mapa: Record<StatusAssinatura, string> = {
    trial: 'Período de teste',
    ativa: 'Ativa',
    expirada: 'Vencida',
    cancelada: 'Cancelada',
    cortesia: 'Cortesia',
    inadimplente: 'Pagamento pendente',
  };
  return mapa[status] || status;
}

// Rótulo amigável do plano + ciclo.
export function rotuloPlano(plano: string | null, ciclo: string | null): string {
  if (!plano) return '—';
  const nome = plano === 'pessoal_premium' ? 'Premium Pessoal' : 'Empresa';
  const cic = ciclo === 'anual' ? 'Anual' : ciclo === 'mensal' ? 'Mensal' : '';
  return cic ? `${nome} · ${cic}` : nome;
}

// Recursos premium — bloqueados no plano grátis do perfil Pessoal.
// (No perfil Empresa o acesso é tudo-ou-nada, tratado pelo paywall.)
export type Recurso =
  | 'ava'                // assistente IA
  | 'exportacao'         // backup / exportar Excel
  | 'analises'           // aba Relatório + Gráficos
  | 'busca_lancamentos'  // botão pesquisar nos lançamentos
  | 'multiplos_perfis'   // criar/trocar entre perfis (grátis = 1 só)
  | 'notificacoes'
  | 'agenda'
  | 'vendas_mobile'
  | 'organizar_atalhos'
  | 'organizar_dashboard' // reordenar cards do dashboard (kanban)
  | 'usuarios_internos'  // criar usuário / equipe
  | 'ponto';             // módulo de ponto (empresa)

// Catálogo dos recursos premium do Pessoal — fonte única para as telas de
// upgrade (web e mobile). A ordem é a ordem de exibição.
export const RECURSOS_PREMIUM_PESSOAL: { recurso: Recurso; icone: string; titulo: string; descricao: string }[] = [
  { recurso: 'ava', icone: '🤖', titulo: 'Ava (IA)', descricao: 'Assistente que analisa seus resultados e tira dúvidas.' },
  { recurso: 'analises', icone: '📊', titulo: 'Análises avançadas', descricao: 'Aba Relatório e Gráficos completos.' },
  { recurso: 'exportacao', icone: '💾', titulo: 'Backup e exportação', descricao: 'Exporte e restaure seus dados em Excel.' },
  { recurso: 'busca_lancamentos', icone: '🔎', titulo: 'Busca nos lançamentos', descricao: 'Encontre qualquer lançamento na hora.' },
  { recurso: 'multiplos_perfis', icone: '👥', titulo: 'Múltiplos perfis pessoais', descricao: 'Crie mais perfis pessoais (grátis = 1). Criar perfil empresa continua livre.' },
  { recurso: 'notificacoes', icone: '🔔', titulo: 'Notificações', descricao: 'Lembretes e avisos de pagamentos.' },
  { recurso: 'agenda', icone: '📅', titulo: 'Agenda', descricao: 'Organize lembretes, compromissos e lançamentos futuros.' },
  { recurso: 'vendas_mobile', icone: '🛍️', titulo: 'Vendas Mobile', descricao: 'Acesse clientes, produtos, pedidos e pagamentos integrados à Gestão.' },
  { recurso: 'organizar_dashboard', icone: '🧩', titulo: 'Organizar dashboard', descricao: 'Reordene os cards do seu jeito.' },
  { recurso: 'organizar_atalhos', icone: '↔️', titulo: 'Organizar atalhos', descricao: 'Personalize os atalhos do app.' },
  { recurso: 'usuarios_internos', icone: '🧑‍💼', titulo: 'Usuários internos', descricao: 'Convide outras pessoas para o perfil.' },
];

// Rótulo curto de um recurso premium (para toasts/selos).
export function tituloRecursoPremium(recurso: Recurso): string {
  const item = RECURSOS_PREMIUM_PESSOAL.find((r) => r.recurso === recurso);
  return item ? item.titulo : 'Recurso premium';
}

// A assinatura está "vigente" (pagando, em trial válido, ou cortesia ativa)?
export function assinaturaVigente(e: EstadoAcesso, agora: Date = new Date()): boolean {
  if (e.status === 'ativa') return true;
  if (e.status === 'cortesia') {
    return !e.validoAte || new Date(e.validoAte) > agora; // vitalícia ou dentro do prazo
  }
  if (e.status === 'trial') {
    return !!e.trialFim && new Date(e.trialFim) > agora;
  }
  // Inadimplência: três dias de carência. Cancelamento: acesso preservado até
  // o fim do período que já foi pago.
  if (e.status === 'inadimplente' || e.status === 'cancelada') {
    return !!e.validoAte && new Date(e.validoAte) > agora;
  }
  return false; // expirada, cancelada, inadimplente
}

export function emCarencia(e: EstadoAcesso | null, agora: Date = new Date()): boolean {
  return !!e && e.status === 'inadimplente' && assinaturaVigente(e, agora);
}

export function cancelamentoProgramado(e: EstadoAcesso | null, agora: Date = new Date()): boolean {
  return !!e && e.status === 'cancelada' && assinaturaVigente(e, agora);
}

// Perfil EMPRESA sem acesso vigente → mostrar o paywall (bloqueio total).
export function precisaPaywallEmpresa(e: EstadoAcesso | null, agora: Date = new Date()): boolean {
  if (!COBRANCA_ATIVA) return false;          // flag desligada → nunca bloqueia
  if (!e) return false;                        // sem info → não bloqueia (fail-open)
  return e.tipoPerfil === 'empresa' && !assinaturaVigente(e, agora);
}

// A Gestão Web é um benefício do Premium Pessoal. O plano gratuito continua
// disponível no Gestão Mobile; no Web, o perfil pessoal sem assinatura ou
// cortesia vigente é direcionado para a página de assinatura.
export function precisaPaywallWebPessoal(e: EstadoAcesso | null, agora: Date = new Date()): boolean {
  if (!COBRANCA_ATIVA) return false;
  if (!e) return false; // sem informação confiável, preserva o acesso
  return e.tipoPerfil === 'pessoal' && !assinaturaVigente(e, agora);
}

// Perfil PESSOAL grátis tentando usar um recurso premium → mostrar o modal
// de upgrade "Premium Pessoal" (não bloqueia o núcleo, só o recurso).
export function precisaUpgradePessoal(
  recurso: Recurso,
  e: EstadoAcesso | null,
  agora: Date = new Date()
): boolean {
  if (!COBRANCA_ATIVA || !e) return false; // flag off / sem info → não bloqueia
  return e.tipoPerfil === 'pessoal' && !podeUsar(recurso, e, agora);
}

// Pode usar um recurso premium? (usado principalmente no perfil Pessoal)
export function podeUsar(
  recurso: Recurso,
  e: EstadoAcesso | null,
  agora: Date = new Date()
): boolean {
  if (!COBRANCA_ATIVA) return true;            // flag desligada → tudo liberado
  if (!e) return true;                          // sem info → não bloqueia (fail-open)

  // Empresa é tudo-ou-nada: se está vigente, tudo liberado; se não, o paywall
  // (precisaPaywallEmpresa) já bloqueou a tela inteira antes de chegar aqui.
  if (e.tipoPerfil === 'empresa') return assinaturaVigente(e, agora);

  // Pessoal: o núcleo é sempre livre (nem chama esta função). Os recursos
  // desta lista são premium e exigem assinatura/cortesia vigente.
  return assinaturaVigente(e, agora);
}
