'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import PasswordInput from '@/components/auth/PasswordInput';
import { getConfiguredOAuthProviders, type OAuthProviderId } from '@/utils/auth/oauth';
import { persistRememberPreference } from '@/utils/auth/session-persistence';

type Mode = 'signin' | 'forgot';

/**
 * The sign-in form.
 *
 * Supabase behaviour is unchanged from the previous inline implementation:
 * email/password sign-in via `signInWithPassword`, then a push to /dashboard.
 * On top of that it now wires up:
 *   - remember me     -> records the persistence decision before the session is
 *                        written (see utils/auth/session-persistence.ts);
 *   - forgot password -> a real `resetPasswordForEmail` call;
 *   - social logins   -> real `signInWithOAuth`, disabled unless the provider is
 *                        listed in NEXT_PUBLIC_OAUTH_PROVIDERS.
 */
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
  const [oauthBusy, setOauthBusy] = useState<OAuthProviderId | null>(null);

  const providers = getConfiguredOAuthProviders();

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    // Recorded before sign-in so the session cookie and the decision agree.
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

  async function handleOAuth(provider: OAuthProviderId) {
    setError('');
    setNotice('');
    setOauthBusy(provider);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });

    if (oauthError) {
      setError(oauthError.message);
      setOauthBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-ink">
          {mode === 'signin' ? 'Welcome back' : 'Reset your password'}
        </h2>
        <p className="text-sm text-muted">
          {mode === 'signin'
            ? 'Sign in to continue to your dashboard.'
            : 'Enter your email and we will send you a link to choose a new password.'}
        </p>
      </header>

      {error && (
        <div className="alert-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert-success" role="status">
          {notice}
        </div>
      )}

      <form
        onSubmit={mode === 'signin' ? handleSignIn : handleForgot}
        className="space-y-4"
        noValidate
      >
        <div>
          <label htmlFor="login-email" className="form-label">
            Email address
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="form-input"
            placeholder="you@example.com"
          />
        </div>

        {mode === 'signin' && (
          <PasswordInput
            id="login-password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
          />
        )}

        {mode === 'signin' && (
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-muted">
              <input
                type="checkbox"
                name="remember-me"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="rounded"
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => {
                setMode('forgot');
                setError('');
                setNotice('');
              }}
              className="text-sm text-brand"
            >
              Forgot password?
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`btn btn-primary w-full ${loading ? 'is-loading' : ''}`}
          style={{ padding: '0.5625rem 1rem', fontSize: '0.9375rem' }}
        >
          <span className="btn-label">
            {mode === 'signin'
              ? loading
                ? 'Signing in…'
                : 'Sign in'
              : loading
                ? 'Sending…'
                : 'Send reset link'}
          </span>
        </button>

        {mode === 'forgot' && (
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError('');
              setNotice('');
            }}
            className="btn-ghost w-full"
          >
            Back to sign in
          </button>
        )}
      </form>

      {mode === 'signin' && (
        <>
          <div className="flex items-center gap-3" role="separator" aria-label="or">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-2">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            {providers.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => handleOAuth(provider.id)}
                disabled={!provider.enabled || oauthBusy !== null}
                aria-disabled={!provider.enabled}
                title={
                  provider.enabled
                    ? `Continue with ${provider.label}`
                    : `${provider.label} sign-in is not configured.`
                }
                className="btn-secondary w-full"
              >
                {oauthBusy === provider.id
                  ? `Connecting to ${provider.label}…`
                  : `Continue with ${provider.label}`}
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-muted">
            No account yet?{' '}
            <Link href="/create-account" className="text-brand font-medium">
              Create account
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
