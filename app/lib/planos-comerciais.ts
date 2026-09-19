export type CicloComercial = 'mensal' | 'anual';
export type PlanoComercial = 'free' | 'pessoal_premium' | 'business' | 'business_pro' | 'business_premium';

export type LimitesPlano = {
  usuarios: number;
  /** Limite de perfis pessoais quando o plano permite esse tipo. */
  perfis: number;
  /**
   * Limite de empresas que compartilham a assinatura empresarial, incluindo
   * o perfil que é origem da assinatura. `null` é usado somente para planos
   * que não administram perfis empresariais.
   */
  perfisEmpresa: number | null;
  tiposDePerfilPermitidos: Array<'pessoal' | 'empresa'>;
  funcionarios: number | null;
  centrosDeCustoAtivos: boolean;
  permiteWeb: boolean;
  permiteSessoesSimultaneasDoMesmoUsuario: boolean;
  incluiTodosModulos: boolean;
  permiteModulosAvulsos: boolean;
  temTrial: boolean;
};

export type PlanoComercialDefinicao = {
  id: PlanoComercial;
  nome: string;
  publico: 'pessoal' | 'empresa';
  precos: Partial<Record<CicloComercial, number>>;
  limites: LimitesPlano;
};

export const VALOR_MODULO_AVULSO_MENSAL = 14.9;

export const PLANOS_COMERCIAIS: Record<PlanoComercial, PlanoComercialDefinicao> = {
  free: {
    id: 'free',
    nome: 'Free',
    publico: 'pessoal',
    precos: {},
    limites: {
      usuarios: 1,
      perfis: 1,
      perfisEmpresa: null,
      tiposDePerfilPermitidos: ['pessoal'],
      funcionarios: 0,
      centrosDeCustoAtivos: false,
      permiteWeb: false,
      permiteSessoesSimultaneasDoMesmoUsuario: false,
      incluiTodosModulos: false,
      permiteModulosAvulsos: false,
      temTrial: false,
    },
  },
  pessoal_premium: {
    id: 'pessoal_premium',
    nome: 'Pessoal Premium',
    publico: 'pessoal',
    precos: { mensal: 9.9, anual: 99.9 },
    limites: {
      usuarios: 2,
      perfis: 3,
      perfisEmpresa: null,
      tiposDePerfilPermitidos: ['pessoal'],
      funcionarios: 0,
      centrosDeCustoAtivos: false,
      permiteWeb: true,
      permiteSessoesSimultaneasDoMesmoUsuario: false,
      incluiTodosModulos: false,
      permiteModulosAvulsos: false,
      temTrial: false,
    },
  },
  business: {
    id: 'business',
    // O identificador histórico `business` é preservado em assinaturas e
    // integrações. A nomenclatura comercial passa a ser Business Básico.
    nome: 'Business Básico',
    publico: 'empresa',
    precos: { mensal: 34.9, anual: 249.9 },
    limites: {
      usuarios: 1,
      perfis: 1,
      perfisEmpresa: 1,
      tiposDePerfilPermitidos: ['empresa'],
      funcionarios: 10,
      centrosDeCustoAtivos: false,
      permiteWeb: true,
      permiteSessoesSimultaneasDoMesmoUsuario: false,
      incluiTodosModulos: false,
      permiteModulosAvulsos: true,
      temTrial: false,
    },
  },
  business_pro: {
    id: 'business_pro',
    nome: 'Business Pro',
    publico: 'empresa',
    precos: { mensal: 49.9, anual: 359.9 },
    limites: {
      usuarios: 3,
      perfis: 3,
      perfisEmpresa: 3,
      tiposDePerfilPermitidos: ['empresa'],
      funcionarios: 30,
      centrosDeCustoAtivos: true,
      permiteWeb: true,
      permiteSessoesSimultaneasDoMesmoUsuario: true,
      incluiTodosModulos: true,
      permiteModulosAvulsos: false,
      temTrial: true,
    },
  },
  business_premium: {
    id: 'business_premium',
    nome: 'Business Premium',
    publico: 'empresa',
    // R$ 99,90 × 12 com desconto comercial de aproximadamente 40%.
    precos: { mensal: 99.9, anual: 719.9 },
    limites: {
      usuarios: 10,
      perfis: 10,
      perfisEmpresa: 10,
      tiposDePerfilPermitidos: ['empresa'],
      funcionarios: null,
      centrosDeCustoAtivos: true,
      permiteWeb: true,
      permiteSessoesSimultaneasDoMesmoUsuario: true,
      incluiTodosModulos: true,
      permiteModulosAvulsos: false,
      temTrial: false,
    },
  },
};

export function formatarPrecoComercial(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function normalizarPlanoComercial(plano: string | null | undefined): PlanoComercial | null {
  if (plano === 'empresa') return 'business';
  return plano && plano in PLANOS_COMERCIAIS ? plano as PlanoComercial : null;
}
