'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmail } from '../../lib/auth/supabaseAuth';
import { useAuth } from '../../lib/auth/AuthContext';
import '../../styles/globals.css';

const initialState = {
  email: '',
  password: ''
};

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [router, user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.email || !form.password) {
      setError('Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await signInWithEmail({
        email: form.email.trim(),
        password: form.password
      });
      setMessage('Successfully signed in! Redirecting...');
      router.push('/');
      router.refresh();
    } catch (authError) {
      setError(authError.message || 'Unable to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to manage your bus schedules securely.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            className="auth-input"
            placeholder="you@example.com"
          />

          <label className="auth-label" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            className="auth-input"
            placeholder="Enter your password"
          />

          {error && <p className="auth-feedback error">{error}</p>}
          {message && <p className="auth-feedback success">{message}</p>}

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <span>New here?</span>
          <Link href="/signup" className="auth-link">Create an account</Link>
        </div>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1f2933, #3f4c6b, #273043);
          padding: 24px;
        }

        .auth-card {
          width: 100%;
          max-width: 420px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 18px;
          padding: 36px;
          box-shadow: 0 30px 60px rgba(15, 23, 42, 0.25);
          backdrop-filter: blur(6px);
        }

        .auth-title {
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 700;
          color: #1f2933;
        }

        .auth-subtitle {
          margin: 0 0 32px 0;
          color: #475569;
          font-size: 15px;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .auth-label {
          font-size: 13px;
          font-weight: 600;
          color: #475569;
        }

        .auth-input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid rgba(148, 163, 184, 0.6);
          border-radius: 10px;
          font-size: 15px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .auth-input:focus {
          border-color: #475569;
          box-shadow: 0 0 0 3px rgba(71, 85, 105, 0.2);
          outline: none;
        }

        .auth-button {
          margin-top: 8px;
          padding: 12px 14px;
          background: #1f2933;
          color: white;
          border: none;
          border-radius: 999px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .auth-button:hover:not([disabled]) {
          transform: translateY(-1px);
          box-shadow: 0 10px 20px rgba(15, 23, 42, 0.25);
        }

        .auth-button[disabled] {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-feedback {
          margin: 0;
          font-size: 13px;
          border-radius: 8px;
          padding: 10px 12px;
        }

        .auth-feedback.error {
          background: rgba(220, 38, 38, 0.1);
          color: #b91c1c;
        }

        .auth-feedback.success {
          background: rgba(34, 197, 94, 0.12);
          color: #047857;
        }

        .auth-footer {
          margin-top: 28px;
          display: flex;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          color: #475569;
        }

        .auth-link {
          color: #1d4ed8;
          font-weight: 600;
        }

        .auth-link:hover {
          text-decoration: underline;
        }

        @media (max-width: 480px) {
          .auth-card {
            padding: 28px;
            border-radius: 16px;
          }

          .auth-title {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}
