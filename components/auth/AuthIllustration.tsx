import { HeartPulse, Calendar, MapPin, ClipboardList, ShieldCheck } from 'lucide-react';

/**
 * Left-side maternal health themed illustration panel.
 * - Soft greenish gradient backdrop matching design system tokens
 * - Animated ambient green glows in the background layer
 * - Clean SVG illustration with pregnant mother icon & medical symbol
 * - Floating soft elements around it (calendar, health record, map pin, heart badge)
 * - Small welcome line at bottom
 * - Hidden on mobile view (< 1024px)
 */
export default function AuthIllustration() {
  return (
    <div className="hidden lg:flex flex-col justify-between p-8 xl:p-10 bg-gradient-to-br from-[var(--brand-light)] via-[#E3F2F0] to-[var(--brand-subtle)] border-r border-[var(--border-light)] relative overflow-hidden select-none">
      {/* Animated Green Ambient Glows in the background of left illustration section */}
      <div 
        aria-hidden="true" 
        className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-[var(--brand)] opacity-30 blur-3xl pointer-events-none animate-green-pulse" 
      />
      <div 
        aria-hidden="true" 
        className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-[var(--brand-subtle)] opacity-60 blur-3xl pointer-events-none animate-green-pulse-alt" 
      />
      <div 
        aria-hidden="true" 
        className="absolute -bottom-12 -right-12 w-64 h-64 rounded-full bg-[var(--brand-dark)] opacity-25 blur-3xl pointer-events-none animate-green-pulse" 
      />

      {/* Floating Soft Badge Header */}
      <div className="relative z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-white/90 text-[var(--brand-dark)] w-fit text-xs font-semibold shadow-xs">
        <ShieldCheck className="w-4 h-4 text-[var(--brand)]" />
        <span>Barangay Maternal Care Network</span>
      </div>

      {/* Hero Maternal Health Illustration Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-6 py-4">
        {/* Floating Soft Icons around illustration */}
        <div className="relative w-full max-w-[280px] h-[260px] flex items-center justify-center">

          {/* Floating Item 1: Calendar (Top Left) */}
          <div className="absolute top-2 left-0 p-3 rounded-2xl bg-white/90 backdrop-blur-sm shadow-md border border-[var(--border-light)] text-[var(--brand)] animate-bounce-gentle">
            <Calendar className="w-6 h-6" />
          </div>

          {/* Floating Item 2: Map Pin (Top Right) */}
          <div className="absolute top-4 right-2 p-3 rounded-2xl bg-white/90 backdrop-blur-sm shadow-md border border-[var(--border-light)] text-[var(--accent)] animate-bounce-gentle-delayed">
            <MapPin className="w-6 h-6" />
          </div>

          {/* Floating Item 3: Health Records (Bottom Left) */}
          <div className="absolute bottom-4 left-2 p-3 rounded-2xl bg-white/90 backdrop-blur-sm shadow-md border border-[var(--border-light)] text-[var(--brand-dark)] animate-bounce-gentle-delayed">
            <ClipboardList className="w-6 h-6" />
          </div>

          {/* Floating Item 4: Heartbeat Pulse (Bottom Right) */}
          <div className="absolute bottom-2 right-0 p-3 rounded-2xl bg-white/90 backdrop-blur-sm shadow-md border border-[var(--border-light)] text-[var(--danger)] animate-bounce-gentle">
            <HeartPulse className="w-6 h-6" />
          </div>

          {/* Center Maternal Health Custom SVG Illustration */}
          <div className="relative w-44 h-44 rounded-full bg-white/90 backdrop-blur-md p-4 shadow-lg border border-white flex items-center justify-center">
            {/* Animated green ring halo around illustration badge */}
            <div 
              aria-hidden="true" 
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-[var(--brand)] via-[var(--brand-subtle)] to-[var(--brand-light)] opacity-40 blur-md animate-green-pulse" 
            />

            <svg
              viewBox="0 0 160 160"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="relative z-10 w-full h-full text-[var(--brand)]"
              aria-hidden="true"
            >
              {/* Soft Circle Background */}
              <circle cx="80" cy="80" r="70" fill="var(--brand-light)" opacity="0.8" />
              <circle cx="80" cy="80" r="54" fill="var(--brand-subtle)" opacity="0.7" />
              
              {/* Pregnant Mother Silhouette SVG Artwork */}
              {/* Mother Head */}
              <circle cx="80" cy="46" r="16" fill="var(--brand)" />
              {/* Hair Back Accent */}
              <path d="M68 46C68 37.1634 73.3726 30 80 30C86.6274 30 92 37.1634 92 46C92 49 90 53 87 55C84 57 82 60 82 64H78C78 60 76 57 73 55C70 53 68 49 68 46Z" fill="var(--brand-dark)" />
              
              {/* Mother Neck & Bust */}
              <path d="M74 62H86V70H74V62Z" fill="var(--brand)" />
              
              {/* Pregnant Mother Torso & Belly */}
              <path
                d="M62 72C62 72 74 68 86 72C94 74.5 104 84 104 98C104 112 92 124 78 124C68 124 60 116 60 106V72Z"
                fill="var(--brand)"
              />
              
              {/* Heart over belly */}
              <path
                d="M82 98C82 94.6863 84.6863 92 88 92C91.3137 92 94 94.6863 94 98C94 102 88 106 88 106C88 106 82 102 82 98Z"
                fill="white"
              />

              {/* Protective Caring Hands Wrap */}
              <path
                d="M54 90C54 84 62 82 68 86C72 88.6 74 94 70 98C66 102 54 100 54 90Z"
                fill="var(--accent)"
                opacity="0.9"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Short Welcome Line at the bottom */}
      <div className="relative z-10 text-center pt-4 border-t border-[var(--brand)]/10">
        <p className="text-xs font-semibold text-[var(--ink)]">
          Empowering midwives &amp; health workers
        </p>
        <p className="text-[11px] text-[var(--muted)] mt-0.5">
          Streamlining prenatal monitoring for healthier barangay communities.
        </p>
      </div>
    </div>
  );
}
