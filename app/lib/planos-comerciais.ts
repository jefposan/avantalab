export type CicloComercial = 'mensal' | 'anual';
export type PlanoComercial = 'free' | 'pessoal_premium' | 'business' | 'business_pro';

export type LimitesPlano = {
  usuarios: number;
  /** Limite total de perfis; o tipo permitido é definido por `tiposDePerfilPermitidos`. */
  perfis: number;
  tiposDePerfilPermitidos: Array<'pessoal' | 'empresa'>;
  funcionarios: number | null;
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
      tiposDePerfilPermitidos: ['pessoal'],
      funcionarios: 0,
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
      tiposDePerfilPermitidos: ['pessoal'],
      funcionarios: 0,
      permiteWeb: true,
      permiteSessoesSimultaneasDoMesmoUsuario: false,
      incluiTodosModulos: false,
      permiteModulosAvulsos: false,
      temTrial: false,
    },
  },
  business: {
    id: 'business',
    nome: 'Business',
    publico: 'empresa',
    precos: { mensal: 34.9, anual: 249.9 },
    limites: {
      usuarios: 3,
      perfis: 3,
      tiposDePerfilPermitidos: ['pessoal', 'empresa'],
      funcionarios: null,
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
      usuarios: 10,
      perfis: 10,
      tiposDePerfilPermitidos: ['pessoal', 'empresa'],
      funcionarios: null,
      permiteWeb: true,
      permiteSessoesSimultaneasDoMesmoUsuario: true,
      incluiTodosModulos: true,
      permiteModulosAvulsos: false,
      temTrial: true,
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
