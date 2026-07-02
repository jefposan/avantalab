export type TipoPerfil = 'empresa' | 'pessoal';

export type CategoriaPerfil = {
  nome: string;
  descricao: string;
  exemplos: string;
};

export const TIPO_PERFIL_PADRAO: TipoPerfil = 'empresa';

export function formatarNomeCategoria(valor: unknown): string {
  const texto = String(valor ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
  return texto ? texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1) : '';
}

export const CATEGORIAS_EMPRESA: CategoriaPerfil[] = [
  {
    nome: 'Amortização',
    descricao: 'Pagamentos de dívidas, empréstimos ou parcelamentos.',
    exemplos: 'Softwares comprados, patentes, financiamentos e acordos parcelados.',
  },
  {
    nome: 'Custos variáveis',
    descricao: 'Despesas que variam conforme vendas ou produção.',
    exemplos: 'Embalagens, matéria-prima, frete, comissões e taxas sobre venda.',
  },
  {
    nome: 'Depreciação',
    descricao: 'Perda de valor de bens físicos ao longo do tempo.',
    exemplos: 'Máquinas, veículos, móveis, equipamentos e computadores.',
  },
  {
    nome: 'Despesas financeiras',
    descricao: 'Juros, tarifas e custos ligados a dinheiro e bancos.',
    exemplos: 'Juros, tarifas bancárias, taxas, multas e variações de câmbio.',
  },
  {
    nome: 'Despesas operacionais',
    descricao: 'Gastos necessários para manter a operação funcionando.',
    exemplos: 'Aluguel, água, luz, salários, manutenção, pró-labore e publicidade.',
  },
  {
    nome: 'Imposto sobre lucro',
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
    nome: 'Custos de vida',
    descricao: 'Despesas essenciais e recorrentes do dia a dia.',
    exemplos: 'Mercado, água, luz, internet, transporte, saúde e educação.',
  },
  {
    nome: 'Lazer e consumo',
    descricao: 'Gastos pessoais não essenciais, consumo e experiências.',
    exemplos: 'Restaurantes, viagens, compras, assinaturas, presentes e entretenimento.',
  },
  {
    nome: 'Financeiro e impostos',
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
  'Despesas financeiras',
  'Imposto sobre lucro',
];

export const DESPESAS_PADRAO_EMPRESA = [
  { nome: 'Aluguel', categoria: 'Despesas operacionais' },
  { nome: 'Água', categoria: 'Despesas operacionais' },
  { nome: 'Energia', categoria: 'Despesas operacionais' },
  { nome: 'Internet', categoria: 'Despesas operacionais' },
  { nome: 'Telefone', categoria: 'Despesas operacionais' },
  { nome: 'Folha de pagamento', categoria: 'Despesas operacionais' },
  { nome: 'Pró-labore', categoria: 'Despesas operacionais' },
  { nome: 'Contabilidade', categoria: 'Despesas operacionais' },
  { nome: 'Manutenção', categoria: 'Despesas operacionais' },
  { nome: 'Publicidade', categoria: 'Despesas operacionais' },
  { nome: 'Matéria-prima', categoria: 'Custos variáveis' },
  { nome: 'Embalagens', categoria: 'Custos variáveis' },
  { nome: 'Fretes', categoria: 'Custos variáveis' },
  { nome: 'Comissões', categoria: 'Custos variáveis' },
  { nome: 'Tarifas bancárias', categoria: 'Despesas financeiras' },
  { nome: 'Juros', categoria: 'Despesas financeiras' },
  { nome: 'Impostos', categoria: 'Imposto sobre lucro' },
];

export const DESPESAS_PADRAO_PESSOAL = [
  { nome: 'Aluguel', categoria: 'Moradia' },
  { nome: 'Parcela casa', categoria: 'Moradia' },
  { nome: 'Condomínio', categoria: 'Moradia' },
  { nome: 'Água', categoria: 'Moradia' },
  { nome: 'Energia', categoria: 'Moradia' },
  { nome: 'Gás', categoria: 'Moradia' },
  { nome: 'Internet', categoria: 'Moradia' },
  { nome: 'Itens para casa', categoria: 'Moradia' },
  { nome: 'Manutenção casa', categoria: 'Moradia' },
  { nome: 'Mercado', categoria: 'Custos de vida' },
  { nome: 'Saúde', categoria: 'Custos de vida' },
  { nome: 'Farmácia', categoria: 'Custos de vida' },
  { nome: 'Educação', categoria: 'Custos de vida' },
  { nome: 'Celular', categoria: 'Custos de vida' },
  { nome: 'Combustível', categoria: 'Custos de vida' },
  { nome: 'Transporte', categoria: 'Custos de vida' },
  { nome: 'Gastos com veículo', categoria: 'Custos de vida' },
  { nome: 'Parcela veículo', categoria: 'Custos de vida' },
  { nome: 'Alimentação', categoria: 'Lazer e consumo' },
  { nome: 'Passeios', categoria: 'Lazer e consumo' },
  { nome: 'Assinaturas', categoria: 'Lazer e consumo' },
  { nome: 'Vestuário', categoria: 'Lazer e consumo' },
  { nome: 'Viagem', categoria: 'Lazer e consumo' },
  { nome: 'Taxas bancárias', categoria: 'Financeiro e impostos' },
  { nome: 'Cartão de crédito', categoria: 'Financeiro e impostos' },
  { nome: 'Seguro', categoria: 'Financeiro e impostos' },
  { nome: 'IPVA', categoria: 'Financeiro e impostos' },
  { nome: 'IPTU', categoria: 'Financeiro e impostos' },
  { nome: 'Investimento', categoria: 'Investimentos' },
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
