import { VALOR_MODULO_AVULSO_MENSAL } from './planos-comerciais';

export type SuperficieModulo = 'web' | 'pwa' | 'android' | 'ios';
export type ModoNavegacaoModulo = 'integrado' | 'pagina_total';
export type PerfilModulo = 'gestor_master' | 'administrador' | 'operador_completo' | 'operador_simples';

export type RegistroModulo = {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  ordem: number;
  superficies: readonly SuperficieModulo[];
  navegacao: {
    modo: ModoNavegacaoModulo;
    rotuloMenu: string;
    rota?: string;
    retorno?: string;
  };
  comercial: {
    precoMensal: number;
    vendavelNoBusiness: true;
    incluidoNoBusinessPro: true;
  };
  dados: {
    escopo: 'empresa';
    preservarAoRemover: true;
  };
  permissoes: Record<PerfilModulo, 'administrar' | 'operar' | 'visualizar'>;
};

const permissoesOperacionais: RegistroModulo['permissoes'] = {
  gestor_master: 'administrar',
  administrador: 'administrar',
  operador_completo: 'operar',
  operador_simples: 'visualizar',
};

export const REGISTRO_MODULOS: readonly RegistroModulo[] = [
  {
    id: 'ponto',
    nome: 'Controle de Ponto',
    descricao: 'Registro de entrada e saída dos colaboradores.',
    icone: 'relogio',
    ordem: 1,
    superficies: ['web', 'pwa', 'android', 'ios'],
    navegacao: { modo: 'integrado', rotuloMenu: 'Ponto' },
    comercial: { precoMensal: VALOR_MODULO_AVULSO_MENSAL, vendavelNoBusiness: true, incluidoNoBusinessPro: true },
    dados: { escopo: 'empresa', preservarAoRemover: true },
    permissoes: permissoesOperacionais,
  },
  {
    id: 'vendas_mobile',
    nome: 'Vendas Mobile',
    descricao: 'Novidades e materiais de divulgação para a equipe comercial.',
    icone: 'vendas',
    ordem: 2,
    superficies: ['web', 'pwa', 'android', 'ios'],
    navegacao: { modo: 'integrado', rotuloMenu: 'Vendas Mobile' },
    comercial: { precoMensal: VALOR_MODULO_AVULSO_MENSAL, vendavelNoBusiness: true, incluidoNoBusinessPro: true },
    dados: { escopo: 'empresa', preservarAoRemover: true },
    permissoes: permissoesOperacionais,
  },
  {
    id: 'recebimentos_presencial',
    nome: 'Recebimentos Presenciais',
    descricao: 'Cobrança em dinheiro em campo, com conferência e baixa pelo gestor.',
    icone: 'recebimentos',
    ordem: 3,
    superficies: ['web', 'pwa', 'android', 'ios'],
    navegacao: { modo: 'integrado', rotuloMenu: 'Recebimentos' },
    comercial: { precoMensal: VALOR_MODULO_AVULSO_MENSAL, vendavelNoBusiness: true, incluidoNoBusinessPro: true },
    dados: { escopo: 'empresa', preservarAoRemover: true },
    permissoes: permissoesOperacionais,
  },
  {
    id: 'projetos',
    nome: 'Projetos',
    descricao: 'Planejamento visual de projetos, etapas, tarefas e responsáveis.',
    icone: 'projetos',
    ordem: 4,
    superficies: ['web'],
    navegacao: { modo: 'pagina_total', rotuloMenu: 'Projetos', rota: '/projetos', retorno: '/gestao' },
    comercial: { precoMensal: VALOR_MODULO_AVULSO_MENSAL, vendavelNoBusiness: true, incluidoNoBusinessPro: true },
    dados: { escopo: 'empresa', preservarAoRemover: true },
    permissoes: permissoesOperacionais,
  },
  {
    id: 'custos',
    nome: 'Custos e Precificação',
    descricao: 'Cadastro de produtos, composição de custos, histórico e simulações de preço.',
    icone: 'custos',
    ordem: 5,
    superficies: ['web'],
    navegacao: { modo: 'pagina_total', rotuloMenu: 'Custos e precificação', rota: '/custos', retorno: '/gestao' },
    comercial: { precoMensal: VALOR_MODULO_AVULSO_MENSAL, vendavelNoBusiness: true, incluidoNoBusinessPro: true },
    dados: { escopo: 'empresa', preservarAoRemover: true },
    permissoes: permissoesOperacionais,
  },
] as const;

export function obterRegistroModulo(id: string) {
  return REGISTRO_MODULOS.find((modulo) => modulo.id === id) ?? null;
}

export function modulosPaginaTotalAtivos(idsAtivos: readonly string[]) {
  const ativos = new Set(idsAtivos);
  return REGISTRO_MODULOS.filter((modulo) =>
    ativos.has(modulo.id)
    && modulo.superficies.includes('web')
    && modulo.navegacao.modo === 'pagina_total'
    && Boolean(modulo.navegacao.rota)
  );
}
