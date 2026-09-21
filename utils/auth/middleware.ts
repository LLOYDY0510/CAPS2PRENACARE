import { redirect } from 'next/navigation';
import { getCurrentProfile } from './roles';
import { canAccessPurok, canManageUsers, canManageRoles, canEditRiskMap, canManageHealthTips, canManageRiskIndicators } from './permissions';
import type { UserRole } from '@/types';

/**
 * Middleware to protect routes based on role and permissions
 * Use this in server components to ensure users have proper access
 */
export async function requirePermission(permission: keyof ReturnType<typeof import('./permissions').ROLE_PERMISSIONS[UserRole]>) {
  const result = await getCurrentProfile();
  if (!result.user) redirect('/login');
  
  const { hasPermission } = await import('./permissions');
  const role = (result.profile?.role ?? 'pending') as UserRole;
  
  if (!hasPermission(role, permission)) {
    redirect('/dashboard');
  }
  
  return { ...result, role };
}

/**
 * Middleware to protect routes that require user management access
 */
export async function requireUserManagement() {
  const result = await getCurrentProfile();
  if (!result.user) redirect('/login');
  
  const role = (result.profile?.role ?? 'pending') as UserRole;
  
  // Only admin can manage users
  if (role !== 'admin') {
    redirect('/dashboard');
  }
  
  return { ...result, role };
}

/**
 * Middleware to protect routes that require BHW management access
 * Admin and bhw_head can manage BHW assignments
 */
export async function requireBhwManagement() {
  const result = await getCurrentProfile();
  if (!result.user) redirect('/login');
  
  const role = (result.profile?.role ?? 'pending') as UserRole;
  
  // Only admin and bhw_head can manage BHW assignments
  if (!['admin', 'bhw_head'].includes(role)) {
    redirect('/dashboard');
  }
  
  return { ...result, role };
}

/**
 * Middleware to protect routes that require role management access
 */
export async function requireRoleManagement() {
  const result = await getCurrentProfile();
  if (!result.user) redirect('/login');
  
  const role = (result.profile?.role ?? 'pending') as UserRole;
  
  if (!canManageRoles(role)) {
    redirect('/dashboard');
  }
  
  return { ...result, role };
}

/**
 * Middleware to protect routes that require risk map editing access
 */
export async function requireRiskMapEdit() {
  const result = await getCurrentProfile();
  if (!result.user) redirect('/login');
  
  const role = (result.profile?.role ?? 'pending') as UserRole;
  
  if (!canEditRiskMap(role)) {
    redirect('/dashboard');
  }
  
  return { ...result, role };
}

/**
 * Middleware to protect routes that require health tips management access
 */
export async function requireHealthTipsManagement() {
  const result = await getCurrentProfile();
  if (!result.user) redirect('/login');
  
  const role = (result.profile?.role ?? 'pending') as UserRole;
  
  if (!canManageHealthTips(role)) {
    redirect('/dashboard');
  }
  
  return { ...result, role };
}

/**
 * Middleware to protect routes that require risk indicators management access
 */
export async function requireRiskIndicatorsManagement() {
  const result = await getCurrentProfile();
  if (!result.user) redirect('/login');
  
  const role = (result.profile?.role ?? 'pending') as UserRole;
  
  if (!canManageRiskIndicators(role)) {
    redirect('/dashboard');
  }
  
  return { ...result, role };
}

/**
 * Middleware to protect routes that require access to a specific purok
 */
export async function requirePurokAccess(targetPurok: string | null) {
  const result = await getCurrentProfile();
  if (!result.user) redirect('/login');
  
  const role = (result.profile?.role ?? 'pending') as UserRole;
  const userPurok = result.profile?.purok ?? null;
  
  if (!canAccessPurok(role, userPurok, targetPurok)) {
    redirect('/dashboard');
  }
  
  return { ...result, role };
}
