'use client';

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  lerRetornoOauthPendente,
  limparRetornoOauthPendente,
} from '../lib/oauth-retorno';

function retornoTemErro(): boolean {
  const parametros = new URLSearchParams(window.location.search);
  const fragmento = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return Boolean(parametros.get('error') || fragmento.get('error'));
}

/** Processa somente a volta de um OAuth iniciado pela tela de Gestão. */
export default function RedirecionamentoPosOAuth() {
  useEffect(() => {
    let ativo = true;

    const redirecionarSeNecessario = (temSessao: boolean) => {
      const destino = lerRetornoOauthPendente();
      if (!ativo || !temSessao || !destino) return;

      limparRetornoOauthPendente();
      window.location.replace(destino);
    };

    if (retornoTemErro()) {
      limparRetornoOauthPendente();
      return undefined;
    }

    void supabase.auth.getSession().then(({ data }) => {
      redirecionarSeNecessario(Boolean(data.session));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      redirecionarSeNecessario(Boolean(sessao));
    });

    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return null;
}
