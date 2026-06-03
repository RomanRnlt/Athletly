'use client';

// Registers the app-shell service worker. Guarded so it only runs in the
// browser and only in production (no SW noise during `next dev`).
import { useEffect } from 'react';

export function ServiceWorkerRegistration(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // A failed SW registration must never break the app.
      });
    };
    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
