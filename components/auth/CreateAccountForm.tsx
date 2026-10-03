'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import PasswordInput from '@/components/auth/PasswordInput';

type Status = 'idle' | 'creating';

/**
 * Self-service account creation for pregnant mothers.
 *
 * Behaviour is unchanged from the previous page-local implementation: sign up,
 * fall back to a password sign-in when email confirmation is off, then link the
 * new account to a record with POST /api/account/link.
 */
export default function CreateAccountForm() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const busy = status === 'creating';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!serialNo.trim() || !contactNumber.trim()) {
      setError('Serial number and contact number are required to link your record.');
      return;
    }

    setStatus('creating');

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setStatus('idle');
        return;
      }

      if (!signUpData.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (signInError) {
          setNotice(
            'Your account was created. Please confirm your email address, then log in and finish linking your record.',
          );
          setStatus('idle');
          return;
        }
      }

      const response = await fetch('/api/account/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialNo: serialNo.trim(), contactNumber: contactNumber.trim() }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          result.error ??
            'Your account was created, but linking your record failed. Please contact your BHW or admin.',
        );
        setStatus('idle');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setStatus('idle');
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-ink">Create account</h2>
        <p className="text-sm text-muted">Link your prenatal record to sign in.</p>
      </header>

      {error && (
        <p className="alert-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="alert-success" role="status">
          {notice}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="form-label" htmlFor="create-email">
            Email
          </label>
          <input
            id="create-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="form-input"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PasswordInput
            label="Password"
            id="create-password"
            name="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            required
          />
          <PasswordInput
            label="Confirm"
            id="create-confirm-password"
            name="confirm-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="border-t border-[#EEF1F4] pt-4 space-y-3">
          <p className="text-xs text-muted">
            Enter the details from your registration slip to link your account to your record.
          </p>
          <div>
            <label className="form-label" htmlFor="create-serial-no">
              Serial Number
            </label>
            <input
              id="create-serial-no"
              name="serialNo"
              type="text"
              value={serialNo}
              onChange={(event) => setSerialNo(event.target.value)}
              placeholder="e.g. SPM-2026-0001"
              className="form-input"
              required
            />
          </div>
          <div>
            <label className="form-label" htmlFor="create-contact-number">
              Contact Number
            </label>
            <input
              id="create-contact-number"
              name="contactNumber"
              type="tel"
              value={contactNumber}
              onChange={(event) => setContactNumber(event.target.value)}
              placeholder="The number you gave during registration"
              className="form-input"
              required
            />
          </div>
        </div>

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-brand font-medium">
          Log in
        </Link>
      </p>
    </div>
  );
}
