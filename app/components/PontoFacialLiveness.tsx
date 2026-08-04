'use client';

import { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { FaceLivenessDetector } from '@aws-amplify/ui-react-liveness';
import '@aws-amplify/ui-react/styles.css';

type Inicio = { empresaId: string; token: string; tipo: 'cadastro' | 'marcacao' };
type Sessao = Inicio & { sessaoId: string; regiao: string };

export default function PontoFacialLiveness({ identityPoolId }: { identityPoolId: string }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    if (!identityPoolId) return;
    Amplify.configure({ Auth: { Cognito: { identityPoolId, allowGuestAccess: true } } });
    const iniciar = async (event: Event) => {
      const inicio = (event as CustomEvent<Inicio>).detail;
      if (!inicio?.empresaId || !inicio.token) return;
      setMensagem('Preparando a câmera…');
      try {
        const resposta = await fetch('/api/ponto/reconhecimento-facial/sessao', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${inicio.token}` },
          body: JSON.stringify({ empresaId: inicio.empresaId, tipo: inicio.tipo }),
        });
        const dados = await resposta.json();
        if (!resposta.ok || dados.erro) throw new Error(dados.mensagem || 'Não foi possível iniciar a verificação.');
        setSessao({ ...inicio, sessaoId: dados.sessaoId, regiao: dados.regiao }); setMensagem('');
      } catch (erro) {
        const detalhe = erro instanceof Error ? erro.message : 'Não foi possível iniciar a verificação.';
        setMensagem(detalhe); window.dispatchEvent(new CustomEvent('avantalab:facial-erro', { detail: { mensagem: detalhe } }));
      }
    };
    window.addEventListener('avantalab:facial-iniciar', iniciar);
    return () => window.removeEventListener('avantalab:facial-iniciar', iniciar);
  }, [identityPoolId]);

  const concluir = async () => {
    if (!sessao) return;
    setMensagem('Confirmando identidade…');
    try {
      const resposta = await fetch('/api/ponto/reconhecimento-facial/resultado', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessao.token}` },
        body: JSON.stringify({ empresaId: sessao.empresaId, sessaoId: sessao.sessaoId }),
      });
      const dados = await resposta.json();
      if (!resposta.ok || !dados.aprovado) throw new Error(dados.mensagem || 'Identidade não confirmada.');
      window.dispatchEvent(new CustomEvent('avantalab:facial-concluido', { detail: { tipo: sessao.tipo } })); setSessao(null); setMensagem('');
    } catch (erro) {
      const detalhe = erro instanceof Error ? erro.message : 'Não foi possível confirmar a identidade.';
      setMensagem(detalhe); window.dispatchEvent(new CustomEvent('avantalab:facial-erro', { detail: { mensagem: detalhe } }));
    }
  };

  if (!sessao && !mensagem) return null;
  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/90 p-4" role="dialog" aria-modal="true" aria-label="Verificação facial">
    <div className="mx-auto w-full max-w-xl rounded-3xl bg-white p-4 shadow-2xl">
      <h2 className="text-base font-black text-slate-900">Confirmação facial</h2>
      <p className="mt-1 text-sm font-semibold text-slate-600" role="status">{mensagem || 'Siga as instruções na tela. A câmera é usada somente nesta confirmação.'}</p>
      {sessao && <FaceLivenessDetector sessionId={sessao.sessaoId} region={sessao.regiao} onAnalysisComplete={concluir} onError={() => setMensagem('A câmera não conseguiu concluir a verificação. Tente novamente.')} onUserCancel={() => { setSessao(null); setMensagem(''); window.dispatchEvent(new CustomEvent('avantalab:facial-cancelado')); }} />}
      {mensagem && <button type="button" className="mt-4 min-h-11 w-full rounded-xl bg-slate-900 px-4 text-sm font-black text-white" onClick={() => { setSessao(null); setMensagem(''); window.dispatchEvent(new CustomEvent('avantalab:facial-cancelado')); }}>Voltar</button>}
    </div>
  </div>;
}
