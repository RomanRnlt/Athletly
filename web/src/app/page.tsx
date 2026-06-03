'use client';

// Mirrors mobile/app/index.tsx: redirect to the plan tab. The RoutingGate in
// providers.tsx handles auth/consent gating before this is reached.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/plan');
  }, [router]);
  return null;
}
