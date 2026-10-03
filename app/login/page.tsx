import type { Metadata } from 'next';
import AuthLayout from '@/components/auth/AuthLayout';
import BrandPanel from '@/components/auth/BrandPanel';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Sign in — Prenatrack',
};

export default function LoginPage() {
  return (
    <AuthLayout brand={<BrandPanel />}>
      <LoginForm />
    </AuthLayout>
  );
}
