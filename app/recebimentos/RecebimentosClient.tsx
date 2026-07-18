'use client';

import { useState } from 'react';
import styles from './recebimentos.module.css';
import type { Colaborador, Empresa, Perfil, Recebimento, Subempresa } from './components/types';
import {
  colaboradoresDemo,
  empresasDemo,
  recebimentosDemo,
  subempresasDemo,
} from './components/dadosDemo';
import PainelAdministrativo from './components/PainelAdministrativo';

// A visão do colaborador NÃO faz parte desta tela: o app dele é exclusivo e
// fica em /recebimentos/colaborador (ColaboradorApp). Aqui só gestor/admin.
const PERFIS: Array<[Perfil, string]> = [
  ['gestor', 'Gestor'],
  ['administrador', 'Administrador'],
];

// Estado central do estudo. "Valor registrado" pelo colaborador é sempre
// distinto do "valor baixado": a baixa só acontece na confirmação do gestor/admin.
export default function RecebimentosClient() {
  const [perfil, setPerfil] = useState<Perfil>('gestor');
  const [empresas, setEmpresas] = useState<Empresa[]>(empresasDemo);
  const [subempresas, setSubempresas] = useState<Subempresa[]>(subempresasDemo);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>(colaboradoresDemo);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>(recebimentosDemo);

  const podeConfirmar = perfil === 'gestor' || perfil === 'administrador';
  const nomePerfil = perfil === 'gestor' ? 'Gestor (demo)' : 'Administrador (demo)';

  // ── Ações ────────────────────────────────────────────────────────────────

  // Gestor/Admin confirma a baixa.
  function confirmarBaixa(recebimentoId: string) {
    if (!podeConfirmar) return;
    setRecebimentos((prev) =>
      prev.map((r) =>
        r.id === recebimentoId
          ? { ...r, situacao: 'baixado', baixadoPor: nomePerfil, baixadoEm: new Date().toISOString() }
          : r,
      ),
    );
  }

  // Devolve para o colaborador corrigir.
  function devolverParaCorrecao(recebimentoId: string, motivo: string) {
    if (!podeConfirmar) return;
    setRecebimentos((prev) =>
      prev.map((r) =>
        r.id === recebimentoId
          ? {
              ...r,
              situacao: 'devolvido_para_correcao',
              observacao: motivo.trim()
                ? `${r.observacao ? r.observacao + ' · ' : ''}Devolvido: ${motivo.trim()}`
                : r.observacao,
            }
          : r,
      ),
    );
  }

  // Registra divergência e dá baixa com marcação.
  function registrarDivergencia(recebimentoId: string, motivo: string) {
    if (!podeConfirmar) return;
    setRecebimentos((prev) =>
      prev.map((r) =>
        r.id === recebimentoId
          ? {
              ...r,
              situacao: 'baixado',
              baixadoPor: nomePerfil,
              baixadoEm: new Date().toISOString(),
              observacao: `${r.observacao ? r.observacao + ' · ' : ''}Divergência registrada${motivo.trim() ? ': ' + motivo.trim() : ''}`,
            }
          : r,
      ),
    );
  }

  // Estorna/reabre o lançamento do colaborador: a cobrança volta ao estado
  // aberto (em atraso se vencida, senão previsto), como se nada tivesse sido
  // lançado — mas preservando na observação quem estornou, quando e o motivo.
  function estornarRecebimento(recebimentoId: string, motivo: string) {
    if (!podeConfirmar) return;
    const hojeIso = new Date().toISOString().slice(0, 10);
    setRecebimentos((prev) =>
      prev.map((r) => {
        if (r.id !== recebimentoId) return r;
        const vencida = r.vencimento < hojeIso;
        const carimbo = `Estornado por ${nomePerfil} em ${new Date().toLocaleString('pt-BR')}${motivo.trim() ? ` — ${motivo.trim()}` : ''}`;
        return {
          ...r,
          situacao: vencida ? 'em_atraso' : 'previsto',
          valorRecebido: null,
          colaboradorId: null,
          recebidoEm: null,
          baixadoPor: null,
          baixadoEm: null,
          observacao: carimbo,
        };
      }),
    );
  }

  function adicionarEmpresa(dados: Omit<Empresa, 'id'>) {
    setEmpresas((prev) => [...prev, { ...dados, id: `e-${Date.now()}` }]);
  }
  function editarEmpresa(id: string, dados: Omit<Empresa, 'id' | 'ativo'>) {
    setEmpresas((prev) => prev.map((e) => (e.id === id ? { ...e, ...dados } : e)));
  }
  // Excluir empresa remove também as subempresas e cobranças vinculadas.
  function excluirEmpresa(id: string) {
    setSubempresas((prev) => prev.filter((s) => s.empresaId !== id));
    setRecebimentos((prev) => prev.filter((r) => r.empresaId !== id));
    setEmpresas((prev) => prev.filter((e) => e.id !== id));
  }
  function alternarEmpresaAtiva(id: string) {
    setEmpresas((prev) => prev.map((e) => (e.id === id ? { ...e, ativo: !e.ativo } : e)));
  }
  function adicionarSubempresa(dados: Omit<Subempresa, 'id'>) {
    setSubempresas((prev) => [...prev, { ...dados, id: `s-${Date.now()}` }]);
  }
  function editarSubempresa(
    id: string,
    dados: Pick<Subempresa, 'nome' | 'endereco' | 'responsavel' | 'valorCombinado' | 'diaVencimento'>,
  ) {
    setSubempresas((prev) => prev.map((s) => (s.id === id ? { ...s, ...dados } : s)));
  }
  function alternarSubempresaAtiva(id: string) {
    setSubempresas((prev) => prev.map((s) => (s.id === id ? { ...s, ativo: !s.ativo } : s)));
  }
  // Excluir subempresa remove também as cobranças vinculadas a ela.
  function excluirSubempresa(id: string) {
    setRecebimentos((prev) => prev.filter((r) => r.subempresaId !== id));
    setSubempresas((prev) => prev.filter((s) => s.id !== id));
  }
  function adicionarColaborador(dados: Omit<Colaborador, 'id'>) {
    setColaboradores((prev) => [...prev, { ...dados, id: `c-${Date.now()}` }]);
  }
  function editarColaborador(id: string, dados: Omit<Colaborador, 'id' | 'ativo'>) {
    setColaboradores((prev) => prev.map((c) => (c.id === id ? { ...c, ...dados } : c)));
  }
  // Excluir colaborador desvincula os recebimentos que ele registrou.
  function excluirColaborador(id: string) {
    setRecebimentos((prev) => prev.map((r) => (r.colaboradorId === id ? { ...r, colaboradorId: null } : r)));
    setColaboradores((prev) => prev.filter((c) => c.id !== id));
  }
  function alternarColaboradorAtivo(id: string) {
    setColaboradores((prev) => prev.map((c) => (c.id === id ? { ...c, ativo: !c.ativo } : c)));
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.topbarInner}>
          <div className={styles.brand}>
            <span className={styles.brandKicker}>AvantaLab · Estudo</span>
            <span className={styles.brandTitle}>Recebimentos em Campo</span>
          </div>
          <div className={styles.perfilGroup} role="tablist" aria-label="Perfil de teste">
            {PERFIS.map(([p, label]) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={perfil === p}
                className={`${styles.perfilBtn} ${perfil === p ? styles.perfilBtnAtivo : ''}`}
                onClick={() => setPerfil(p)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.container}>
        <PainelAdministrativo
          perfil={perfil}
          podeConfirmar={podeConfirmar}
          empresas={empresas}
          subempresas={subempresas}
          colaboradores={colaboradores}
          recebimentos={recebimentos}
          onConfirmarBaixa={confirmarBaixa}
          onDevolver={devolverParaCorrecao}
          onDivergencia={registrarDivergencia}
          onEstornar={estornarRecebimento}
          onAdicionarEmpresa={adicionarEmpresa}
          onEditarEmpresa={editarEmpresa}
          onExcluirEmpresa={excluirEmpresa}
          onAlternarEmpresa={alternarEmpresaAtiva}
          onAdicionarSubempresa={adicionarSubempresa}
          onEditarSubempresa={editarSubempresa}
          onExcluirSubempresa={excluirSubempresa}
          onAlternarSubempresa={alternarSubempresaAtiva}
          onAdicionarColaborador={adicionarColaborador}
          onEditarColaborador={editarColaborador}
          onExcluirColaborador={excluirColaborador}
          onAlternarColaborador={alternarColaboradorAtivo}
        />
      </div>
    </div>
  );
}
