// Tipos do estudo isolado "Recebimentos em Campo".
// Estrutura totalmente local, sem integração com o sistema principal.

export type Perfil = 'colaborador' | 'gestor' | 'administrador';
export type TipoCadastroEmpresa = 'cliente_direto' | 'local_agrupador';

export type FrequenciaRecebimento = 'semanal' | 'quinzenal' | 'mensal' | 'trimestral' | 'semestral' | 'anual';

export type ConfiguracaoRecorrencia = {
  /** 0 = domingo; usado pela cobrança semanal. */
  diasSemana: number[];
  /** Dia-base do mês. Para quinzenal, a segunda cobrança ocorre 15 dias depois. */
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
  complemento: string;
  responsavel: string;
  telefone: string;
  email: string;
  valorCombinado: number | null;
  frequenciaRecebimento: FrequenciaRecebimento | null;
  configuracaoRecorrencia: ConfiguracaoRecorrencia | null;
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
  complemento: string;
  shoppingGaleria: string;
  lojaSala: string;
  responsavel: string;
  valorCombinado: number;
  frequenciaRecebimento: FrequenciaRecebimento;
  configuracaoRecorrencia: ConfiguracaoRecorrencia;
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
  ativo: boolean;
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
