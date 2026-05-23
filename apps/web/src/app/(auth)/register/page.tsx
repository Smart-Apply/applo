'use client';

import { Suspense } from 'react';
import { AuthContainer } from '@/components/auth/auth-container';

export default function RegisterPage() {
  // Suspense boundary is required because AuthContainer reads
  // `useSearchParams()` (to surface OAuth callback errors via toast).
  // Without it, Next.js refuses to statically prerender /register.
  return (
    <Suspense fallback={null}>
      <AuthContainer initialMode="register" />
    </Suspense>
  );
}
