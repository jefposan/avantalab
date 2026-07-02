'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import AvaChatClient from './ava/AvaChatClient';

type AvaOpenRequest = {
  ano?: number;
  mes?: string;
};

export default function AvaMobileBridge() {
  const [request, setRequest] = useState<AvaOpenRequest | null>(null);

  useEffect(() => {
    const openChat = (event: Event) => {
      event.preventDefault();
      const detail = (event as CustomEvent<AvaOpenRequest>).detail || {};
      setRequest({ ano: detail.ano, mes: detail.mes });
    };

    window.addEventListener('avantalab:open-ava', openChat);
    return () => window.removeEventListener('avantalab:open-ava', openChat);
  }, []);

  const closeChat = useCallback(() => {
    setRequest(null);
  }, []);

  if (!request) return null;

  return createPortal(
    <AvaChatClient initialYear={request.ano} initialMonth={request.mes} onClose={closeChat} />,
    document.body,
  );
}
