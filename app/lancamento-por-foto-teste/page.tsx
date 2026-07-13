'use client';

import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

type Perfil = { id: string; nome: string; tipo: string };
type Leitura = {
  data_documento: string | null;
  valor_total: number | null;
  despesa_sugerida: string | null;
  confianca_data: number;
  confianca_valor: number;
  confianca_despesa: number;
  observacao: string;
};

const TESTE_LOCAL = process.env.NODE_ENV !== 'production';
const TIPOS_TESTE_PADRAO = 'Alimentação, Combustível, Compras, Marketing, Serviços, Transporte, Impostos';

function CameraIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M4 7h3l1.4-2h7.2L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.5" /></svg>;
}

function UploadIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M12 16V3M7 8l5-5 5 5M5 21h14" /></svg>;
}

function confidenceLabel(value: number) {
  if (value >= 0.85) return 'Alta confiança';
  if (value >= 0.6) return 'Revisar';
  return 'Baixa confiança';
}

function confidenceClass(value: number) {
  if (value >= 0.85) return 'bg-emerald-50 text-emerald-700';
  if (value >= 0.6) return 'bg-amber-50 text-amber-700';
  return 'bg-rose-50 text-rose-700';
}

function comPrazo<T>(promessa: PromiseLike<T>, mensagem: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const prazo = window.setTimeout(() => reject(new Error(mensagem)), 10000);
    Promise.resolve(promessa).then(resolve, reject).finally(() => window.clearTimeout(prazo));
  });
}

export default function LancamentoPorFotoTestePage() {
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [perfilId, setPerfilId] = useState('');
  const [tiposDespesa, setTiposDespesa] = useState<string[]>([]);
  const [tiposTeste, setTiposTeste] = useState(TIPOS_TESTE_PADRAO);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [leitura, setLeitura] = useState<Leitura | null>(null);
  const [data, setData] = useState('');
  const [valor, setValor] = useState('');
  const [despesa, setDespesa] = useState('');
  const [carregando, setCarregando] = useState(!TESTE_LOCAL);
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState('');

  const carregarPerfis = useCallback(async () => {
    setCarregando(true);
    try {
      const { data: sessao } = await comPrazo(supabase.auth.getSession(), 'Não foi possível verificar sua sessão agora.');
      const userId = sessao.session?.user.id;
      if (!userId) throw new Error('Entre pelo AvantaLab antes de abrir este laboratório.');

      const { data: vinculos, error: erroVinculos } = await comPrazo(
        supabase.from('usuarios_empresa').select('empresa_id').eq('user_id', userId).eq('status', 'ativo'),
        'Não foi possível carregar seus perfis agora.',
      );
      const ids = [...new Set((vinculos || []).map((vinculo) => String(vinculo.empresa_id || '')).filter(Boolean))];
      if (erroVinculos || !ids.length) throw new Error('Não foi possível encontrar seus perfis para o teste.');

      const { data: empresas, error: erroEmpresas } = await comPrazo(
        supabase.from('empresas').select('id, nome, tipo_perfil').in('id', ids).order('nome', { ascending: true }),
        'Não foi possível carregar os perfis agora.',
      );
      if (erroEmpresas || !empresas?.length) throw new Error('Não foi possível carregar os perfis para o teste.');

      const opcoes = empresas.map((empresa) => ({
        id: String(empresa.id),
        nome: String(empresa.nome || 'Perfil sem nome'),
        tipo: String(empresa.tipo_perfil || 'empresa'),
      }));
      setPerfis(opcoes);
      setPerfilId((atual) => atual || opcoes[0].id);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível preparar o laboratório.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (TESTE_LOCAL) return;
    const agendamento = window.setTimeout(() => { void carregarPerfis(); }, 0);
    return () => window.clearTimeout(agendamento);
  }, [carregarPerfis]);

  useEffect(() => {
    if (!perfilId) return;
    void (async () => {
      try {
        const { data: despesas } = await comPrazo(
          supabase.from('despesas_cadastradas').select('nome').eq('empresa_id', perfilId).order('nome', { ascending: true }),
          'Não foi possível carregar os tipos de despesa agora.',
        );
        setTiposDespesa([...new Set((despesas || []).map((item) => String(item.nome || '').trim()).filter(Boolean))]);
      } catch (error) {
        setErro(error instanceof Error ? error.message : 'Não foi possível carregar os tipos de despesa.');
      }
    })();
  }, [perfilId]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const analisarArquivo = useCallback(async (proximoArquivo: File) => {
    if (!TESTE_LOCAL && !perfilId) {
      setErro('Escolha um perfil antes de selecionar a imagem.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(proximoArquivo.type)) {
      setErro('Use uma imagem JPG, PNG ou WEBP neste teste.');
      return;
    }
    if (proximoArquivo.size > 6 * 1024 * 1024) {
      setErro('A imagem deve ter no máximo 6 MB.');
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setArquivo(proximoArquivo);
    setPreviewUrl(URL.createObjectURL(proximoArquivo));
    setLeitura(null);
    setData('');
    setValor('');
    setDespesa('');
    setErro('');
    setAnalisando(true);

    try {
      let token = '';
      if (!TESTE_LOCAL) {
        const { data: sessao } = await supabase.auth.getSession();
        token = sessao.session?.access_token || '';
        if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
      }

      const form = new FormData();
      form.append('arquivo', proximoArquivo);
      form.append('empresaId', perfilId);
      form.append('tiposDespesa', tiposTeste);
      const resposta = await fetch('/api/lancamento-foto-teste', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok || json.erro) throw new Error(json.mensagem || 'Não foi possível ler a imagem.');

      const proximaLeitura = json.leitura as Leitura;
      setLeitura(proximaLeitura);
      setData(proximaLeitura.data_documento || '');
      setValor(proximaLeitura.valor_total !== null ? String(proximaLeitura.valor_total) : '');
      setDespesa(proximaLeitura.despesa_sugerida || '');
      setTiposDespesa((atuais) => json.tiposDespesa?.length ? json.tiposDespesa : atuais);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível ler esta imagem.');
    } finally {
      setAnalisando(false);
    }
  }, [perfilId, previewUrl, tiposTeste]);

  const escolherImagem = (event: ChangeEvent<HTMLInputElement>) => {
    const selecionado = event.target.files?.[0];
    event.target.value = '';
    if (selecionado) void analisarArquivo(selecionado);
  };

  const limparTeste = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setArquivo(null);
    setPreviewUrl('');
    setLeitura(null);
    setData('');
    setValor('');
    setDespesa('');
    setErro('');
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:py-10">
      <div className="mx-auto max-w-md">
        <header className="rounded-t-2xl bg-[#003E73] px-5 py-4 text-white shadow-lg">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">Laboratório isolado</p>
          <h1 className="mt-1 text-lg font-black">Lançamento por foto</h1>
          <p className="mt-1 text-xs leading-relaxed text-cyan-50/90">A imagem é lida para teste e não é salva no sistema.</p>
        </header>

        <section className="rounded-b-2xl bg-white p-4 shadow-xl shadow-slate-300/40">
          {carregando ? <p className="py-10 text-center text-sm font-semibold text-slate-500">Preparando o laboratório...</p> : !perfis.length && !TESTE_LOCAL ? <div className="py-10 text-center"><p className="text-sm font-semibold leading-relaxed text-rose-700">{erro || 'Não foi possível preparar o laboratório.'}</p><button type="button" onClick={() => void carregarPerfis()} className="mt-4 h-10 rounded-lg border border-slate-300 px-4 text-xs font-black uppercase tracking-wide text-slate-700 transition-transform active:scale-95 hover:bg-slate-50">Tentar novamente</button></div> : <>
            {TESTE_LOCAL ? <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide text-slate-600">Tipos disponíveis para sugestão
              <input value={tiposTeste} onChange={(event) => setTiposTeste(event.target.value)} className="h-11 rounded-lg border border-slate-300 px-3 text-sm font-bold normal-case tracking-normal outline-none focus:border-cyan-600" />
            </label> : <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide text-slate-600">
              Perfil para teste
              <select value={perfilId} onChange={(event) => { setPerfilId(event.target.value); limparTeste(); }} className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-base font-bold normal-case tracking-normal outline-none focus:border-cyan-600">
                {perfis.map((perfil) => <option key={perfil.id} value={perfil.id}>{perfil.nome} · {perfil.tipo === 'pessoal' ? 'Pessoal' : 'Empresa'}</option>)}
              </select>
            </label>}

            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-slate-600">Documento</p>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => cameraInput.current?.click()} disabled={analisando} className="flex h-9 items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 text-[11px] font-black uppercase tracking-wide text-cyan-800 transition-transform active:scale-95 disabled:opacity-50" aria-label="Fotografar documento"><CameraIcon />Foto</button>
                <button type="button" onClick={() => fileInput.current?.click()} disabled={analisando} className="flex h-9 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 text-[11px] font-black uppercase tracking-wide text-slate-700 transition-transform active:scale-95 disabled:opacity-50" aria-label="Carregar arquivo de imagem"><UploadIcon />Arquivo</button>
              </div>
            </div>
            <input ref={cameraInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={escolherImagem} />
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={escolherImagem} />

            {!arquivo && <div className="mt-3 flex min-h-44 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center text-sm font-semibold leading-relaxed text-slate-400">Fotografe ou escolha uma nota, cupom ou comprovante para testar a leitura.</div>}
            {previewUrl && <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {/* A prévia usa uma URL local temporária, que não pode ser otimizada pelo next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Documento selecionado para leitura" className="max-h-64 w-full object-contain" />
            </div>}

            {analisando && <div className="mt-3 flex items-center gap-3 rounded-xl bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-900"><span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-700 border-t-transparent" />Lendo data, valor e tipo de despesa...</div>}
            {erro && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-700">{erro}</p>}

            {leitura && <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-sm font-black text-slate-900">Prévia da leitura</h2><span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Não será salva</span></div>
              <div className="grid gap-3">
                <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-600">Data do documento
                  <input type="date" value={data} onChange={(event) => setData(event.target.value)} className="h-11 rounded-lg border border-slate-300 px-3 text-base font-bold normal-case tracking-normal outline-none focus:border-cyan-600" />
                  <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-black normal-case tracking-normal ${confidenceClass(leitura.confianca_data)}`}>{confidenceLabel(leitura.confianca_data)}</span>
                </label>
                <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-600">Valor total
                  <input type="number" min="0" step="0.01" value={valor} onChange={(event) => setValor(event.target.value)} placeholder="0,00" className="h-11 rounded-lg border border-slate-300 px-3 text-base font-bold normal-case tracking-normal outline-none focus:border-cyan-600" />
                  <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-black normal-case tracking-normal ${confidenceClass(leitura.confianca_valor)}`}>{confidenceLabel(leitura.confianca_valor)}</span>
                </label>
                <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-600">Tipo de despesa sugerido
                  <select value={despesa} onChange={(event) => setDespesa(event.target.value)} className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-base font-bold normal-case tracking-normal outline-none focus:border-cyan-600">
                    <option value="">Selecione</option>
                    {tiposDespesa.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                  </select>
                  <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-black normal-case tracking-normal ${confidenceClass(leitura.confianca_despesa)}`}>{confidenceLabel(leitura.confianca_despesa)}</span>
                </label>
              </div>
              {leitura.observacao && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-900">{leitura.observacao}</p>}
              <button type="button" onClick={limparTeste} className="mt-4 h-10 w-full rounded-lg border border-slate-300 text-xs font-black uppercase tracking-wide text-slate-700 transition-transform active:scale-[0.98] hover:bg-slate-50">Testar outra imagem</button>
            </div>}
          </>}
        </section>
      </div>
    </main>
  );
}
