// Tipos do estudo isolado "Recebimentos em Campo".
// Estrutura totalmente local, sem integração com o sistema principal.

export type Perfil = 'colaborador' | 'gestor' | 'administrador';
export type TipoCadastroEmpresa = 'cliente_direto' | 'local_agrupador';
export type TipoNivelEndereco = 'andar' | 'piso' | 'subsolo' | 'terreo' | 'mezanino' | 'outro';

/** Periodicidade do serviço contratado, independente da cobrança mensal. */
export type FrequenciaExecucaoServico = 'semanal' | 'quinzenal' | 'mensal' | 'trimestral' | 'semestral' | 'anual';

export type ConfiguracaoExecucaoServico = {
  /** 0 = domingo; usado pela execução semanal. */
  diasSemana: number[];
  /** Dia-base do mês. Para quinzenal, a segunda execução ocorre 15 dias depois. */
  diaMes: number | null;
  /** Mês inicial (1–12), usado por trimestral, semestral e anual. */
  mesInicio: number | null;
};

export type SituacaoRecebimento =
  | 'previsto'
  | 'aguardando_conferencia'
  | 'baixado'
  | 'recebido_a_menor'
  | 'recebido_a_maior'
  | 'em_atraso'
  | 'devolvido_para_correcao';

export type FormaPagamentoRecebimento =
  | 'dinheiro'
  | 'pix'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'boleto';

export const FORMAS_PAGAMENTO_RECEBIMENTO: Array<[FormaPagamentoRecebimento, string]> = [
  ['boleto', 'Boleto'],
  ['cartao_credito', 'Cartão de crédito'],
  ['cartao_debito', 'Cartão de débito'],
  ['dinheiro', 'Dinheiro'],
  ['pix', 'Pix'],
];

export type Empresa = {
  id: string;
  /** Cliente direto recebe cobrança própria; local agrupador apenas organiza clientes. */
  tipoCadastro: TipoCadastroEmpresa;
  nome: string;
  endereco: string;
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  numero: string;
  tipoNivel: TipoNivelEndereco | null;
  identificacaoNivel: string;
  complemento: string;
  responsavel: string;
  telefone: string;
  email: string;
  valorCombinado: number | null;
  /** Cobranças são sempre mensais e usam este dia (1–31). */
  diaVencimento: number | null;
  frequenciaExecucaoServico: FrequenciaExecucaoServico | null;
  configuracaoExecucaoServico: ConfiguracaoExecucaoServico | null;
  ativo: boolean;
};

export type Subempresa = {
  id: string;
  empresaId: string;
  nome: string;
  // Localização / endereço
  endereco: string;
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  numero: string;
  tipoNivel: TipoNivelEndereco | null;
  identificacaoNivel: string;
  complemento: string;
  shoppingGaleria: string;
  lojaSala: string;
  responsavel: string;
  /** Nulo enquanto o valor contratado ainda não foi definido. */
  valorCombinado: number | null;
  /** Cobranças são sempre mensais e usam este dia (1–31). */
  diaVencimento: number;
  /** Quando ativo, usa a programação do local agrupador. */
  herdaExecucaoServico: boolean;
  frequenciaExecucaoServico: FrequenciaExecucaoServico;
  configuracaoExecucaoServico: ConfiguracaoExecucaoServico;
  ativo: boolean;
};

export type Colaborador = {
  id: string;
  nome: string;
  celular: string;
  email: string;
  // O CPF é o login do colaborador no PWA (/recebimentos/colaborador).
  // Guardado apenas com dígitos; exibido com máscara na UI.
  cpf: string;
  senha: string;
  /** Define as superfícies que o colaborador pode usar no PWA. */
  podeRecebimentos: boolean;
  podeServicos: boolean;
  /** Permite criar agendamentos manuais de serviço no PWA. */
  podeAgendamentos: boolean;
  ativo: boolean;
};

export type AvaliacaoServico = 'bom' | 'regular';
export type SituacaoServico = 'pendente' | 'realizado' | 'atrasado';
export type TipoServico = 'rotina' | 'interna' | 'revisao' | 'extra';

export const TIPOS_AGENDAMENTO_SERVICO: Array<[Exclude<TipoServico, 'rotina'>, string]> = [
  ['interna', 'Interna'],
  ['revisao', 'Revisão'],
  ['extra', 'Extra'],
];

/** Uma execução programada ou realizada, independente de qualquer cobrança. */
export type Servico = {
  id: string;
  empresaId: string;
  subempresaId: string | null;
  dataProgramada: string;
  situacao: SituacaoServico;
  /** Rotina vem da frequência contratada; os demais são agendamentos manuais. */
  tipoServico: TipoServico;
  colaboradorId: string | null;
  clienteNome: string | null;
  /** PNG protegido no Storage; assinaturas antigas permanecem no campo legado. */
  assinaturaArquivoPath: string | null;
  assinatura: string | null;
  avaliacao: AvaliacaoServico | null;
  observacaoCliente: string | null;
  realizadoEm: string | null;
  avisoConcluidoEm: string | null;
};

export type Recebimento = {
  id: string;
  empresaId: string;
  /** Nulo quando a cobrança pertence a um cliente direto. */
  subempresaId: string | null;
  // Cobrança
  vencimento: string; // ISO date (YYYY-MM-DD)
  valorCombinado: number;
  // Registro do colaborador (o "valor registrado" — distinto do valor baixado)
  valorRecebido: number | null;
  colaboradorId: string | null;
  recebidoEm: string | null; // ISO datetime
  observacao: string | null;
  formaPagamento?: FormaPagamentoRecebimento | null;
  temComprovante?: boolean;
  situacao: SituacaoRecebimento;
  // Baixa (só após confirmação de gestor/administrador)
  baixadoPor: string | null; // nome do gestor/admin
  baixadoEm: string | null; // ISO datetime
};

export type DiferencaTipo = 'exato' | 'menor' | 'maior';

export type LabelSituacao = {
  texto: string;
  cor: string; // cor do texto/badge
  fundo: string; // cor de fundo do badge
};
