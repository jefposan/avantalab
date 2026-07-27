import type { EmpresaConsultada } from '../types';

type Registro = Record<string, unknown>;

function comoRegistro(valor: unknown): Registro | null {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
    ? (valor as Registro)
    : null;
}

function comoLista(valor: unknown): unknown[] {
  return Array.isArray(valor) ? valor : [];
}

function texto(valor: unknown): string | null {
  if (typeof valor !== 'string' && typeof valor !== 'number') return null;
  const normalizado = String(valor).trim();
  return normalizado || null;
}

function booleanoOptante(valor: unknown): boolean | null {
  if (typeof valor === 'boolean') return valor;
  const normalizado = texto(valor)?.toLocaleLowerCase('pt-BR');
  if (!normalizado) return null;
  if (['sim', 's', 'true', '1'].includes(normalizado)) return true;
  if (['não', 'nao', 'n', 'false', '0'].includes(normalizado)) return false;
  return null;
}

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const normalizado =
    typeof valor === 'string' ? Number(valor.replace(',', '.')) : Number(valor);
  return Number.isFinite(normalizado) ? normalizado : null;
}

function objetoCodigoDescricao(valor: unknown) {
  const registro = comoRegistro(valor);
  if (!registro) return null;
  const codigo = texto(registro.id);
  const descricao = texto(registro.descricao);
  return codigo || descricao ? { codigo, descricao } : null;
}

export function normalizarCnpjWs(
  resposta: unknown,
  consultadoEm = new Date().toISOString(),
  documentoConsultado = '',
): EmpresaConsultada {
  const raiz = comoRegistro(resposta);

  if (!raiz) {
    throw new Error('Resposta do provedor sem estrutura reconhecível.');
  }

  const estabelecimento = comoRegistro(raiz.estabelecimento) ?? {};
  const simplesOrigem = comoRegistro(raiz.simples);
  const naturezaJuridica = objetoCodigoDescricao(raiz.natureza_juridica);
  const atividadePrincipal = objetoCodigoDescricao(
    estabelecimento.atividade_principal,
  );
  const cidade = comoRegistro(estabelecimento.cidade);
  const estado = comoRegistro(estabelecimento.estado);
  const pais = comoRegistro(estabelecimento.pais);
  const documentoComposto = `${
    texto(estabelecimento.cnpj_raiz) ?? texto(raiz.cnpj_raiz) ?? ''
  }${texto(estabelecimento.cnpj_ordem) ?? ''}${
    texto(estabelecimento.cnpj_digito_verificador) ?? ''
  }`;

  const telefones = [
    {
      ddd: texto(estabelecimento.ddd1),
      numero: texto(estabelecimento.telefone1),
    },
    {
      ddd: texto(estabelecimento.ddd2),
      numero: texto(estabelecimento.telefone2),
    },
  ].filter((telefone) => telefone.ddd || telefone.numero);

  const email = texto(estabelecimento.email);
  const emails = email
    ? [
        {
          endereco: email,
          dominio: email.includes('@') ? email.split('@').pop() ?? null : null,
        },
      ]
    : [];

  const socios = comoLista(raiz.socios).map((item) => {
    const socio = comoRegistro(item) ?? {};
    const qualificacao = comoRegistro(socio.qualificacao_socio);
    return {
      nome: texto(socio.nome),
      tipo: texto(socio.tipo),
      qualificacao: texto(qualificacao?.descricao),
      dataEntrada: texto(socio.data_entrada),
    };
  });

  const atividadesSecundarias = comoLista(
    estabelecimento.atividades_secundarias,
  ).map((item) => {
    const atividade = comoRegistro(item) ?? {};
    return {
      codigo: texto(atividade.id),
      descricao: texto(atividade.descricao),
    };
  });

  const inscricoesEstaduais = comoLista(
    estabelecimento.inscricoes_estaduais,
  ).map((item) => {
    const inscricao = comoRegistro(item) ?? {};
    const estadoInscricao = comoRegistro(inscricao.estado);
    return {
      inscricao: texto(inscricao.inscricao_estadual),
      uf: texto(estadoInscricao?.sigla),
      ativa:
        typeof inscricao.ativo === 'boolean' ? inscricao.ativo : null,
    };
  });

  return {
    documento:
      texto(estabelecimento.cnpj) ||
      documentoComposto ||
      documentoConsultado,
    tipoDocumento: 'CNPJ',
    razaoSocial: texto(raiz.razao_social),
    nomeFantasia: texto(estabelecimento.nome_fantasia),
    situacaoCadastral: texto(estabelecimento.situacao_cadastral),
    dataSituacaoCadastral: texto(
      estabelecimento.data_situacao_cadastral,
    ),
    motivoSituacaoCadastral: texto(
      comoRegistro(estabelecimento.motivo_situacao_cadastral)?.descricao ??
        estabelecimento.motivo_situacao_cadastral,
    ),
    dataAbertura: texto(estabelecimento.data_inicio_atividade),
    naturezaJuridica,
    porte: texto(comoRegistro(raiz.porte)?.descricao),
    capitalSocial: numero(raiz.capital_social),
    simples: simplesOrigem
      ? {
          optante: booleanoOptante(simplesOrigem.simples),
          dataOpcao: texto(simplesOrigem.data_opcao_simples),
          dataExclusao: texto(simplesOrigem.data_exclusao_simples),
        }
      : null,
    mei: simplesOrigem
      ? {
          optante: booleanoOptante(simplesOrigem.mei),
          dataOpcao: texto(simplesOrigem.data_opcao_mei),
          dataExclusao: texto(simplesOrigem.data_exclusao_mei),
        }
      : null,
    endereco: {
      tipoLogradouro: texto(estabelecimento.tipo_logradouro),
      logradouro: texto(estabelecimento.logradouro),
      numero: texto(estabelecimento.numero),
      complemento: texto(estabelecimento.complemento),
      bairro: texto(estabelecimento.bairro),
      cep: texto(estabelecimento.cep),
      cidade: texto(cidade?.nome),
      uf: texto(estado?.sigla),
      pais: texto(pais?.nome),
    },
    contatos: { telefones, emails },
    atividadePrincipal,
    atividadesSecundarias,
    socios,
    inscricoesEstaduais,
    fonte: 'CNPJ_WS',
    consultadoEm,
  };
}
