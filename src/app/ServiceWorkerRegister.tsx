"use client";
import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js');
        // Optionally: navigator.serviceWorker.ready.then(() => console.log('SW ready'));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Service worker registration failed:', err);
      }
    };
    register();
  }, []);
  return null;
}


