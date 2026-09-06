'use client';
 
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
    <div className="min-h-screen flex items-center justify-center bg-[#1E2228] px-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="flex flex-col md:flex-row items-center gap-16 md:gap-20 max-w-4xl w-full py-10">
        {/* Left — logo */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left shrink-0">
          <div className="w-44 h-44 md:w-52 md:h-52 rounded-full overflow-hidden bg-[#1E2228] mb-5 relative ring-1 ring-white/10">
            <Image
              src="/logo.jpg"
              alt="Prenatrack logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <p className="font-body text-sm text-[#8A9099]">
            Care for mothers &amp; babies
          </p>
        </div>

        {/* Right — create account card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 w-full max-w-sm">
          <h2 className="font-display text-2xl font-semibold text-[#1B3A4B] text-center mb-7">
            Create Account
          </h2>

          <form onSubmit={handleSubmit}>
            {error && (
              <p className="font-body text-sm text-red-700 bg-red-50 border border-red-100 px-3 py-2 rounded-md mb-4">
                {error}
              </p>
            )}

            <div className="mb-4">
              <label className="font-body block text-xs font-medium text-[#6B7280] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="font-body w-full bg-[#F3F4F6] border border-transparent rounded-lg px-4 py-2.5 text-[#1B3A4B] focus:outline-none focus:ring-2 focus:ring-[#5EA8A0]/40 focus:bg-white focus:border-[#5EA8A0] transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="font-body block text-xs font-medium text-[#6B7280] mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="font-body w-full bg-[#F3F4F6] border border-transparent rounded-lg px-4 py-2.5 text-[#1B3A4B] focus:outline-none focus:ring-2 focus:ring-[#5EA8A0]/40 focus:bg-white focus:border-[#5EA8A0] transition"
                />
              </div>
              <div>
                <label className="font-body block text-xs font-medium text-[#6B7280] mb-1.5">
                  Confirm
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="font-body w-full bg-[#F3F4F6] border border-transparent rounded-lg px-4 py-2.5 text-[#1B3A4B] focus:outline-none focus:ring-2 focus:ring-[#5EA8A0]/40 focus:bg-white focus:border-[#5EA8A0] transition"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 mb-4">
              <p className="font-body text-xs text-[#8A9099] mb-3">
                Enter the details from your registration slip to link your account to your record.
              </p>
              <div className="mb-3">
                <label className="font-body block text-xs font-medium text-[#6B7280] mb-1.5">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={serialNo}
                  onChange={(e) => setSerialNo(e.target.value)}
                  placeholder="e.g. SPM-2026-0001"
                  required
                  className="font-body w-full bg-[#F3F4F6] border border-transparent rounded-lg px-4 py-2.5 text-[#1B3A4B] focus:outline-none focus:ring-2 focus:ring-[#5EA8A0]/40 focus:bg-white focus:border-[#5EA8A0] transition"
                />
              </div>
              <div>
                <label className="font-body block text-xs font-medium text-[#6B7280] mb-1.5">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="The number you gave during registration"
                  required
                  className="font-body w-full bg-[#F3F4F6] border border-transparent rounded-lg px-4 py-2.5 text-[#1B3A4B] focus:outline-none focus:ring-2 focus:ring-[#5EA8A0]/40 focus:bg-white focus:border-[#5EA8A0] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="font-body w-full bg-[#5EA8A0] text-white font-semibold py-2.5 rounded-lg hover:bg-[#4C948C] disabled:opacity-50 transition"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>

            <p className="font-body text-center text-sm text-[#6B7280] mt-5">
              Already have an account?{' '}
              <Link href="/login" className="text-[#5EA8A0] hover:underline font-medium">
                Log in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}