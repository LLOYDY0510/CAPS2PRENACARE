'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, ArrowLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import PasswordInput from '@/components/auth/PasswordInput';
import { persistRememberPreference } from '@/utils/auth/session-persistence';

type Mode = 'signin' | 'forgot';

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    persistRememberPreference(rememberMe);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  async function handleForgot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!email.trim()) {
      setError('Enter the email address for your account first.');
      return;
    }

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setNotice('If an account exists for that email, a password reset link is on its way.');
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Tab-style Heading with accent underline */}
      <header className="border-b border-[var(--border-light)] pb-3">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError('');
              setNotice('');
            }}
            className={`relative pb-3 text-lg font-bold transition-colors ${
              mode === 'signin'
                ? 'text-[var(--ink)]'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Sign In
            {mode === 'signin' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand)] rounded-full" />
            )}
          </button>

          {mode === 'forgot' && (
            <span className="relative pb-3 text-lg font-bold text-[var(--ink)]">
              Reset Password
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand)] rounded-full" />
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--muted)] mt-2">
          {mode === 'signin'
            ? 'Sign in to access your maternal care dashboard.'
            : 'Enter your account email to receive a password reset link.'}
        </p>
      </header>

      {/* Alerts */}
      {error && (
        <div className="p-3 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger)] text-xs font-medium" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="p-3 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] text-[var(--success)] text-xs font-medium" role="status">
          {notice}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={mode === 'signin' ? handleSignIn : handleForgot}
        className="space-y-4"
        noValidate
      >
        {/* Email Input */}
        <div>
          <label htmlFor="login-email" className="form-label text-xs font-medium text-[var(--ink-secondary)] mb-1.5">
            Email Address
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center text-[var(--muted)]">
              <Mail className="w-5 h-5" />
            </div>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full h-11 pl-11 pr-4 bg-[var(--surface-alt)] hover:bg-[var(--surface-sunken)] focus:bg-[var(--surface)] border border-[var(--border)] focus:border-[var(--brand)] rounded-xl text-sm text-[var(--ink)] placeholder-[var(--placeholder)] transition-all outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
              placeholder="name@example.com"
            />
          </div>
        </div>

        {/* Password Input */}
        {mode === 'signin' && (
          <div>
            <PasswordInput
              id="login-password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              leftIcon={<Lock className="w-5 h-5" />}
              inputClassName="h-11 bg-[var(--surface-alt)] hover:bg-[var(--surface-sunken)] focus:bg-[var(--surface)] rounded-xl border-[var(--border)] focus:border-[var(--brand)] text-sm focus:ring-2 focus:ring-[var(--brand)]/20 transition-all"
            />
          </div>
        )}

        {/* Remember me & Forgot Password Row */}
        {mode === 'signin' && (
          <div className="flex items-center justify-between gap-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
              <input
                type="checkbox"
                name="remember-me"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="w-4 h-4 rounded border-[var(--border-strong)] text-[var(--brand)] focus:ring-[var(--brand)] accent-[var(--brand)] cursor-pointer"
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setMode('forgot');
                setError('');
                setNotice('');
              }}
              className="font-medium text-[var(--brand)] hover:text-[var(--brand-dark)] transition-colors hover:underline"
            >
              Forgot password?
            </button>
          </div>
        )}

        {/* Full-width Pill-shaped Primary Login Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 px-6 rounded-full bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-dark)] text-white font-semibold text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{mode === 'signin' ? 'Signing in…' : 'Sending link…'}</span>
            </>
          ) : (
            <span>{mode === 'signin' ? 'Sign In' : 'Send Reset Link'}</span>
          )}
        </button>

        {/* Back button for Forgot Password mode */}
        {mode === 'forgot' && (
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError('');
              setNotice('');
            }}
            className="w-full flex items-center justify-center gap-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] pt-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sign In</span>
          </button>
        )}
      </form>

      {/* Create Account Link Below */}
      {mode === 'signin' && (
        <div className="pt-2 text-center text-xs text-[var(--muted)] border-t border-[var(--border-light)]">
          Don&apos;t have an account?{' '}
          <Link
            href="/create-account"
            className="font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)] transition-colors hover:underline"
          >
            Create account
          </Link>
        </div>
      )}
    </div>
  );
}
