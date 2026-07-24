'use client';

import { useEffect, useRef, useState } from 'react';
import {
  analisarBackupExcel,
  gerarBackupExcel,
  importarBackupExcelAtualizar,
  importarBackupExcelSubstituir,
  type AnaliseBackupImportacao,
  type ModoImportacaoBackup,
  type ResultadoImportacaoBackup,
} from '../lib/exportacao';

type DadosMobile = {
  empresaId: string;
  nomePerfil: string;
  tipoPerfil: string;
  despesasCadastradas: { nome: string; categoria?: string }[];
  darkMode: boolean;
  duplicadosAtivo: boolean;
};

type Aviso = { titulo: string; mensagem: string; tipo: 'alerta' | 'erro' | 'sucesso'; recarregar?: boolean };

function resumoImportacao(resultado: ResultadoImportacaoBackup, modo: ModoImportacaoBackup) {
  const adicionados = resultado.despesasBaseInseridas + resultado.lancamentosInseridos + resultado.receitasEntradasInseridas + resultado.receitasTotaisInseridas + resultado.recorrenciasInseridas;
  const atualizados = (resultado.despesasBaseAtualizadas || 0) + (resultado.lancamentosAtualizados || 0) + (resultado.receitasEntradasAtualizadas || 0) + (resultado.receitasTotaisAtualizadas || 0) + (resultado.recorrenciasAtualizadas || 0);
  const removidos = (resultado.despesasBaseRemovidas || 0) + (resultado.lancamentosRemovidos || 0) + (resultado.receitasEntradasRemovidas || 0) + (resultado.receitasTotaisRemovidas || 0) + (resultado.recorrenciasRemovidas || 0);
  return [
    modo === 'substituir' ? 'Copia limpa importada.' : 'Dados atualizados.',
    `Registros adicionados: ${adicionados}`,
    modo === 'atualizar' ? `Registros atualizados: ${atualizados}` : `Registros removidos anteriormente: ${removidos}`,
  ].join('\n');
}

export default function BackupMobileBridge() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dados, setDados] = useState<DadosMobile | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [analise, setAnalise] = useState<AnaliseBackupImportacao | null>(null);
  const [modo, setModo] = useState<ModoImportacaoBackup>('atualizar');
  const [confirmacao, setConfirmacao] = useState('');
  const [processando, setProcessando] = useState(false);
  const [confirmarBackup, setConfirmarBackup] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  useEffect(() => {
    const receber = (evento: Event) => {
      const detalhe = (evento as CustomEvent<{ acao: 'backup' | 'restauracao'; dados: DadosMobile }>).detail;
      if (!detalhe?.dados?.empresaId) return;
      setDados(detalhe.dados);
      if (detalhe.acao === 'backup') setConfirmarBackup(true);
      if (detalhe.acao === 'restauracao') {
        setArquivo(null); setAnalise(null); setModo('atualizar'); setConfirmacao('');
        inputRef.current?.click();
      }
    };
    window.addEventListener('avantalab:mobile-backup', receber);
    return () => window.removeEventListener('avantalab:mobile-backup', receber);
  }, []);

  const abrirAviso = (titulo: string, mensagem: string, _acao?: () => void, tipo: 'alerta' | 'erro' | 'sucesso' = 'alerta') => {
    setAviso({ titulo, mensagem, tipo });
  };

  const parametrosBackup = (base: DadosMobile, prefixo = 'backup_avantalab') => ({
    empresaId: base.empresaId,
    nomePerfil: base.nomePerfil,
    tipoPerfil: base.tipoPerfil,
    despesasCadastradas: base.despesasCadastradas,
    logoUrl: '',
    logoSettings: { scale: 100, x: 0, y: 0 },
    corPrimaria: '#003E73',
    darkMode: base.darkMode,
    duplicadosAtivo: base.duplicadosAtivo,
    abrirAviso,
    setUltimoBackupEm: () => undefined,
    setNomeConfirmacaoExclusao: () => undefined,
    setModalExcluirEmpresa: () => undefined,
    nomeArquivoPrefixo: prefixo,
  });

  const gerar = async () => {
    if (!dados) return;
    setProcessando(true);
    try {
      await gerarBackupExcel(parametrosBackup(dados));
      setConfirmarBackup(false);
      setAviso({ titulo: 'Backup gerado', mensagem: 'O arquivo foi gerado com sucesso.', tipo: 'sucesso' });
    } catch (error) {
      setAviso({ titulo: 'Erro ao gerar backup', mensagem: error instanceof Error ? error.message : 'Nao foi possivel gerar o arquivo.', tipo: 'erro' });
    } finally { setProcessando(false); }
  };

  const selecionar = async (file?: File) => {
    if (!file) return;
    setProcessando(true);
    try {
      const resultado = await analisarBackupExcel(file);
      if (!resultado.valido) {
        setAviso({ titulo: 'Backup invalido', mensagem: resultado.erros.join('\n'), tipo: 'erro' });
        return;
      }
      setArquivo(file); setAnalise(resultado);
    } catch (error) {
      setAviso({ titulo: 'Erro ao ler backup', mensagem: error instanceof Error ? error.message : 'Arquivo invalido.', tipo: 'erro' });
    } finally { setProcessando(false); }
  };

  const restaurar = async () => {
    if (!dados || !arquivo) return;
    if (modo === 'substituir' && confirmacao.trim().toUpperCase() !== 'SUBSTITUIR') return;
    setProcessando(true);
    try {
      await gerarBackupExcel(parametrosBackup(dados, 'ponto_restauracao_avantalab'));
      const resultado = modo === 'substituir'
        ? await importarBackupExcelSubstituir({ arquivo, empresaId: dados.empresaId })
        : await importarBackupExcelAtualizar({ arquivo, empresaId: dados.empresaId });
      setArquivo(null); setAnalise(null); setConfirmacao('');
      setAviso({ titulo: 'Restauracao concluida', mensagem: resumoImportacao(resultado, modo), tipo: 'sucesso', recarregar: true });
    } catch (error) {
      setAviso({ titulo: 'Erro na restauracao', mensagem: error instanceof Error ? error.message : 'Nao foi possivel importar o backup.', tipo: 'erro' });
    } finally { setProcessando(false); }
  };

  const fecharAviso = () => {
    const recarregar = aviso?.recarregar;
    setAviso(null);
    if (recarregar) window.location.reload();
  };

  const painel = 'av-modal-backdrop fixed inset-0 z-[7000] flex items-center justify-center bg-slate-950/85 px-3';
  const card = `av-modal-panel flex w-full max-w-md flex-col overflow-hidden rounded-2xl border shadow-2xl ${dados?.darkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'}`;

  return <>
    <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { void selecionar(e.target.files?.[0]); e.target.value = ''; }} />

    {confirmarBackup && <div className={painel}>
      <section className={card}>
        <header className="bg-[#003E73] px-4 py-3 text-white"><p className="text-[10px] font-black uppercase tracking-widest text-cyan-100">Configuracoes</p><h2 className="text-lg font-black">Gerar backup</h2></header>
        <div className="p-4 text-sm font-semibold leading-relaxed text-slate-600">Será gerado um arquivo Excel com os dados completos do perfil atual.</div>
        <footer className="flex gap-2 border-t border-slate-200 p-3"><button type="button" disabled={processando} onClick={() => setConfirmarBackup(false)} className="h-11 flex-1 rounded-xl border border-slate-300 text-xs font-black uppercase text-slate-600">Cancelar</button><button type="button" disabled={processando} onClick={() => void gerar()} className="h-11 flex-1 rounded-xl bg-[#003E73] text-xs font-black uppercase text-white disabled:opacity-60">{processando ? 'Gerando...' : 'Gerar backup'}</button></footer>
      </section>
    </div>}

    {analise && <div className={painel}>
      <section className={card}>
        <header className="shrink-0 bg-[#003E73] px-4 py-3 text-white"><p className="text-[10px] font-black uppercase tracking-widest text-cyan-100">Restauracao de dados</p><h2 className="text-lg font-black">Importar backup</h2></header>
        <div className="min-h-0 overflow-y-auto p-4">
          <div className="rounded-xl bg-slate-100 p-3 text-xs font-semibold text-slate-600"><p><strong>Arquivo:</strong> {analise.nomeArquivo}</p><p><strong>Perfil:</strong> {analise.perfilOrigem}</p><div className="mt-2 grid grid-cols-2 gap-1"><span>Despesas: {analise.totalLancamentos}</span><span>Entradas: {analise.totalReceitasEntradas}</span><span>Totais: {analise.totalReceitasTotais}</span><span>Fixas: {analise.totalRecorrencias}</span></div></div>
          <div className="mt-3 grid gap-2">
            <button type="button" onClick={() => setModo('atualizar')} className={`rounded-xl border p-3 text-left ${modo === 'atualizar' ? 'border-cyan-600 bg-cyan-50' : 'border-slate-200'}`}><strong className="block text-xs uppercase">Atualizar dados</strong><span className="text-[11px] text-slate-500">Atualiza e adiciona registros sem apagar toda a base.</span></button>
            <button type="button" onClick={() => setModo('substituir')} className={`rounded-xl border p-3 text-left ${modo === 'substituir' ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}><strong className="block text-xs uppercase text-red-700">Importar copia limpa</strong><span className="text-[11px] text-slate-500">Apaga os dados financeiros atuais antes de importar.</span></button>
          </div>
          {modo === 'substituir' && <label className="mt-3 block text-xs font-bold text-red-700">Digite SUBSTITUIR para confirmar<input value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-red-200 px-3 text-base font-black uppercase text-slate-900 outline-none" /></label>}
          <p className="mt-3 text-[11px] font-semibold text-slate-500">Antes da importacao, um ponto de restauracao sera baixado automaticamente.</p>
        </div>
        <footer className="flex shrink-0 gap-2 border-t border-slate-200 p-3"><button type="button" disabled={processando} onClick={() => { setAnalise(null); setArquivo(null); }} className="h-11 flex-1 rounded-xl border border-slate-300 text-xs font-black uppercase text-slate-600">Cancelar</button><button type="button" disabled={processando || (modo === 'substituir' && confirmacao.trim().toUpperCase() !== 'SUBSTITUIR')} onClick={() => void restaurar()} className={`h-11 flex-1 rounded-xl text-xs font-black uppercase text-white disabled:opacity-40 ${modo === 'substituir' ? 'bg-red-700' : 'bg-emerald-600'}`}>{processando ? 'Importando...' : 'Importar'}</button></footer>
      </section>
    </div>}

    {aviso && <div className={painel}><section className={card}><header className="bg-[#003E73] px-4 py-3 text-white"><h2 className="text-lg font-black">{aviso.titulo}</h2></header><div className="whitespace-pre-line p-4 text-sm font-semibold leading-relaxed text-slate-600">{aviso.mensagem}</div><footer className="border-t border-slate-200 p-3"><button type="button" onClick={fecharAviso} className="h-11 w-full rounded-xl bg-[#003E73] text-xs font-black uppercase text-white">OK</button></footer></section></div>}
  </>;
}
