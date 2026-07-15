'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import AvaChatClient from './ava/AvaChatClient';

type AvaOpenRequest = {
  ano?: number;
  mes?: string;
  empresaId?: string;
  empresaNome?: string;
  contexto?: string;
  darkMode?: boolean;
  accessToken?: string;
  userName?: string;
  userId?: string;
  environment?: 'gestao-mobile' | 'vendas';
};

export default function AvaMobileBridge() {
  const [request, setRequest] = useState<AvaOpenRequest | null>(null);

  useEffect(() => {
    const openChat = (event: Event) => {
      event.preventDefault();
      const detail = (event as CustomEvent<AvaOpenRequest>).detail || {};
      setRequest({
        ano: detail.ano,
        mes: detail.mes,
        empresaId: detail.empresaId,
        empresaNome: detail.empresaNome,
        contexto: detail.contexto,
        darkMode: detail.darkMode,
        accessToken: detail.accessToken,
        userName: detail.userName,
        userId: detail.userId,
        environment: detail.environment,
      });
    };

    window.addEventListener('avantalab:open-ava', openChat);
    return () => window.removeEventListener('avantalab:open-ava', openChat);
  }, []);

  const closeChat = useCallback(() => {
    setRequest(null);
  }, []);

  if (!request) return null;

  return createPortal(
    <AvaChatClient
      initialYear={request.ano}
      initialMonth={request.mes}
      initialCompanyId={request.empresaId}
      initialCompanyName={request.empresaNome}
      initialContext={request.contexto}
      initialDarkMode={request.darkMode}
      initialAccessToken={request.accessToken}
      initialUserName={request.userName}
      initialUserId={request.userId}
      initialEnvironment={request.environment}
      onClose={closeChat}
    />,
    document.body,
  );
}
