export type TipoPerfil = 'empresa' | 'pessoal';

export type CategoriaPerfil = {
  nome: string;
  descricao: string;
  exemplos: string;
};

export const TIPO_PERFIL_PADRAO: TipoPerfil = 'empresa';

export const CATEGORIAS_EMPRESA: CategoriaPerfil[] = [
  {
    nome: 'Amortização',
    descricao: 'Pagamentos de dívidas, empréstimos ou parcelamentos.',
    exemplos: 'Softwares comprados, patentes, financiamentos e acordos parcelados.',
  },
  {
    nome: 'Custos Variáveis',
    descricao: 'Despesas que variam conforme vendas ou produção.',
    exemplos: 'Embalagens, matéria-prima, frete, comissões e taxas sobre venda.',
  },
  {
    nome: 'Depreciação',
    descricao: 'Perda de valor de bens físicos ao longo do tempo.',
    exemplos: 'Máquinas, veículos, móveis, equipamentos e computadores.',
  },
  {
    nome: 'Despesas Financeiras',
    descricao: 'Juros, tarifas e custos ligados a dinheiro e bancos.',
    exemplos: 'Juros, tarifas bancárias, taxas, multas e variações de câmbio.',
  },
  {
    nome: 'Despesas Operacionais',
    descricao: 'Gastos necessários para manter a operação funcionando.',
    exemplos: 'Aluguel, água, luz, salários, manutenção, pró-labore e publicidade.',
  },
  {
    nome: 'Imposto sobre Lucro',
    descricao: 'Tributos calculados sobre o resultado ou lucro apurado.',
    exemplos: 'Imposto de renda, CSLL e demais impostos sobre lucro.',
  },
];

export const CATEGORIAS_PESSOAL: CategoriaPerfil[] = [
  {
    nome: 'Moradia',
    descricao: 'Gastos ligados à casa ou ao local onde você mora.',
    exemplos: 'Aluguel, condomínio, financiamento, manutenção e pequenos reparos.',
  },
  {
    nome: 'Custos de Vida',
    descricao: 'Despesas essenciais e recorrentes do dia a dia.',
    exemplos: 'Mercado, água, luz, internet, transporte, saúde e educação.',
  },
  {
    nome: 'Lazer e Consumo',
    descricao: 'Gastos pessoais não essenciais, consumo e experiências.',
    exemplos: 'Restaurantes, viagens, compras, assinaturas, presentes e entretenimento.',
  },
  {
    nome: 'Financeiro e Impostos',
    descricao: 'Custos financeiros, taxas, juros e obrigações tributárias.',
    exemplos: 'Tarifas bancárias, juros, cartão, seguros, impostos e multas.',
  },
  {
    nome: 'Investimentos',
    descricao: 'Valores destinados à construção de patrimônio ou reservas.',
    exemplos: 'Aplicações, reserva de emergência, previdência, consórcios e aportes.',
  },
];

export const CATEGORIAS_EXCLUSAO_EBITDA = [
  'Amortização',
  'Depreciação',
  'Despesas Financeiras',
  'Imposto sobre Lucro',
];

export function normalizarTipoPerfil(valor: unknown): TipoPerfil {
  return valor === 'pessoal' ? 'pessoal' : TIPO_PERFIL_PADRAO;
}

export function categoriasDoPerfil(tipoPerfil: unknown): CategoriaPerfil[] {
  return normalizarTipoPerfil(tipoPerfil) === 'pessoal'
    ? CATEGORIAS_PESSOAL
    : CATEGORIAS_EMPRESA;
}

export function nomesCategoriasDoPerfil(tipoPerfil: unknown): string[] {
  return categoriasDoPerfil(tipoPerfil).map((categoria) => categoria.nome);
}

export function rotuloTipoPerfil(tipoPerfil: unknown): string {
  return normalizarTipoPerfil(tipoPerfil) === 'pessoal' ? 'Pessoal' : 'Empresa';
}

export function rotuloNomePerfil(tipoPerfil: unknown): string {
  return normalizarTipoPerfil(tipoPerfil) === 'pessoal' ? 'Nome do perfil' : 'Nome da empresa';
}

export function placeholderNomePerfil(tipoPerfil: unknown): string {
  return normalizarTipoPerfil(tipoPerfil) === 'pessoal' ? 'Ex: Minha vida financeira' : 'Ex: Minha Empresa';
}
