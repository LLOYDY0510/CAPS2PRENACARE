import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import LogoutButton from '../logout/page';

// Menu items per role. Add more roles here as we build them out.
const MENUS: Record<string, { label: string; href: string }[]> = {
  bhw_head: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Risk Mapping', href: '/dashboard/bhw' },
    { label: 'Register Pregnant Mother', href: '/dashboard/pregnant/new' },
    { label: 'Manage BHW (Purok)', href: '/dashboard/bhw' },
    { label: 'Pregnant Records', href: '/dashboard/pregnant' },
    { label: 'Prenatal Schedule', href: '/dashboard/schedule' },
    { label: 'Reports', href: '/dashboard/reports' },
  ],
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  const role = profile?.role ?? 'pending';
  const menuItems = MENUS[role] ?? [];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-5 border-b">
          <h2 className="font-semibold text-lg">Health System</h2>
          <p className="text-xs text-gray-500 mt-1 capitalize">
            {role.replace('_', ' ')}
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {menuItems.length === 0 && (
            <p className="text-sm text-gray-400 px-3 py-2">
              No menu available for this role yet.
            </p>
          )}
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t">
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}