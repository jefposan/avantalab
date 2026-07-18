'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './recebimentos.module.css';
import type { Colaborador, Empresa, Perfil, Recebimento, Subempresa } from './components/types';
import PainelAdministrativo from './components/PainelAdministrativo';
import { criarRepoDemo, type IntegracaoFinanceiraRecebimentos, type RecebimentosRepo } from './data/repo';

const PERFIS: Array<[Perfil, string]> = [['gestor', 'Gestor'], ['administrador', 'Administrador']];

type Props = {
  repo?: RecebimentosRepo;
  integrado?: boolean;
  perfilInicial?: Extract<Perfil, 'gestor' | 'administrador'>;
  mostrarLinkColaboradores?: boolean;
  onFinanceiroAtualizado?: () => void;
};

export default function RecebimentosClient({
  repo,
  integrado = false,
  perfilInicial = 'gestor',
  mostrarLinkColaboradores = false,
  onFinanceiroAtualizado,
}: Props) {
  const repoAtual = useMemo(() => repo ?? criarRepoDemo(), [repo]);
  const [perfil, setPerfil] = useState<Perfil>(perfilInicial);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [subempresas, setSubempresas] = useState<Subempresa[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    try {
      const dados = await repoAtual.carregar();
      setEmpresas(dados.empresas);
      setSubempresas(dados.subempresas);
      setColaboradores(dados.colaboradores);
      setRecebimentos(dados.recebimentos);
      setErro('');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível carregar o módulo.');
    } finally {
      if (!silencioso) setCarregando(false);
    }
  }, [repoAtual]);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => repoAtual.assinarAtualizacoes?.(() => { void carregar(true); }), [repoAtual, carregar]);

  const executar = useCallback(async (acao: () => Promise<void>) => {
    setProcessando(true);
    setErro('');
    try {
      await acao();
      await carregar(true);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível concluir a operação.');
    } finally {
      setProcessando(false);
    }
  }, [carregar]);

  const integrarFinanceiro = useCallback(async (
    ano: number,
    mes: number,
    nomeEntrada: string,
    tituloEtiqueta: string,
  ): Promise<IntegracaoFinanceiraRecebimentos> => {
    setProcessando(true);
    setErro('');
    try {
      const integracao = await repoAtual.integrarFinanceiro(ano, mes, nomeEntrada, tituloEtiqueta);
      onFinanceiroAtualizado?.();
      await carregar(true);
      return integracao;
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível integrar o valor ao Financeiro.');
      throw error;
    } finally {
      setProcessando(false);
    }
  }, [carregar, onFinanceiroAtualizado, repoAtual]);

  const obterIntegracaoFinanceira = useCallback(
    (ano: number, mes: number) => repoAtual.obterIntegracaoFinanceira(ano, mes),
    [repoAtual],
  );

  const podeConfirmar = perfil === 'gestor' || perfil === 'administrador';
  const painel = (
    <>
      {erro && <div className={styles.aviso} role="alert" style={{ marginBottom: 12 }}>{erro}</div>}
      {processando && <div className={styles.muted} role="status" style={{ marginBottom: 10 }}>Salvando alterações…</div>}
      {carregando ? (
        <div className={styles.muted} role="status" style={{ padding: 28, textAlign: 'center' }}>Carregando recebimentos…</div>
      ) : (
        <PainelAdministrativo
          perfil={perfil}
          podeConfirmar={podeConfirmar}
          empresas={empresas}
          subempresas={subempresas}
          colaboradores={colaboradores}
          recebimentos={recebimentos}
          mostrarLinkColaboradores={mostrarLinkColaboradores}
          onObterIntegracaoFinanceira={obterIntegracaoFinanceira}
          onIntegrarFinanceiro={integrarFinanceiro}
          onConfirmarBaixa={(id) => void executar(() => repoAtual.confirmarBaixa(id))}
          onDevolver={(id, motivo) => void executar(() => repoAtual.devolver(id, motivo))}
          onDivergencia={(id, motivo) => void executar(() => repoAtual.divergencia(id, motivo))}
          onEstornar={(id, motivo) => void executar(() => repoAtual.estornar(id, motivo))}
          onAdicionarEmpresa={(dados) => void executar(() => repoAtual.salvarEmpresa(dados))}
          onEditarEmpresa={(id, dados) => void executar(() => repoAtual.editarEmpresa(id, dados))}
          onExcluirEmpresa={(id) => void executar(() => repoAtual.excluirEmpresa(id))}
          onAlternarEmpresa={(id) => {
            const atual = empresas.find((e) => e.id === id);
            if (atual) void executar(() => repoAtual.alternarEmpresa(id, !atual.ativo));
          }}
          onAdicionarSubempresa={(dados) => void executar(() => repoAtual.salvarSubempresa(dados))}
          onEditarSubempresa={(id, dados) => void executar(() => repoAtual.editarSubempresa(id, dados))}
          onExcluirSubempresa={(id) => void executar(() => repoAtual.excluirSubempresa(id))}
          onAlternarSubempresa={(id) => {
            const atual = subempresas.find((s) => s.id === id);
            if (atual) void executar(() => repoAtual.alternarSubempresa(id, !atual.ativo));
          }}
          onAdicionarColaborador={(dados) => void executar(() => repoAtual.criarColaborador(dados))}
          onEditarColaborador={(id, dados) => void executar(() => repoAtual.editarColaborador(id, dados))}
          onExcluirColaborador={(id) => void executar(() => repoAtual.excluirColaborador(id))}
          onAlternarColaborador={(id) => {
            const atual = colaboradores.find((c) => c.id === id);
            if (atual) void executar(() => repoAtual.alternarColaborador(id, !atual.ativo));
          }}
        />
      )}
    </>
  );

  if (integrado) return painel;
  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.topbarInner}>
          <div className={styles.brand}>
            <span className={styles.brandKicker}>AvantaLab · Preview</span>
            <span className={styles.brandTitle}>Recebimentos em Campo</span>
          </div>
          <div className={styles.perfilGroup} role="tablist" aria-label="Perfil de teste">
            {PERFIS.map(([valor, label]) => (
              <button key={valor} type="button" role="tab" aria-selected={perfil === valor}
                className={`${styles.perfilBtn} ${perfil === valor ? styles.perfilBtnAtivo : ''}`}
                onClick={() => setPerfil(valor)}>{label}</button>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.container}>{painel}</div>
    </div>
  );
}
