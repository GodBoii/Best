'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth/AuthContext';

export default function AuthGuard({ children }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, router, user]);

  if (loading || (!loading && !user)) {
    return (
      <div className="auth-guard-state">
        <div className="auth-guard-card">
          <span className="auth-guard-spinner" aria-hidden>⏳</span>
          <p>Verifying your session…</p>
        </div>
        <style jsx>{`
          .auth-guard-state {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f3f4f6;
          }

          .auth-guard-card {
            padding: 24px 28px;
            border-radius: 12px;
            background: white;
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.15);
            text-align: center;
            color: #1f2937;
            font-size: 15px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            min-width: 220px;
          }

          .auth-guard-spinner {
            font-size: 26px;
          }
        `}</style>
      </div>
    );
  }

  return children;
}
