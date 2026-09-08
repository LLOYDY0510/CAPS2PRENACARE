'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: '#F4F6F8' }}
    >
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-[380px] shrink-0 p-10"
        style={{ background: '#1A2F3A', color: '#fff' }}
      >
        <div>
          <div className="w-12 h-12 rounded-lg overflow-hidden relative mb-8">
            <Image src="/logo.jpg" alt="Prenatrack" fill className="object-cover" priority />
          </div>
          <h1
            className="text-2xl font-semibold mb-3 leading-snug"
            style={{ color: '#fff' }}
          >
            Prenatrack
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Maternal health tracking for barangay health workers and midwives.
          </p>
        </div>

        <div>
          <div
            className="rounded-lg p-4 mb-6"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
              Register mothers, monitor prenatal checkups, flag high-risk cases,
              and follow up by SMS — all from one shared record.
            </p>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>
            Prenatrack &copy; {new Date().getFullYear()} — Barangay Health System
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded overflow-hidden relative shrink-0">
              <Image src="/logo.jpg" alt="Prenatrack" fill className="object-cover" />
            </div>
            <span className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Prenatrack</span>
          </div>

          <h2 className="mb-1" style={{ fontSize: '1.25rem', color: 'var(--ink)' }}>
            Sign in to your account
          </h2>
          <p className="mb-7" style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
            Enter your credentials to continue.
          </p>

          <form onSubmit={handleLogin}>
            {error && (
              <div className="alert-error mb-5" role="alert">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="email" className="form-label">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
                placeholder="you@example.com"
              />
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <label
              className="flex items-center gap-2 mb-6 cursor-pointer select-none"
              style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}
            >
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="rounded"
                style={{ accentColor: 'var(--brand)' }}
              />
              Show password
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
              style={{ padding: '0.5625rem 1rem', fontSize: '0.9375rem' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <p
              className="text-center mt-5"
              style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}
            >
              No account yet?{' '}
              <Link href="/create-account" style={{ color: 'var(--brand)', fontWeight: 500 }}>
                Create account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
