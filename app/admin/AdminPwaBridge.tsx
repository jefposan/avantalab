'use client';

import { useEffect } from 'react';
import { APP_VERSION } from '../lib/version';

export default function AdminPwaBridge() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register(`/admin-sw.js?v=${encodeURIComponent(APP_VERSION)}`, {
        scope: '/admin',
        updateViaCache: 'none',
      })
      .then((registro) => registro.update())
      .catch(() => undefined);
  }, []);

  return null;
}
