'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-[#1E2228] px-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="flex flex-col md:flex-row items-center gap-16 md:gap-20 max-w-4xl w-full">
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

        {/* Right — login card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 w-full max-w-sm">
          <h2 className="font-display text-2xl font-semibold text-[#1B3A4B] text-center mb-7">
            Log in
          </h2>

          <form onSubmit={handleLogin}>
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

            <div className="mb-2">
              <label className="font-body block text-xs font-medium text-[#6B7280] mb-1.5">
                Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="font-body w-full bg-[#F3F4F6] border border-transparent rounded-lg px-4 py-2.5 text-[#1B3A4B] focus:outline-none focus:ring-2 focus:ring-[#5EA8A0]/40 focus:bg-white focus:border-[#5EA8A0] transition"
              />
            </div>

            <label className="font-body flex items-center gap-2 text-sm text-[#6B7280] mb-6 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="rounded border-gray-300 text-[#5EA8A0] focus:ring-[#5EA8A0]"
              />
              Show password
            </label>

                        <button
              type="submit"
              disabled={loading}
              className="font-body w-full bg-[#5EA8A0] text-white font-semibold py-2.5 rounded-lg hover:bg-[#4C948C] disabled:opacity-50 transition"
            >
              {loading ? 'Logging in…' : 'Log in'}
            </button>

            <p className="font-body text-center text-sm text-[#6B7280] mt-5">
              Wala pang account?{' '}
              <Link href="/create-account" className="text-[#5EA8A0] hover:underline font-medium">
                Create Account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}