import type { ReactNode } from 'react';

/**
 * The responsive shell shared by every auth screen (login, create account,
 * reset password).
 *
 * Desktop: brand panel and form sit side by side.
 * Mobile: they stack, branding above the form, and the form stays inside the
 * viewport with no horizontal scrolling.
 *
 * Styling intentionally uses only the existing design-system utilities and
 * tokens — no new colours, fonts, imagery or animation are introduced here.
 */
export default function AuthLayout({
  brand,
  children,
}: {
  brand: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background">
      <div className="order-1 w-full lg:w-[380px] lg:shrink-0">{brand}</div>

      <div className="order-2 flex-1 min-w-0 flex items-start lg:items-center justify-center px-4 sm:px-6 py-8 lg:py-12">
        <div className="w-full max-w-sm min-w-0">{children}</div>
      </div>
    </div>
  );
}
