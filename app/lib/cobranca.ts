// ─────────────────────────────────────────────────────────────
// Cobrança — camada de DECISÃO de acesso (o "cérebro").
//
// Regra de ouro: enquanto COBRANCA_ATIVA = false, TUDO fica liberado
// para todo mundo. Nada muda no sistema. Só quando ligarmos a flag
// (depois de tudo pronto e testado) é que as regras passam a valer.
//
// Este arquivo é só lógica pura — não acessa banco nem telas.
// ─────────────────────────────────────────────────────────────

// 🔌 Chave de liga/desliga da versão paga. Manter FALSE até o go-live.
export const COBRANCA_ATIVA = false;

// Dias de trial do perfil empresa (contados da criação do perfil).
export const TRIAL_DIAS = 7;

// Data de lançamento da cobrança. Perfis criados ANTES desta data mantêm
// acesso (clientes atuais / avaliadores). Deixamos no futuro por enquanto,
// então hoje TODOS são tratados como "clientes atuais" (nada muda).
// No go-live, ajustamos para a data real de lançamento.
export const DATA_LANCAMENTO = '2099-01-01T00:00:00Z';

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
};

// Recursos premium — bloqueados no plano grátis do perfil Pessoal.
// (No perfil Empresa o acesso é tudo-ou-nada, tratado pelo paywall.)
export type Recurso =
  | 'ava'                // assistente IA
  | 'exportacao'         // backup / exportar Excel
  | 'analises'           // aba Relatório + Gráficos
  | 'busca_lancamentos'  // botão pesquisar nos lançamentos
  | 'multiplos_perfis'   // criar/trocar entre perfis (grátis = 1 só)
  | 'notificacoes'
  | 'organizar_atalhos'
  | 'usuarios_internos'  // criar usuário / equipe
  | 'ponto';             // módulo de ponto (empresa)

// A assinatura está "vigente" (pagando, em trial válido, ou cortesia ativa)?
export function assinaturaVigente(e: EstadoAcesso, agora: Date = new Date()): boolean {
  if (e.status === 'ativa') return true;
  if (e.status === 'cortesia') {
    return !e.validoAte || new Date(e.validoAte) > agora; // vitalícia ou dentro do prazo
  }
  if (e.status === 'trial') {
    return !!e.trialFim && new Date(e.trialFim) > agora;
  }
  return false; // expirada, cancelada, inadimplente
}

// Perfil EMPRESA sem acesso vigente → mostrar o paywall (bloqueio total).
export function precisaPaywallEmpresa(e: EstadoAcesso | null, agora: Date = new Date()): boolean {
  if (!COBRANCA_ATIVA) return false;          // flag desligada → nunca bloqueia
  if (!e) return false;                        // sem info → não bloqueia (fail-open)
  return e.tipoPerfil === 'empresa' && !assinaturaVigente(e, agora);
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
