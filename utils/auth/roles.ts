import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import type { Profile, UserRole } from '@/types';

export const STAFF_ROLES: UserRole[] = ['admin', 'nurse', 'bhw_head', 'bhw_purok'];
export const EDIT_ROLES: UserRole[] = ['bhw_head', 'bhw_purok', 'nurse'];

export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, purok, pregnant_mother_id, created_at')
    .eq('id', user.id)
    .maybeSingle();

  return { supabase, user, profile: profile as Profile | null };
}

export async function requireRoles(roles: UserRole[]) {
  const result = await getCurrentProfile();
  if (!result.user) redirect('/login');
  const role = (result.profile?.role ?? 'pending') as UserRole;
  if (!roles.includes(role)) redirect('/dashboard');
  return { ...result, profile: result.profile, role };
}

export function isStaffRole(role: string | null | undefined) {
  return !!role && STAFF_ROLES.includes(role as UserRole);
}