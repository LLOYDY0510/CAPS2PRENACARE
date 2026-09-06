'use client';
 
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
 
export default function CreateAccountPage() {
  const router = useRouter();
  const supabase = createClient();
 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
 
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
 
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!serialNo.trim() || !contactNumber.trim()) {
      setError('Serial number and contact number are required.');
      return;
    }
 
    setLoading(true);
 
    // 1. Create the auth account
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
 
    if (signUpError || !signUpData.user) {
      setError(signUpError?.message ?? 'Failed to create account.');
      setLoading(false);
      return;
    }
 
    // 2. Find her existing maternal record using serial number + contact number
    const { data: motherRecord, error: matchError } = await supabase
      .from('pregnant_mothers')
      .select('id, full_name')
      .eq('serial_no', serialNo.trim())
      .eq('contact_number', contactNumber.trim())
      .maybeSingle();
 
    if (matchError || !motherRecord) {
      setError(
        'Account was created, but we could not find a matching record. Please double-check your Serial Number and Contact Number, or contact your BHW for help linking your account.'
      );
      setLoading(false);
      return;
    }
 
    // 3. Link the new account to her record
    const { error: linkError } = await supabase
      .from('profiles')
      .update({
        role: 'pregnant_mother',
        pregnant_mother_id: motherRecord.id,
        full_name: motherRecord.full_name,
      })
      .eq('id', signUpData.user.id);
 
    setLoading(false);
 
    if (linkError) {
      setError(
        'Account was created, but linking to your record failed. Please contact your BHW or admin for help.'
      );
      return;
    }
 
    router.push('/dashboard');
  }
 
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl text-ink">Prenatrack</h1>
          <p className="text-muted text-sm mt-1">Create your account</p>
        </div>
 
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
          )}
 
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
 
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
 
          <div className="border-t pt-4">
            <p className="text-xs text-muted-2 mb-3">
              Enter the details from your registration slip to link your account to your record.
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">Serial Number</label>
              <input
                type="text"
                value={serialNo}
                onChange={(e) => setSerialNo(e.target.value)}
                placeholder="e.g. SPM-2026-0001"
                required
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium mb-1">Contact Number</label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="The number you gave during registration"
                required
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
 
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50 transition"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
 
          <p className="text-center text-sm text-muted">
            Already have an account?{' '}
            <Link href="/login" className="text-brand hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}