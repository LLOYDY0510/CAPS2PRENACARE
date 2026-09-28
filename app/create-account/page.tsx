'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

type Status = 'idle' | 'creating';

export default function CreateAccountPage() {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
            'Your account was created. Please confirm your email address, then log in and finish linking your record.'
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
        setError(result.error ?? 'Your account was created, but linking your record failed. Please contact your BHW or admin.');
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
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16 max-w-4xl w-full">
        <div className="flex flex-col items-center md:items-start text-center md:text-left shrink-0">
          <div className="w-40 h-40 md:w-52 md:h-52 rounded-full overflow-hidden bg-brand-light mb-4 relative ring-1 ring-[#D0E9E7]">
            <Image
              src="/logo.jpg"
              alt="Prenatrack logo"
              fill
              sizes="(max-width: 768px) 160px, 208px"
              className="object-contain"
              priority
            />
          </div>
          <p className="text-sm text-muted">Care for mothers &amp; babies</p>
        </div>

        <div className="card p-7 md:p-9 w-full max-w-sm">
          <h1 className="text-xl text-center mb-1">Create Account</h1>
          <p className="text-sm text-muted text-center mb-6">
            Link your prenatal record to sign in.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <p className="alert-error mb-4" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="alert-success mb-4" role="status">
                {notice}
              </p>
            )}

            <div className="mb-4">
              <label className="form-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="confirm-password">
                  Confirm
                </label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="border-t border-[#EEF1F4] pt-4 mb-4">
              <p className="text-xs text-muted mb-3">
                Enter the details from your registration slip to link your account to your record.
              </p>
              <div className="mb-3">
                <label className="form-label" htmlFor="serial-no">
                  Serial Number
                </label>
                <input
                  id="serial-no"
                  name="serialNo"
                  type="text"
                  value={serialNo}
                  onChange={(e) => setSerialNo(e.target.value)}
                  placeholder="e.g. SPM-2026-0001"
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="contact-number">
                  Contact Number
                </label>
                <input
                  id="contact-number"
                  name="contactNumber"
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="The number you gave during registration"
                  className="form-input"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? 'Creating account…' : 'Create Account'}
            </button>

            <p className="text-center text-sm text-muted mt-5">
              Already have an account?{' '}
              <Link href="/login" className="text-brand font-medium">
                Log in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
