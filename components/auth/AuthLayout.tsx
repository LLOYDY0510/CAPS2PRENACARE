import type { ReactNode } from 'react';
import Logo from '@/components/ui/Logo';
import AuthIllustration from '@/components/auth/AuthIllustration';

/**
 * Redesigned AuthLayout:
 * - Full-screen soft background with a light overlay and animated green ambient glows behind the main floating card.
 * - Large app title "Prenatrack" with both logos centered at the top above the main card.
 * - One large floating white card with rounded corners (24px), soft shadow, centered, max width 1000px, split into two equal halves on desktop.
 * - Fully responsive: stacks gracefully on mobile with no horizontal scroll.
 */
export default function AuthLayout({
  children,
  illustration,
  brand,
}: {
  children: ReactNode;
  illustration?: ReactNode;
  brand?: ReactNode;
}) {
  const leftSidePanel = illustration ?? <AuthIllustration />;

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-[var(--background)] overflow-x-hidden">
      {/* Dynamic Animated Green Background Ambient Orbs behind the whole card */}
      <div 
        aria-hidden="true" 
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[450px] rounded-full bg-[var(--brand)] opacity-20 blur-3xl pointer-events-none z-0 animate-green-pulse"
      />
      <div 
        aria-hidden="true" 
        className="fixed top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[380px] rounded-full bg-[var(--brand-subtle)] opacity-40 blur-3xl pointer-events-none z-0 animate-green-pulse-alt"
      />
      <div 
        aria-hidden="true" 
        className="fixed bottom-1/4 right-1/4 w-[480px] h-[360px] rounded-full bg-[var(--brand-light)] opacity-60 blur-3xl pointer-events-none z-0 animate-green-pulse"
      />

      {/* Light Blur Overlay for background depth */}
      <div 
        aria-hidden="true" 
        className="fixed inset-0 pointer-events-none z-0 bg-white/40 backdrop-blur-[2px]"
      />

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-[1000px] flex flex-col items-center my-auto py-6 sm:py-8">
        {/* Top Header: Centered Logos & Large App Title */}
        <header className="flex flex-col items-center text-center mb-6 sm:mb-8 anim-fade-up">
          <div className="flex items-center justify-center gap-3 mb-2.5">
            <Logo variant="prenatrack" size={48} priority className="shadow-xs rounded-xl" />
            <span className="text-[var(--muted-2)] font-light text-xl">/</span>
            <Logo variant="barangay" size={48} rounded priority className="shadow-xs" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
            Prenatrack
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)] mt-1 max-w-md">
            Maternal Health Tracking System for Barangay Care Workers &amp; Midwives
          </p>
        </header>

        {/* Large Floating Card (Rounded 24px, 2 halves) with Soft Tinted Backdrop */}
        <main className="w-full bg-[var(--surface)]/95 backdrop-blur-md border border-[var(--border-light)] rounded-[24px] shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-2 anim-slide-up">
          {/* Left Half: Maternal Health Illustration & Theme */}
          {leftSidePanel}

          {/* Right Half: Form Container */}
          <div className="p-6 sm:p-8 md:p-10 lg:p-12 flex flex-col justify-center min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
