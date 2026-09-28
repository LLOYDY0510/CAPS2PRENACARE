import type { UserRole } from '@/types';

/**
 * Client-safe role helpers.
 *
 * This module must stay free of any server-only import (no `next/headers`, no
 * `@/utils/supabase/server`) so that client components can use the role
 * vocabulary without pulling server code into the browser bundle.
 */

export const STAFF_ROLES: UserRole[] = ['admin', 'nurse', 'bhw_head', 'bhw_purok'];
export const EDIT_ROLES: UserRole[] = ['bhw_head', 'bhw_purok', 'nurse'];

/** Every role that can exist on a profiles row, for server-side validation. */
export const USER_ROLES = [
  'pending',
  'bhw_head',
  'bhw_purok',
  'nurse',
  'admin',
  'pregnant_mother',
] as const satisfies readonly UserRole[];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}

export function isStaffRole(role: string | null | undefined) {
  return !!role && STAFF_ROLES.includes(role as UserRole);
}
