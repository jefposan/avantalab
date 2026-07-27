'use client';

import type { ReactNode } from 'react';
import type { EmpresaConsultada } from '@/lib/consultas/types';
import { formatarCnpjParaExibicao } from '@/lib/consultas/validators/cnpj';
import SecaoConsulta from './SecaoConsulta';
import StatusCadastralBadge from './StatusCadastralBadge';
import styles from './consultas.module.css';

type ResultadoConsultaCnpjProps = {
  empresa: EmpresaConsultada;
  onNovaConsulta: () => void;
  onImprimir: () => void;
};

const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatarData(valor: string | null): string | null {
  if (!valor) return null;
  const data = /^\d{4}-\d{2}-\d{2}$/.test(valor)
    ? new Date(`${valor}T12:00:00`)
    : new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return new Intl.DateTimeFormat('pt-BR').format(data);
}

function formatarDataHora(valor: string): string {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data);
}

function formatarCep(valor: string | null): string | null {
  if (!valor) return null;
  return /^\d{8}$/.test(valor)
    ? valor.replace(/^(\d{5})(\d{3})$/, '$1-$2')
    : valor;
}

function formatarTelefone(ddd: string | null, numero: string | null): string {
  const prefixo = ddd ? `(${ddd}) ` : '';
  if (!numero) return prefixo.trim();
  const formatado = numero.replace(
    /^(\d{4,5})(\d{4})$/,
    '$1-$2',
  );
  return `${prefixo}${formatado}`;
}

function textoOptante(valor: boolean | null): string {
  if (valor === true) return 'Optante';
  if (valor === false) return 'Não optante';
  return 'Não informado na fonte';
}

function possuiAlgum(...valores: Array<string | null | undefined>): boolean {
  return valores.some((valor) => Boolean(valor));
}

function Campo({
  rotulo,
  valor,
  mostrarAusente = false,
}: {
  rotulo: string;
  valor: ReactNode;
  mostrarAusente?: boolean;
}) {
  if (
    !mostrarAusente &&
    (valor === null || valor === undefined || valor === '')
  ) {
    return null;
  }

  return (
    <div className={styles.dado}>
      <dt>{rotulo}</dt>
      <dd>{valor || 'Não informado na fonte'}</dd>
    </div>
  );
}

export default function ResultadoConsultaCnpj({
  empresa,
  onNovaConsulta,
  onImprimir,
}: ResultadoConsultaCnpjProps) {
  const enderecoDisponivel = possuiAlgum(
    empresa.endereco.tipoLogradouro,
    empresa.endereco.logradouro,
    empresa.endereco.numero,
    empresa.endereco.complemento,
    empresa.endereco.bairro,
    empresa.endereco.cep,
    empresa.endereco.cidade,
    empresa.endereco.uf,
    empresa.endereco.pais,
  );
  const contatosDisponiveis =
    empresa.contatos.telefones.length > 0 ||
    empresa.contatos.emails.length > 0;
  const regimeDisponivel = Boolean(empresa.simples || empresa.mei);
  const natureza = [empresa.naturezaJuridica?.codigo, empresa.naturezaJuridica?.descricao]
    .filter(Boolean)
    .join(' — ');

  return (
    <div className={styles.resultadoEtapa}>
      <div className={styles.acoesTopo}>
        <button type="button" className={styles.voltar} onClick={onNovaConsulta}>
          <span aria-hidden="true">←</span>
          Nova consulta
        </button>
      </div>

      <article className={styles.printReport} aria-labelledby="resultado-titulo">
        <div className={styles.identificacaoImpressao}>
          Central de Consultas — AvantaLab
        </div>

        <header className={styles.resultadoCabecalho}>
          <div>
            <span className={styles.etapaKicker}>Resultado da consulta</span>
            <h2 id="resultado-titulo">
              {empresa.nomeFantasia || empresa.razaoSocial || 'Empresa consultada'}
            </h2>
            {empresa.nomeFantasia && empresa.razaoSocial && (
              <p className={styles.razaoCabecalho}>{empresa.razaoSocial}</p>
            )}
            <div className={styles.resultadoResumo}>
              <strong>{formatarCnpjParaExibicao(empresa.documento)}</strong>
              <StatusCadastralBadge situacao={empresa.situacaoCadastral} />
            </div>
          </div>
          <div className={styles.metadados}>
            <span>Consultado em {formatarDataHora(empresa.consultadoEm)}</span>
            <span>Fonte: CNPJ.ws</span>
          </div>
        </header>

        <div className={styles.secoes}>
          <SecaoConsulta titulo="Identificação">
            <dl className={styles.dadosGrid}>
              <Campo rotulo="Razão social" valor={empresa.razaoSocial} mostrarAusente />
              <Campo rotulo="Nome fantasia" valor={empresa.nomeFantasia} mostrarAusente />
              <Campo
                rotulo="CNPJ"
                valor={formatarCnpjParaExibicao(empresa.documento)}
                mostrarAusente
              />
              <Campo
                rotulo="Data de abertura"
                valor={formatarData(empresa.dataAbertura)}
                mostrarAusente
              />
              <Campo
                rotulo="Situação cadastral"
                valor={empresa.situacaoCadastral}
                mostrarAusente
              />
              <Campo
                rotulo="Data da situação"
                valor={formatarData(empresa.dataSituacaoCadastral)}
              />
              <Campo
                rotulo="Motivo da situação"
                valor={empresa.motivoSituacaoCadastral}
              />
              <Campo rotulo="Natureza jurídica" valor={natureza} mostrarAusente />
              <Campo rotulo="Porte" valor={empresa.porte} mostrarAusente />
              <Campo
                rotulo="Capital social"
                valor={
                  empresa.capitalSocial === null
                    ? null
                    : formatadorMoeda.format(empresa.capitalSocial)
                }
                mostrarAusente
              />
            </dl>
          </SecaoConsulta>

          <SecaoConsulta titulo="Endereço" vazia={!enderecoDisponivel}>
            <dl className={styles.dadosGrid}>
              <Campo
                rotulo="Logradouro"
                valor={[
                  empresa.endereco.tipoLogradouro,
                  empresa.endereco.logradouro,
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
              <Campo rotulo="Número" valor={empresa.endereco.numero} />
              <Campo rotulo="Complemento" valor={empresa.endereco.complemento} />
              <Campo rotulo="Bairro" valor={empresa.endereco.bairro} />
              <Campo rotulo="CEP" valor={formatarCep(empresa.endereco.cep)} />
              <Campo rotulo="Cidade" valor={empresa.endereco.cidade} />
              <Campo rotulo="UF" valor={empresa.endereco.uf} />
              <Campo rotulo="País" valor={empresa.endereco.pais} />
            </dl>
          </SecaoConsulta>

          <SecaoConsulta
            titulo="Atividade econômica"
            vazia={
              !empresa.atividadePrincipal &&
              empresa.atividadesSecundarias.length === 0
            }
          >
            {empresa.atividadePrincipal && (
              <div className={styles.blocoLista}>
                <h4>CNAE principal</h4>
                <p>
                  {[empresa.atividadePrincipal.codigo, empresa.atividadePrincipal.descricao]
                    .filter(Boolean)
                    .join(' — ') || 'Não informado na fonte'}
                </p>
              </div>
            )}
            {empresa.atividadesSecundarias.length > 0 && (
              <div className={styles.blocoLista}>
                <h4>Atividades secundárias</h4>
                <ul>
                  {empresa.atividadesSecundarias.map((atividade, indice) => (
                    <li key={`${atividade.codigo ?? 'atividade'}-${indice}`}>
                      {[atividade.codigo, atividade.descricao]
                        .filter(Boolean)
                        .join(' — ') || 'Atividade não informada'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SecaoConsulta>

          <SecaoConsulta titulo="Contatos" vazia={!contatosDisponiveis}>
            <div className={styles.colunasListas}>
              {empresa.contatos.telefones.length > 0 && (
                <div className={styles.blocoLista}>
                  <h4>Telefones</h4>
                  <ul>
                    {empresa.contatos.telefones.map((telefone, indice) => (
                      <li key={`${telefone.ddd ?? ''}-${telefone.numero ?? ''}-${indice}`}>
                        {formatarTelefone(telefone.ddd, telefone.numero) ||
                          'Não informado na fonte'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {empresa.contatos.emails.length > 0 && (
                <div className={styles.blocoLista}>
                  <h4>E-mails</h4>
                  <ul>
                    {empresa.contatos.emails.map((email, indice) => (
                      <li key={`${email.endereco ?? 'email'}-${indice}`}>
                        {email.endereco || 'Não informado na fonte'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </SecaoConsulta>

          <SecaoConsulta titulo="Regime tributário" vazia={!regimeDisponivel}>
            <div className={styles.regimeGrid}>
              {empresa.simples && (
                <div className={styles.regimeCard}>
                  <h4>Simples Nacional</h4>
                  <p>{textoOptante(empresa.simples.optante)}</p>
                  {empresa.simples.dataOpcao && (
                    <span>Opção: {formatarData(empresa.simples.dataOpcao)}</span>
                  )}
                  {empresa.simples.dataExclusao && (
                    <span>Exclusão: {formatarData(empresa.simples.dataExclusao)}</span>
                  )}
                </div>
              )}
              {empresa.mei && (
                <div className={styles.regimeCard}>
                  <h4>MEI</h4>
                  <p>{textoOptante(empresa.mei.optante)}</p>
                  {empresa.mei.dataOpcao && (
                    <span>Opção: {formatarData(empresa.mei.dataOpcao)}</span>
                  )}
                  {empresa.mei.dataExclusao && (
                    <span>Exclusão: {formatarData(empresa.mei.dataExclusao)}</span>
                  )}
                </div>
              )}
            </div>
          </SecaoConsulta>

          <SecaoConsulta titulo="Quadro societário" vazia={empresa.socios.length === 0}>
            <div className={styles.listaCards}>
              {empresa.socios.map((socio, indice) => (
                <div className={styles.itemCard} key={`${socio.nome ?? 'socio'}-${indice}`}>
                  <strong>{socio.nome || 'Nome não informado'}</strong>
                  {socio.tipo && <span>{socio.tipo}</span>}
                  {socio.qualificacao && <span>{socio.qualificacao}</span>}
                  {socio.dataEntrada && (
                    <span>Entrada: {formatarData(socio.dataEntrada)}</span>
                  )}
                </div>
              ))}
            </div>
          </SecaoConsulta>

          <SecaoConsulta
            titulo="Inscrições estaduais"
            vazia={empresa.inscricoesEstaduais.length === 0}
          >
            <div className={styles.listaCards}>
              {empresa.inscricoesEstaduais.map((inscricao, indice) => (
                <div
                  className={styles.itemCard}
                  key={`${inscricao.uf ?? ''}-${inscricao.inscricao ?? ''}-${indice}`}
                >
                  <strong>{inscricao.inscricao || 'Inscrição não informada'}</strong>
                  {inscricao.uf && <span>UF: {inscricao.uf}</span>}
                  <span>
                    {inscricao.ativa === true
                      ? 'Ativa'
                      : inscricao.ativa === false
                        ? 'Inativa'
                        : 'Situação não informada'}
                  </span>
                </div>
              ))}
            </div>
          </SecaoConsulta>
        </div>

        <footer className={styles.rodapeImpressao}>
          <strong>Central de Consultas — AvantaLab</strong>
          <span>
            {formatarCnpjParaExibicao(empresa.documento)} ·{' '}
            {empresa.nomeFantasia || empresa.razaoSocial || 'Empresa consultada'}
          </span>
          <span>
            Fonte: CNPJ.ws · Consulta: {formatarDataHora(empresa.consultadoEm)}
          </span>
        </footer>
      </article>

      <div className={styles.acoesResultado} aria-label="Ações do resultado">
        <button
          type="button"
          className={`${styles.botao} ${styles.botaoSecundario}`}
          onClick={onNovaConsulta}
        >
          Nova consulta
        </button>
        <div className={styles.salvarControlado}>
          <button
            type="button"
            className={`${styles.botao} ${styles.botaoSecundario}`}
            disabled
            aria-disabled="true"
            aria-describedby="consulta-salvar-ajuda"
          >
            Salvar
          </button>
          <span id="consulta-salvar-ajuda">
            Disponível após a integração segura da empresa ativa.
          </span>
        </div>
        <button
          type="button"
          className={`${styles.botao} ${styles.botaoPrimario}`}
          onClick={onImprimir}
        >
          Imprimir
        </button>
      </div>
    </div>
  );
}
