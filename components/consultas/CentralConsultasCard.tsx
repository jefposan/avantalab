'use client';

import { useRef, useState, type FormEvent } from 'react';
import type {
  ConsultaCnpjErrorResponse,
  ConsultaCnpjResponse,
  EmpresaConsultada,
} from '@/lib/consultas/types';
import {
  CNPJ_TAMANHO,
  formatarCnpjParaExibicao,
  sanitizarCnpj,
  validarCnpj,
} from '@/lib/consultas/validators/cnpj';
import ConsultaCnpjForm from './ConsultaCnpjForm';
import ResultadoConsultaCnpj from './ResultadoConsultaCnpj';
import styles from './consultas.module.css';

type Etapa = 'opcoes' | 'formulario' | 'resultado';

const opcoes = [
  {
    id: 'cnpj',
    titulo: 'Consulta cadastral CNPJ',
    descricao: 'Consulte dados cadastrais e empresariais pelo CNPJ.',
    disponivel: true,
  },
  {
    id: 'cpf',
    titulo: 'Consulta cadastral CPF',
    descricao: 'Consulta cadastral de pessoa física.',
    disponivel: false,
  },
  {
    id: 'credito',
    titulo: 'Consulta de crédito',
    descricao: 'Informações empresariais de crédito.',
    disponivel: false,
  },
  {
    id: 'restricoes',
    titulo: 'Protestos e restrições',
    descricao: 'Pesquisa de ocorrências e apontamentos.',
    disponivel: false,
  },
  {
    id: 'completa',
    titulo: 'Consulta completa',
    descricao: 'Visão consolidada de informações empresariais.',
    disponivel: false,
  },
];

const MENSAGEM_INVALIDA = 'Informe um CNPJ válido para continuar.';
const MENSAGEM_TIMEOUT =
  'O serviço demorou mais que o esperado para responder. Tente novamente.';
const MENSAGEM_INDISPONIVEL =
  'O serviço de consulta está temporariamente indisponível.';

function ehRespostaConsulta(valor: unknown): valor is ConsultaCnpjResponse {
  if (!valor || typeof valor !== 'object' || !('success' in valor)) return false;
  return typeof (valor as { success?: unknown }).success === 'boolean';
}

export default function CentralConsultasCard() {
  const [etapa, setEtapa] = useState<Etapa>('opcoes');
  const [cnpj, setCnpj] = useState('');
  const [empresa, setEmpresa] = useState<EmpresaConsultada | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const requisicaoEmAndamento = useRef(false);

  function alterarCnpj(valor: string) {
    const sanitizado = sanitizarCnpj(valor).slice(0, CNPJ_TAMANHO);
    const exibicao = /^\d*$/.test(sanitizado)
      ? formatarCnpjParaExibicao(sanitizado)
      : sanitizado;
    setCnpj(exibicao);
    if (erro) setErro('');
  }

  function abrirConsultaCnpj() {
    setErro('');
    setEmpresa(null);
    setEtapa('formulario');
  }

  function voltarOpcoes() {
    setErro('');
    setCnpj('');
    setEmpresa(null);
    setEtapa('opcoes');
  }

  function novaConsulta() {
    setErro('');
    setCnpj('');
    setEmpresa(null);
    setEtapa('formulario');
  }

  async function consultar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requisicaoEmAndamento.current) return;

    const validacao = validarCnpj(cnpj);
    if (!validacao.valido) {
      setErro(MENSAGEM_INVALIDA);
      requestAnimationFrame(() => document.getElementById('consulta-cnpj')?.focus());
      return;
    }

    requisicaoEmAndamento.current = true;
    setCarregando(true);
    setErro('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);

    try {
      const response = await fetch('/api/consultas/cnpj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj: validacao.documento }),
        cache: 'no-store',
        signal: controller.signal,
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!ehRespostaConsulta(payload)) {
        setErro(MENSAGEM_INDISPONIVEL);
        return;
      }

      if (!response.ok || !payload.success) {
        const falha = payload as ConsultaCnpjErrorResponse;
        setErro(falha.error?.message || MENSAGEM_INDISPONIVEL);
        return;
      }

      setEmpresa(payload.data);
      setEtapa('resultado');
    } catch (error) {
      setErro(
        error instanceof DOMException && error.name === 'AbortError'
          ? MENSAGEM_TIMEOUT
          : MENSAGEM_INDISPONIVEL,
      );
    } finally {
      window.clearTimeout(timeout);
      requisicaoEmAndamento.current = false;
      setCarregando(false);
    }
  }

  return (
    <div className={`${styles.card} ${etapa === 'resultado' ? styles.cardResultado : ''}`}>
      {etapa === 'opcoes' && (
        <div className={styles.opcoesEtapa}>
          <div className={styles.cardCabecalho}>
            <span className={styles.etapaKicker}>Dados empresariais</span>
            <h1>Central de Consultas</h1>
            <p>
              Consulte dados cadastrais e, futuramente, informações de crédito
              em um único lugar.
            </p>
          </div>

          <div className={styles.opcoesLista} aria-label="Tipos de consulta">
            {opcoes.map((opcao) => (
              <button
                key={opcao.id}
                type="button"
                className={`${styles.opcao} ${
                  opcao.disponivel ? styles.opcaoDisponivel : styles.opcaoIndisponivel
                }`}
                onClick={opcao.disponivel ? abrirConsultaCnpj : undefined}
                disabled={!opcao.disponivel}
                aria-disabled={!opcao.disponivel}
              >
                <span className={styles.opcaoIcone} aria-hidden="true">
                  {opcao.disponivel ? '✓' : '·'}
                </span>
                <span className={styles.opcaoConteudo}>
                  <strong>{opcao.titulo}</strong>
                  <span>{opcao.descricao}</span>
                </span>
                <span
                  className={`${styles.opcaoStatus} ${
                    opcao.disponivel
                      ? styles.opcaoStatusDisponivel
                      : styles.opcaoStatusBreve
                  }`}
                >
                  {opcao.disponivel ? 'Disponível' : 'Em breve'}
                </span>
                {opcao.disponivel && (
                  <span className={styles.opcaoSeta} aria-hidden="true">
                    →
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {etapa === 'formulario' && (
        <ConsultaCnpjForm
          cnpj={cnpj}
          carregando={carregando}
          erro={erro}
          onChange={alterarCnpj}
          onSubmit={consultar}
          onVoltar={voltarOpcoes}
        />
      )}

      {etapa === 'resultado' && empresa && (
        <ResultadoConsultaCnpj
          empresa={empresa}
          onNovaConsulta={novaConsulta}
          onImprimir={() => window.print()}
        />
      )}

      <div className={styles.statusLeitor} aria-live="polite" aria-atomic="true">
        {carregando ? 'Consultando CNPJ.' : erro}
      </div>
    </div>
  );
}
