export type EmpresaConsultada = {
  documento: string;
  tipoDocumento: 'CNPJ';
  razaoSocial: string | null;
  nomeFantasia: string | null;
  situacaoCadastral: string | null;
  dataSituacaoCadastral: string | null;
  motivoSituacaoCadastral: string | null;
  dataAbertura: string | null;
  naturezaJuridica: {
    codigo: string | null;
    descricao: string | null;
  } | null;
  porte: string | null;
  capitalSocial: number | null;
  simples: {
    optante: boolean | null;
    dataOpcao: string | null;
    dataExclusao: string | null;
  } | null;
  mei: {
    optante: boolean | null;
    dataOpcao: string | null;
    dataExclusao: string | null;
  } | null;
  endereco: {
    tipoLogradouro: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cep: string | null;
    cidade: string | null;
    uf: string | null;
    pais: string | null;
  };
  contatos: {
    telefones: Array<{
      ddd: string | null;
      numero: string | null;
    }>;
    emails: Array<{
      endereco: string | null;
      dominio: string | null;
    }>;
  };
  atividadePrincipal: {
    codigo: string | null;
    descricao: string | null;
  } | null;
  atividadesSecundarias: Array<{
    codigo: string | null;
    descricao: string | null;
  }>;
  socios: Array<{
    nome: string | null;
    tipo: string | null;
    qualificacao: string | null;
    dataEntrada: string | null;
  }>;
  inscricoesEstaduais: Array<{
    inscricao: string | null;
    uf: string | null;
    ativa: boolean | null;
  }>;
  fonte: 'CNPJ_WS';
  consultadoEm: string;
};

export type ConsultaCnpjErrorCode =
  | 'INVALID_DOCUMENT'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export type ConsultaCnpjSuccessResponse = {
  success: true;
  data: EmpresaConsultada;
};

export type ConsultaCnpjErrorResponse = {
  success: false;
  error: {
    code: ConsultaCnpjErrorCode;
    message: string;
  };
};

export type ConsultaCnpjResponse =
  | ConsultaCnpjSuccessResponse
  | ConsultaCnpjErrorResponse;

/**
 * Contrato preparado para a persistência futura. A empresa ativa não integra
 * esta rota pública nesta versão; por isso, nenhum dado é gravado ainda.
 */
export type ConsultaCadastralParaSalvar = {
  empresaId: string;
  userId: string;
  tipoDocumento: 'CNPJ';
  documento: string;
  nomeConsultado: string | null;
  tipoConsulta: 'CADASTRAL_CNPJ';
  provedor: 'CNPJ_WS';
  resultado: EmpresaConsultada;
  consultadoEm: string;
};
