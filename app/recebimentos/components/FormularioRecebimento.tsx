'use client';

import { useMemo, useRef, useState } from 'react';
import styles from '../recebimentos.module.css';
import { FORMAS_PAGAMENTO_RECEBIMENTO, type Empresa, type FormaPagamentoRecebimento, type Recebimento, type Subempresa } from './types';
import { dataLocalIso, diasEmAtraso, formatarData, formatarMoeda, formatarValorInput, parseValorBR, rotuloFrequenciaRecebimento, tipoDiferenca, valorParaInput } from './helpers';

type Props = {
  empresas: Empresa[];
  subempresas: Subempresa[];
  recebimentos: Recebimento[];
  chaveMes: string;
  /** Lançamento devolvido pelo gestor: é corrigido no mesmo registro. */
  cobrancaCorrecao?: Recebimento | null;
  // Recebimento avulso (sem cobrança vinculada).
  onConfirmar: (empresaId: string, subempresaId: string | null, valorRecebido: number, observacao: string, formaPagamento: FormaPagamentoRecebimento, comprovante: File | null, resumo: ResumoRecebimento) => Promise<void> | void;
  // Registro de uma cobrança prevista ou em atraso específica (uma a uma).
  onReceberCobranca: (recebimentoId: string, valorRecebido: number, observacao: string, formaPagamento: FormaPagamentoRecebimento, comprovante: File | null, resumo: ResumoRecebimento, dataPagamento?: string | null) => Promise<void> | void;
  onCancelar: () => void;
};

export type ResumoRecebimento = {
  empresaNome: string;
  subempresaNome: string;
  valorCombinado: number;
  valorRecebido: number;
  formaPagamento: FormaPagamentoRecebimento;
  temComprovante: boolean;
  tipo: ReturnType<typeof tipoDiferenca>;
};

export default function FormularioRecebimento({ empresas, subempresas, recebimentos, chaveMes, cobrancaCorrecao = null, onConfirmar, onReceberCobranca, onCancelar }: Props) {
  const empresasAtivas = useMemo(
    () => empresas.filter((e) => e.ativo).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })),
    [empresas],
  );
  const [empresaId, setEmpresaId] = useState(() => cobrancaCorrecao?.empresaId ?? '');
  const [subempresaId, setSubempresaId] = useState('');
  // Cobrança selecionada para baixa individual.
  const [cobrancaId, setCobrancaId] = useState(() => cobrancaCorrecao?.id ?? '');
  const [valorTexto, setValorTexto] = useState(() => cobrancaCorrecao?.valorRecebido == null ? '' : valorParaInput(cobrancaCorrecao.valorRecebido));
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamentoRecebimento | ''>(() => cobrancaCorrecao?.formaPagamento ?? '');
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [observacao, setObservacao] = useState(() => cobrancaCorrecao?.observacao?.split(' · Devolvido:')[0] ?? '');
  const [mesPagamento, setMesPagamento] = useState(() => (cobrancaCorrecao?.recebidoEm ?? dataLocalIso()).slice(0, 7));
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const comprovanteInput = useRef<HTMLInputElement | null>(null);

  const hoje = useMemo(() => new Date(), []);
  const hojeIso = useMemo(() => dataLocalIso(hoje), [hoje]);

  function dataPagamentoDoMes() {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mesPagamento)) return null;
    const [ano, mes] = mesPagamento.split('-').map(Number);
    const diaOriginal = Number((cobrancaCorrecao?.recebidoEm ?? hojeIso).slice(8, 10)) || 1;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    return `${mesPagamento}-${String(Math.min(diaOriginal, ultimoDia)).padStart(2, '0')}`;
  }

  const rotuloMesPagamento = useMemo(() => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mesPagamento)) return '';
    const [ano, mes] = mesPagamento.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(ano, mes - 1, 1));
  }, [mesPagamento]);

  const subsDaEmpresa = useMemo(
    () => subempresas
      .filter((s) => s.empresaId === empresaId && s.ativo)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })),
    [subempresas, empresaId],
  );

  // O colaborador recebe uma fila objetiva: todos os vencidos e todos os
  // clientes cujo vencimento seja na próxima data disponível da empresa.
  // Assim, ao abrir uma empresa, ninguém com cobrança no mesmo dia fica oculto.
  const cobrancasAbertas = useMemo(
    () => {
      const abertas = recebimentos
        .filter(
          (r) =>
            r.empresaId === empresaId &&
            r.vencimento.slice(0, 7) === chaveMes &&
            r.valorRecebido == null &&
            (r.situacao === 'em_atraso' || r.situacao === 'previsto'),
        )
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento) || a.id.localeCompare(b.id));

      // A data é a fonte de verdade da fila e também protege a tela caso o
      // status persistido ainda não tenha sido atualizado pela sincronização.
      const vencidas = abertas.filter((r) => r.vencimento < hojeIso);
      const idsVencidos = new Set(vencidas.map((r) => r.id));
      const proximaData = abertas.find((r) => !idsVencidos.has(r.id))?.vencimento;
      const proximas = proximaData
        ? abertas.filter((r) => !idsVencidos.has(r.id) && r.vencimento === proximaData)
        : [];
      const nomeDaCobranca = (r: Recebimento) => r.subempresaId
        ? subempresas.find((s) => s.id === r.subempresaId)?.nome ?? ''
        : empresas.find((e) => e.id === r.empresaId)?.nome ?? '';
      const ordenarPorCliente = (a: Recebimento, b: Recebimento) =>
        nomeDaCobranca(a).localeCompare(nomeDaCobranca(b), 'pt-BR', { sensitivity: 'base' })
        || a.vencimento.localeCompare(b.vencimento)
        || a.id.localeCompare(b.id);

      return [...vencidas.sort(ordenarPorCliente), ...proximas.sort(ordenarPorCliente)];
    },
    [recebimentos, empresas, subempresas, empresaId, chaveMes, hojeIso],
  );

  const cobranca = useMemo(() => cobrancaCorrecao ?? cobrancasAbertas.find((r) => r.id === cobrancaId) ?? null, [cobrancaCorrecao, cobrancasAbertas, cobrancaId]);
  const sub = useMemo(() => {
    const id = cobranca ? cobranca.subempresaId : subempresaId;
    return subempresas.find((s) => s.id === id) ?? null;
  }, [subempresas, subempresaId, cobranca]);
  const empresa = useMemo(() => empresas.find((e) => e.id === empresaId) ?? null, [empresas, empresaId]);

  const nomeSub = (id: string | null) => id ? subempresas.find((s) => s.id === id)?.nome ?? '—' : 'Cliente direto';

  const clienteDireto = empresa?.tipoCadastro === 'cliente_direto';
  // Valor de referência: da cobrança selecionada (parcela), cliente no local ou cliente direto.
  const valorCombinado = cobranca ? cobranca.valorCombinado : sub?.valorCombinado ?? empresa?.valorCombinado ?? null;

  const valorRecebido = valorTexto === '' ? null : parseValorBR(valorTexto);
  const tipo = valorCombinado != null && valorRecebido != null ? tipoDiferenca(valorCombinado, valorRecebido) : null;
  const precisaObs = tipo === 'menor' || tipo === 'maior';
  const destinoSelecionado = Boolean(cobranca || (cobrancasAbertas.length === 0 && (sub || clienteDireto)));
  const valorValido = valorRecebido != null && !Number.isNaN(valorRecebido) && valorRecebido >= 0;
  const podeConfirmar = Boolean(empresa) && destinoSelecionado && valorValido && Boolean(formaPagamento) && (!precisaObs || Boolean(observacao.trim()));

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

  function selecionarComprovante(arquivo: File | null) {
    setErro('');
    if (!arquivo) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type)) {
      setComprovante(null);
      setErro('Use uma imagem JPG, PNG ou WEBP.');
      return;
    }
    if (arquivo.size > 6 * 1024 * 1024) {
      setComprovante(null);
      setErro('O comprovante deve ter no máximo 6 MB.');
      return;
    }
    setComprovante(arquivo);
  }

  async function confirmar() {
    setErro('');
    if (!empresa) return setErro('Selecione a empresa.');
    if (!cobranca && !sub && !clienteDireto) return setErro('Selecione um vencimento ou o cliente.');
    if (valorRecebido == null || Number.isNaN(valorRecebido) || valorRecebido < 0)
      return setErro('Informe um valor recebido válido.');
    if (!formaPagamento) return setErro('Selecione a forma de pagamento.');
    if (precisaObs && !observacao.trim())
      return setErro('Há diferença de valor: a observação é obrigatória.');
    if (cobrancaCorrecao && !dataPagamentoDoMes()) {
      return setErro('Selecione o mês do pagamento para reenviar a correção.');
    }

    const resumo: ResumoRecebimento = {
      empresaNome: empresa.nome,
      subempresaNome: sub?.nome ?? (clienteDireto ? 'Cliente direto' : nomeSub(cobranca?.subempresaId ?? '')),
      valorCombinado: valorCombinado ?? 0,
      valorRecebido: Number(valorRecebido.toFixed(2)),
      formaPagamento,
      temComprovante: Boolean(comprovante),
      tipo: tipo ?? 'exato',
    };

    setSalvando(true);
    try {
      if (cobranca) {
        await onReceberCobranca(
          cobranca.id,
          Number(valorRecebido.toFixed(2)),
          observacao,
          formaPagamento,
          comprovante,
          resumo,
          cobrancaCorrecao ? dataPagamentoDoMes() : null,
        );
      } else if (sub || clienteDireto) {
        await onConfirmar(empresa.id, sub?.id ?? null, Number(valorRecebido.toFixed(2)), observacao, formaPagamento, comprovante, resumo);
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível registrar o recebimento.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className={cobrancaCorrecao ? styles.formularioCorrecao : undefined}>
      {cobrancaCorrecao ? (
        <div className={`${styles.readonlyBox} ${styles.correcaoDestino}`}>
          <div className={styles.readonlyRow}><span>Empresa</span><span>{empresa?.nome ?? '—'}</span></div>
          <div className={styles.readonlyRow}><span>Cliente</span><span>{nomeSub(cobrancaCorrecao.subempresaId)}</span></div>
        </div>
      ) : (
        <div className={styles.field}>
          <label className={styles.label}>Empresa</label>
          <select className={styles.select} value={empresaId} onChange={(e) => selecionarEmpresa(e.target.value)}>
            <option value="">Selecione…</option>
            {empresasAtivas.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
        </div>
      )}

      {!cobrancaCorrecao && empresaId && cobrancasAbertas.length > 0 && (
        <div className={styles.atrasoBox}>
          <div className={styles.atrasoTitulo}>Próximo a vencer e vencidos ({cobrancasAbertas.length})</div>
          <p className={styles.atrasoDica}>
            São exibidos todos os vencidos e todos os clientes com vencimento na próxima data disponível.
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

      {!cobrancaCorrecao && !cobranca && cobrancasAbertas.length === 0 && !clienteDireto && (
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

      {(sub || clienteDireto) && (
        <div className={styles.readonlyBox} style={{ marginBottom: 12 }}>
          <div className={styles.readonlyRow}><span>Endereço/local</span><span>{sub?.endereco ?? empresa?.endereco ?? '—'}</span></div>
          <div className={styles.readonlyRow}><span>Responsável</span><span>{sub?.responsavel ?? empresa?.responsavel ?? '—'}</span></div>
          {cobranca ? (
            <div className={styles.readonlyRow}><span>Vencimento da parcela</span><span>{formatarData(cobranca.vencimento)}</span></div>
          ) : (
            <div className={styles.readonlyRow}><span>Recebimento</span><span>{sub ? rotuloFrequenciaRecebimento(sub.frequenciaRecebimento) : empresa?.frequenciaRecebimento ? rotuloFrequenciaRecebimento(empresa.frequenciaRecebimento) : '—'}</span></div>
          )}
          <div className={styles.readonlyRow}><span>Valor contratado</span><span>{formatarMoeda(valorCombinado ?? 0)}</span></div>
        </div>
      )}

      {cobrancaCorrecao && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="recebimentos-mes-pagamento">Mês do pagamento</label>
          <div className={styles.campoMesPagamento}>
            <input
              id="recebimentos-mes-pagamento"
              className={`${styles.input} ${styles.inputMesPagamento}`}
              type="month"
              value={mesPagamento}
              onChange={(event) => setMesPagamento(event.target.value)}
              aria-describedby="recebimentos-mes-pagamento-ajuda"
            />
            <span className={styles.campoMesPagamentoValor} aria-hidden="true">{rotuloMesPagamento}</span>
          </div>
          <small id="recebimentos-mes-pagamento-ajuda" className={styles.ajudaCampo}>
            Altera somente o mês do pagamento. O vencimento original permanece o mesmo.
          </small>
        </div>
      )}

      <div className={styles.recebimentoDadosGrid}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="recebimentos-valor-recebido">Valor recebido</label>
          <div className={styles.inputSufixoWrap}>
            <span className={styles.inputSufixo} aria-hidden="true">R$</span>
            <input
              id="recebimentos-valor-recebido"
              className={styles.inputInterno}
              inputMode="numeric"
              placeholder="0,00"
              value={valorTexto}
              onChange={(e) => setValorTexto(formatarValorInput(e.target.value))}
              aria-label="Valor recebido em reais"
            />
          </div>
          {textoDiferenca() && <div className={styles.diferencaValor}>{textoDiferenca()}</div>}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="recebimentos-forma-colaborador">Forma de pagamento</label>
          <select
            id="recebimentos-forma-colaborador"
            className={styles.select}
            value={formaPagamento}
            onChange={(event) => setFormaPagamento(event.target.value as FormaPagamentoRecebimento | '')}
          >
            <option value="" disabled>Selecione…</option>
            {FORMAS_PAGAMENTO_RECEBIMENTO.map(([valor, rotulo]) => (
              <option key={valor} value={valor}>{rotulo}</option>
            ))}
          </select>
        </div>
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

      <input
        ref={comprovanteInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className={styles.inputArquivoOculto}
        onChange={(event) => selecionarComprovante(event.target.files?.[0] ?? null)}
        tabIndex={-1}
      />
      <div className={styles.acoesRecebimentoColaborador}>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancelar}>
          Cancelar
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnGhost} ${comprovante ? styles.btnComprovanteSelecionado : ''}`}
          onClick={() => comprovanteInput.current?.click()}
          aria-label={comprovante ? `Substituir comprovante: ${comprovante.name}` : 'Adicionar comprovante'}
          title={comprovante?.name}
          disabled={salvando}
        >
          <svg className={styles.iconeComprovante} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="8.5" cy="9" r="1.5" />
            <path d="m5 17 4.5-4 3.5 3 2.5-2 3.5 3" />
          </svg>
          <span>{comprovante ? 'Comprovante ✓' : 'Comprovante'}</span>
        </button>
        <button type="button" disabled={salvando || !podeConfirmar} className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => void confirmar()}>
          {salvando ? 'Registrando…' : cobrancaCorrecao ? 'Enviar correção' : 'Confirmar'}
        </button>
      </div>
      {comprovante && (
        <div className={styles.comprovanteArquivo} role="status">
          <span>{comprovante.name}</span>
          <button type="button" onClick={() => { setComprovante(null); if (comprovanteInput.current) comprovanteInput.current.value = ''; }} disabled={salvando}>
            Remover
          </button>
        </div>
      )}
    </div>
  );
}
