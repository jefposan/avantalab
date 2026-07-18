'use client';

import { useMemo, useState } from 'react';
import styles from '../recebimentos.module.css';
import type { Empresa, Recebimento, Subempresa } from './types';
import { dataLocalIso, diasEmAtraso, formatarData, formatarMoeda, rotuloFrequenciaRecebimento, tipoDiferenca } from './helpers';

type Props = {
  empresas: Empresa[];
  subempresas: Subempresa[];
  recebimentos: Recebimento[];
  // Recebimento avulso (sem cobrança vinculada).
  onConfirmar: (subempresaId: string, valorRecebido: number, observacao: string, resumo: ResumoRecebimento) => Promise<void> | void;
  // Registro de uma cobrança prevista ou em atraso específica (uma a uma).
  onReceberCobranca: (recebimentoId: string, valorRecebido: number, observacao: string, resumo: ResumoRecebimento) => Promise<void> | void;
  onCancelar: () => void;
};

export type ResumoRecebimento = {
  empresaNome: string;
  subempresaNome: string;
  valorCombinado: number;
  valorRecebido: number;
  tipo: ReturnType<typeof tipoDiferenca>;
};

export default function FormularioRecebimento({ empresas, subempresas, recebimentos, onConfirmar, onReceberCobranca, onCancelar }: Props) {
  const empresasAtivas = useMemo(() => empresas.filter((e) => e.ativo), [empresas]);
  const [empresaId, setEmpresaId] = useState('');
  const [subempresaId, setSubempresaId] = useState('');
  // Cobrança selecionada para baixa individual.
  const [cobrancaId, setCobrancaId] = useState('');
  const [valorTexto, setValorTexto] = useState('');
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const hoje = useMemo(() => new Date(), []);
  const hojeIso = useMemo(() => dataLocalIso(hoje), [hoje]);

  const subsDaEmpresa = useMemo(
    () => subempresas.filter((s) => s.empresaId === empresaId && s.ativo),
    [subempresas, empresaId],
  );

  // O colaborador recebe uma fila objetiva: todos os vencidos e somente o
  // primeiro vencimento ainda futuro. As demais parcelas futuras permanecem
  // ocultas até se tornarem a próxima cobrança disponível.
  const cobrancasAbertas = useMemo(
    () => {
      const abertas = recebimentos
        .filter(
          (r) =>
            r.empresaId === empresaId &&
            r.valorRecebido == null &&
            (r.situacao === 'em_atraso' || r.situacao === 'previsto'),
        )
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento) || a.id.localeCompare(b.id));

      // A data é a fonte de verdade da fila e também protege a tela caso o
      // status persistido ainda não tenha sido atualizado pela sincronização.
      const vencidas = abertas.filter((r) => r.vencimento < hojeIso);
      const idsVencidos = new Set(vencidas.map((r) => r.id));
      const proxima = abertas.find((r) => !idsVencidos.has(r.id));

      return proxima ? [...vencidas, proxima] : vencidas;
    },
    [recebimentos, empresaId, hojeIso],
  );

  const cobranca = useMemo(() => cobrancasAbertas.find((r) => r.id === cobrancaId) ?? null, [cobrancasAbertas, cobrancaId]);
  const sub = useMemo(() => {
    const id = cobranca ? cobranca.subempresaId : subempresaId;
    return subempresas.find((s) => s.id === id) ?? null;
  }, [subempresas, subempresaId, cobranca]);
  const empresa = useMemo(() => empresas.find((e) => e.id === empresaId) ?? null, [empresas, empresaId]);

  const nomeSub = (id: string) => subempresas.find((s) => s.id === id)?.nome ?? '—';

  // Valor de referência: da cobrança selecionada (parcela) ou da subempresa.
  const valorCombinado = cobranca ? cobranca.valorCombinado : sub?.valorCombinado ?? null;

  const valorRecebido = valorTexto === '' ? null : Number(valorTexto.replace(',', '.'));
  const tipo = valorCombinado != null && valorRecebido != null ? tipoDiferenca(valorCombinado, valorRecebido) : null;
  const precisaObs = tipo === 'menor' || tipo === 'maior';

  function selecionarEmpresa(id: string) {
    setEmpresaId(id);
    setSubempresaId('');
    setCobrancaId('');
    setErro('');
  }

  function selecionarCobranca(id: string) {
    setCobrancaId((atual) => (atual === id ? '' : id));
    setSubempresaId('');
    setErro('');
  }

  function textoDiferenca() {
    if (valorCombinado == null || valorRecebido == null || Number.isNaN(valorRecebido)) return null;
    const dif = valorRecebido - valorCombinado;
    if (tipo === 'exato') return <span className={styles.difExato}>Valor exato ✓</span>;
    if (tipo === 'menor')
      return <span className={styles.difMenor}>Recebido a menor · falta {formatarMoeda(Math.abs(dif))}</span>;
    return <span className={styles.difMaior}>Recebido a maior · excede {formatarMoeda(dif)}</span>;
  }

  async function confirmar() {
    setErro('');
    if (!empresa) return setErro('Selecione a empresa.');
    if (!cobranca && !sub) return setErro('Selecione um vencimento ou a subempresa.');
    if (valorRecebido == null || Number.isNaN(valorRecebido) || valorRecebido < 0)
      return setErro('Informe um valor recebido válido.');
    if (precisaObs && !observacao.trim())
      return setErro('Há diferença de valor: a observação é obrigatória.');

    const resumo: ResumoRecebimento = {
      empresaNome: empresa.nome,
      subempresaNome: sub?.nome ?? nomeSub(cobranca?.subempresaId ?? ''),
      valorCombinado: valorCombinado ?? 0,
      valorRecebido: Number(valorRecebido.toFixed(2)),
      tipo: tipo ?? 'exato',
    };

    setSalvando(true);
    try {
      if (cobranca) {
        await onReceberCobranca(cobranca.id, Number(valorRecebido.toFixed(2)), observacao, resumo);
      } else if (sub) {
        await onConfirmar(sub.id, Number(valorRecebido.toFixed(2)), observacao, resumo);
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível registrar o recebimento.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div className={styles.field}>
        <label className={styles.label}>Empresa</label>
        <select className={styles.select} value={empresaId} onChange={(e) => selecionarEmpresa(e.target.value)}>
          <option value="">Selecione…</option>
          {empresasAtivas.map((e) => (
            <option key={e.id} value={e.id}>{e.nome}</option>
          ))}
        </select>
      </div>

      {empresaId && cobrancasAbertas.length > 0 && (
        <div className={styles.atrasoBox}>
          <div className={styles.atrasoTitulo}>Próximo a vencer e vencidos ({cobrancasAbertas.length})</div>
          <p className={styles.atrasoDica}>
            São exibidos todos os vencidos e somente o próximo vencimento disponível.
          </p>
          {cobrancasAbertas.map((r) => {
            const selecionada = r.id === cobrancaId;
            const atrasada = r.vencimento < hojeIso;
            return (
              <button
                key={r.id}
                type="button"
                className={`${styles.atrasoItem} ${selecionada ? styles.atrasoItemAtivo : ''}`}
                onClick={() => selecionarCobranca(r.id)}
              >
                <span className={styles.atrasoItemInfo}>
                  <span className={styles.atrasoItemSub}>{nomeSub(r.subempresaId)}</span>
                  <span className={styles.atrasoItemMeta}>
                    Venc. {formatarData(r.vencimento)} · {atrasada ? `${diasEmAtraso(r.vencimento, hoje)} dia(s) em atraso` : 'Próximo a vencer'}
                  </span>
                </span>
                <span className={styles.atrasoItemValor}>{formatarMoeda(r.valorCombinado)}</span>
                <span className={styles.atrasoItemAcao}>{selecionada ? 'Selecionada ✓' : 'Receber'}</span>
              </button>
            );
          })}
        </div>
      )}

      {!cobranca && cobrancasAbertas.length === 0 && (
        <div className={styles.field}>
          <label className={styles.label}>Subempresa</label>
          <select
            className={styles.select}
            value={subempresaId}
            onChange={(e) => setSubempresaId(e.target.value)}
            disabled={!empresaId}
          >
            <option value="">{empresaId ? 'Selecione…' : 'Escolha a empresa primeiro'}</option>
            {subsDaEmpresa.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
        </div>
      )}

      {sub && (
        <div className={styles.readonlyBox} style={{ marginBottom: 12 }}>
          <div className={styles.readonlyRow}><span>Endereço/local</span><span>{sub.endereco}</span></div>
          <div className={styles.readonlyRow}><span>Responsável</span><span>{sub.responsavel}</span></div>
          {cobranca ? (
            <div className={styles.readonlyRow}><span>Vencimento da parcela</span><span>{formatarData(cobranca.vencimento)}</span></div>
          ) : (
            <div className={styles.readonlyRow}><span>Recebimento</span><span>{rotuloFrequenciaRecebimento(sub.frequenciaRecebimento)}</span></div>
          )}
          <div className={styles.readonlyRow}><span>Valor combinado</span><span>{formatarMoeda(valorCombinado ?? 0)}</span></div>
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label}>Valor recebido</label>
        <input
          className={`${styles.input} ${styles.inputCentro}`}
          inputMode="decimal"
          placeholder="0,00"
          value={valorTexto}
          onChange={(e) => setValorTexto(e.target.value.replace(/[^0-9.,]/g, ''))}
        />
        {textoDiferenca() && <div style={{ marginTop: 6, fontSize: 13 }}>{textoDiferenca()}</div>}
      </div>

      {precisaObs && (
        <div className={styles.field}>
          <label className={styles.label}>Observação (obrigatória por haver diferença)</label>
          <textarea
            className={styles.input}
            rows={3}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Explique a diferença do valor…"
          />
        </div>
      )}

      {erro && <div className={styles.aviso} style={{ marginBottom: 12 }}>{erro}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancelar} style={{ flex: 1 }}>
          Cancelar
        </button>
        <button type="button" disabled={salvando} className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => void confirmar()} style={{ flex: 2 }}>
          {salvando ? 'Registrando…' : 'Confirmar recebimento'}
        </button>
      </div>
    </div>
  );
}
