'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import TelaCarregandoAcesso from './TelaCarregandoAcesso';
import {
  lerRetornoOauthPendente,
  limparEstadoRetornoOauthGestao,
} from '../lib/oauth-retorno';

const TEMPO_LIMITE_RETORNO_MS = 12_000;
const TEMPO_LIMITE_VERIFICACAO_MS = 4_000;

function erroRetornoOAuth(): string | null {
  const parametros = new URLSearchParams(window.location.search);
  const fragmento = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return parametros.get('error_description')
    || fragmento.get('error_description')
    || parametros.get('error')
    || fragmento.get('error');
}

function retornoOAuthGestaoSolicitado(): boolean {
  return new URLSearchParams(window.location.search).get('retorno') === 'gestao'
    || Boolean(lerRetornoOauthPendente());
}

function mensagemRetornoOAuth(erro: string | null): string {
  const texto = String(erro || '').toLowerCase();
  if (
    texto.includes('access_denied')
    || texto.includes('cancel')
    || texto.includes('denied')
  ) {
    return 'O login social foi cancelado. Você pode tentar novamente.';
  }
  return 'Não foi possível concluir o login social. Tente novamente.';
}

function destinoSessaoAtiva(): '/gestao' | '/mobile' {
  const agente = navigator.userAgent;
  const dispositivoMovel = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobi/i.test(agente);
  const iPadComIdentificacaoDeDesktop = navigator.platform === 'MacIntel'
    && navigator.maxTouchPoints > 1;
  return dispositivoMovel || iPadComIdentificacaoDeDesktop ? '/mobile' : '/gestao';
}

/**
 * Protege a raiz pública durante a confirmação da sessão. Com sessão ativa ou
 * retorno OAuth, a landing nunca é exibida: a mesma cena da Gestão permanece
 * visível até a navegação terminar. Sem sessão, libera a landing normalmente.
 */
export default function RedirecionamentoPosOAuth() {
  const [estado, setEstado] = useState<'verificando' | 'publico'>('verificando');

  useEffect(() => {
    let ativo = true;
    let temporizador: number | null = null;
    const retornoSolicitado = retornoOAuthGestaoSolicitado();

    const limparTemporizador = () => {
      if (temporizador !== null) window.clearTimeout(temporizador);
      temporizador = null;
    };

    const liberarLanding = () => {
      if (!ativo) return;
      limparTemporizador();
      setEstado('publico');
    };

    const abrirGestao = () => {
      if (!ativo) return;
      ativo = false;
      limparTemporizador();
      limparEstadoRetornoOauthGestao();
      window.location.replace(retornoSolicitado ? '/gestao' : destinoSessaoAtiva());
    };

    const voltarAoLogin = (mensagem: string) => {
      if (!ativo) return;
      ativo = false;
      limparTemporizador();
      limparEstadoRetornoOauthGestao();
      window.location.replace(`/gestao?entrar=1&oauthErro=${encodeURIComponent(mensagem)}`);
    };

    const erroOAuth = erroRetornoOAuth();
    if (erroOAuth) {
      voltarAoLogin(mensagemRetornoOAuth(erroOAuth));
      return undefined;
    }

    temporizador = window.setTimeout(() => {
      if (retornoSolicitado) {
        voltarAoLogin('Não foi possível confirmar sua sessão. Tente entrar novamente.');
      } else {
        liberarLanding();
      }
    }, retornoSolicitado ? TEMPO_LIMITE_RETORNO_MS : TEMPO_LIMITE_VERIFICACAO_MS);

    const { data: listener } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (sessao) abrirGestao();
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!ativo) return;
      if (data.session) {
        abrirGestao();
        return;
      }

      if (!retornoSolicitado) {
        if (error) console.error('Não foi possível verificar a sessão da landing:', error);
        liberarLanding();
        return;
      }
    }).catch((erro) => {
      if (!ativo) return;
      console.error('Falha ao processar o retorno de autenticação:', erro);
      if (retornoSolicitado) {
        voltarAoLogin('Não foi possível confirmar sua sessão. Tente entrar novamente.');
      } else {
        liberarLanding();
      }
    });

    return () => {
      ativo = false;
      limparTemporizador();
      listener.subscription.unsubscribe();
    };
  }, []);

  if (estado === 'publico') return null;

  return (
    <div className="fixed inset-0 z-[20000]">
      <TelaCarregandoAcesso
        titulo="Preparando acesso"
        mensagem="Verificando sua sessão..."
      />
    </div>
  );
}
