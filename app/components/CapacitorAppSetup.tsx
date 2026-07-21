'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export default function CapacitorAppSetup() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      document.documentElement.classList.add('capacitor-native');
      document.body.classList.add('capacitor-native');
    }
  }, []);

  return null;
}