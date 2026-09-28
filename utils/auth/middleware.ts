import { redirect } from 'next/navigation';
import { getCurrentProfile } from './roles';
import {
  canAccessPurok,
  canEditRiskMap,
  canManageHealthTips,
  canManageRiskIndicators,
  canManageUsers,
  hasPermission,
  ROLE_PERMISSIONS,
} from './permissions';
import type { UserRole } from '@/types';

type PermissionKey = keyof typeof ROLE_PERMISSIONS[UserRole];

async function requireAuth() {
  const result = await getCurrentProfile();
  if (!result.user) redirect('/login');
  const role = (result.profile?.role ?? 'pending') as UserRole;
  return { ...result, role };
}

/**
 * Middleware to protect routes based on role and permissions
 * Use this in server components to ensure users have proper access
 */
export async function requirePermission(permission: PermissionKey) {
  const result = await requireAuth();
  if (!hasPermission(result.role, permission)) {
    redirect('/dashboard');
  }
  return result;
}

/**
 * Middleware to protect routes that require user management access
 */
export async function requireUserManagement() {
  const result = await requireAuth();
  if (!canManageUsers(result.role)) {
    redirect('/dashboard');
  }
  return result;
}

/**
 * Middleware to protect routes that require BHW management access
 * Admin and bhw_head can manage BHW assignments
 */
export async function requireBhwManagement() {
  const result = await requireAuth();
  if (!['admin', 'bhw_head'].includes(result.role)) {
    redirect('/dashboard');
  }
  return result;
}

/**
 * Middleware to protect routes that require role management access
 */
export async function requireRoleManagement() {
  const result = await requireAuth();
  if (!canManageUsers(result.role)) {
    redirect('/dashboard');
  }
  return result;
}

/**
 * Middleware to protect routes that require risk map editing access
 */
export async function requireRiskMapEdit() {
  const result = await requireAuth();
  if (!canEditRiskMap(result.role)) {
    redirect('/dashboard');
  }
  return result;
}

/**
 * Middleware to protect routes that require health tips management access
 */
export async function requireHealthTipsManagement() {
  const result = await requireAuth();
  if (!canManageHealthTips(result.role)) {
    redirect('/dashboard');
  }
  return result;
}

/**
 * Middleware to protect routes that require risk indicators management access
 */
export async function requireRiskIndicatorsManagement() {
  const result = await requireAuth();
  if (!canManageRiskIndicators(result.role)) {
    redirect('/dashboard');
  }
  return result;
}

/**
 * Middleware to protect routes that require access to a specific purok
 */
export async function requirePurokAccess(targetPurok: string | null) {
  const result = await requireAuth();
  if (!canAccessPurok(result.role, result.profile?.purok ?? null, targetPurok)) {
    redirect('/dashboard');
  }
  return result;
}
