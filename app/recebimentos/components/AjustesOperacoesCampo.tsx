'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Modal } from '@/app/projetos/components/Modal';
import type { IntegracaoFinanceiraRecebimentos, RecebimentosRepo } from '../data/repo';
import styles from '../recebimentos.module.css';

type Props = {
  aberto: boolean;
  empresaId: string;
  repo: RecebimentosRepo;
  temaEscuro: boolean;
  onFechar: () => void;
  onTemaAtualizado: (temaEscuro: boolean) => void;
};

export default function AjustesOperacoesCampo({ aberto, empresaId, repo, temaEscuro, onFechar, onTemaAtualizado }: Props) {
  const referencia = useMemo(() => {
    const hoje = new Date();
    return { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };
  }, []);
  const [integracao, setIntegracao] = useState<IntegracaoFinanceiraRecebimentos | null>(null);
  const [nomeEntrada, setNomeEntrada] = useState('Recebimentos em campo');
  const [tituloEtiqueta, setTituloEtiqueta] = useState('Recebimentos');
  const [baseValor, setBaseValor] = useState<IntegracaoFinanceiraRecebimentos['baseValor']>('recebido');
  const [enviarResultados, setEnviarResultados] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [atualizandoTema, setAtualizandoTema] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!aberto) return;
    let ativo = true;
    setCarregando(true);
    setMensagem('');
    setErro('');
    repo.obterIntegracaoFinanceira(referencia.ano, referencia.mes)
      .then((dados) => {
        if (!ativo) return;
        setIntegracao(dados);
        setNomeEntrada(dados.nomeEntrada);
        setTituloEtiqueta(dados.tituloEtiqueta);
        setBaseValor(dados.baseValor);
        setEnviarResultados(dados.integrado);
      })
      .catch((falha) => {
        if (ativo) setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar os ajustes financeiros.');
      })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [aberto, referencia, repo]);

  async function salvarFinanceiro() {
    const nome = nomeEntrada.trim();
    const etiqueta = tituloEtiqueta.trim();
    setErro('');
    setMensagem('');
    if (!nome) { setErro('Informe o nome da entrada financeira.'); return; }
    if (!etiqueta) { setErro('Informe o título da etiqueta.'); return; }
    setSalvando(true);
    try {
      let dados = await repo.atualizarConfiguracaoFinanceira(referencia.ano, referencia.mes, nome, etiqueta, baseValor);
      if (dados.integrado !== enviarResultados) {
        dados = await repo.definirIntegracaoFinanceira(referencia.ano, referencia.mes, enviarResultados);
      }
      setIntegracao(dados);
      setEnviarResultados(dados.integrado);
      setMensagem('Ajustes financeiros atualizados. Os lançamentos automáticos foram recalculados.');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar os ajustes financeiros.');
    } finally {
      setSalvando(false);
    }
  }

  async function alterarTema() {
    if (atualizandoTema) return;
    const temaAnterior = temaEscuro;
    const novoTema = !temaAnterior;
    setErro('');
    setMensagem('');
    onTemaAtualizado(novoTema);
    setAtualizandoTema(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Sua sessão não está disponível. Volte ao AvantaLab e entre novamente.');
      const resposta = await fetch('/api/modulos/recebimentos/ajustes', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId, temaEscuro: novoTema }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados.mensagem || 'Não foi possível atualizar o modo visual.');
      setMensagem(novoTema ? 'Modo escuro ativado para este perfil.' : 'Modo claro ativado para este perfil.');
    } catch (falha) {
      onTemaAtualizado(temaAnterior);
      setErro(falha instanceof Error ? falha.message : 'Não foi possível atualizar o modo visual.');
    } finally {
      setAtualizandoTema(false);
    }
  }

  return (
    <Modal open={aberto} onClose={onFechar} title="Ajustes de Operações de Campo" description="Integração financeira e aparência do perfil." wide>
      <div className={styles.ajustesOperacoes}>
        <section className={styles.ajustesSecao} aria-labelledby="ajustes-financeiros">
          <div className={styles.ajustesSecaoCabecalho}>
            <div><h3 id="ajustes-financeiros">Resultados financeiros</h3><p>Escolha como os recebimentos deste módulo entram no resultado financeiro da empresa.</p></div>
            <label className={styles.ajustesCheck}><input type="checkbox" checked={enviarResultados} onChange={(event) => setEnviarResultados(event.target.checked)} disabled={carregando || salvando} /><span>Enviar para Resultados</span></label>
          </div>
          <div className={styles.ajustesCampos}>
            <label className={styles.field}><span>Nome da entrada</span><input className={styles.input} value={nomeEntrada} onChange={(event) => setNomeEntrada(event.target.value)} maxLength={120} disabled={carregando || salvando} /></label>
            <label className={styles.field}><span>Título da etiqueta</span><input className={styles.input} value={tituloEtiqueta} onChange={(event) => setTituloEtiqueta(event.target.value)} maxLength={40} disabled={carregando || salvando} /></label>
          </div>
          <fieldset className={styles.ajustesBaseValor} disabled={carregando || salvando || !enviarResultados}>
            <legend>Valor enviado para o resultado da empresa</legend>
            <label className={`${styles.ajustesOpcaoValor} ${baseValor === 'recebido' ? styles.ajustesOpcaoValorAtiva : ''}`}><input type="radio" name="base-valor-recebimentos" value="recebido" checked={baseValor === 'recebido'} onChange={() => setBaseValor('recebido')} /><span><strong>Recebido e confirmado</strong><small>Considera somente os valores já conferidos e baixados.</small></span></label>
            <label className={`${styles.ajustesOpcaoValor} ${baseValor === 'programado' ? styles.ajustesOpcaoValorAtiva : ''}`}><input type="radio" name="base-valor-recebimentos" value="programado" checked={baseValor === 'programado'} onChange={() => setBaseValor('programado')} /><span><strong>Programado no vencimento</strong><small>Considera o valor contratado dos vencimentos previstos no mês.</small></span></label>
          </fieldset>
          <p className={styles.ajustesAjuda}>Ao salvar, o sistema recalcula somente as entradas automáticas de Operações de Campo em todos os meses. Os demais lançamentos e históricos financeiros permanecem preservados.</p>
          <div className={styles.ajustesAcoes}><button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => void salvarFinanceiro()} disabled={carregando || salvando}>{salvando ? 'Salvando…' : 'Salvar resultados financeiros'}</button></div>
        </section>

        <section className={`${styles.ajustesSecao} ${styles.ajustesSecaoCompacta}`} aria-label="Modo escuro">
          <strong>Modo escuro</strong>
          <button type="button" className={styles.ajustesTemaSwitch} role="switch" aria-label="Modo escuro" aria-checked={temaEscuro} aria-busy={atualizandoTema || undefined} onClick={() => void alterarTema()} disabled={atualizandoTema}><span>{temaEscuro ? 'ON' : 'OFF'}</span><i aria-hidden="true" /></button>
        </section>

        {(erro || mensagem) && <p className={erro ? styles.ajustesErro : styles.ajustesSucesso} role={erro ? 'alert' : 'status'} aria-live="polite">{erro || mensagem}</p>}
      </div>
    </Modal>
  );
}
