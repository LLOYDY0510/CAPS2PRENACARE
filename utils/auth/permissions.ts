import type { UserRole } from '@/types';

// Define access permissions for each role
export const ROLE_PERMISSIONS = {
  admin: {
    canViewAllRecords: true,
    canManageUsers: true,
    canManageRoles: true,
    canViewRiskMap: true,
    canEditRiskMap: true,
    canViewAllPuroks: true,
    canManageAllPuroks: true,
    canSendSMS: true,
    canManageHealthTips: true,
    canManageRiskIndicators: true,
    canViewReports: true,
    canManageReferrals: true,
  },
  nurse: {
    canViewAllRecords: true,
    canManageUsers: false,
    canManageRoles: false,
    canViewRiskMap: true,
    canEditRiskMap: true,
    canViewAllPuroks: true,
    canManageAllPuroks: true,
    canSendSMS: true,
    canManageHealthTips: true,
    canManageRiskIndicators: true,
    canViewReports: true,
    canManageReferrals: true,
  },
  bhw_head: {
    canViewAllRecords: true,
    canManageUsers: false,
    canManageRoles: false,
    canViewRiskMap: true,
    canEditRiskMap: true,
    canViewAllPuroks: true,
    canManageAllPuroks: true,
    canSendSMS: true,
    canManageHealthTips: false,
    canManageRiskIndicators: false,
    canViewReports: true,
    canManageReferrals: true,
  },
  bhw_purok: {
    canViewAllRecords: false, // Only their purok
    canManageUsers: false,
    canManageRoles: false,
    canViewRiskMap: true,
    canEditRiskMap: false, // View only
    canViewAllPuroks: false, // Only their purok
    canManageAllPuroks: false, // Only their purok
    canSendSMS: true,
    canManageHealthTips: false,
    canManageRiskIndicators: false,
    canViewReports: true,
    canManageReferrals: true,
  },
  pregnant_mother: {
    canViewAllRecords: false,
    canManageUsers: false,
    canManageRoles: false,
    canViewRiskMap: false,
    canEditRiskMap: false,
    canViewAllPuroks: false,
    canManageAllPuroks: false,
    canSendSMS: false,
    canManageHealthTips: false,
    canManageRiskIndicators: false,
    canViewReports: false,
    canManageReferrals: false,
  },
  pending: {
    canViewAllRecords: false,
    canManageUsers: false,
    canManageRoles: false,
    canViewRiskMap: false,
    canEditRiskMap: false,
    canViewAllPuroks: false,
    canManageAllPuroks: false,
    canSendSMS: false,
    canManageHealthTips: false,
    canManageRiskIndicators: false,
    canViewReports: false,
    canManageReferrals: false,
  },
} as const;

// Helper function to check if a role has a specific permission
export function hasPermission(role: UserRole | string | null | undefined, permission: keyof typeof ROLE_PERMISSIONS[UserRole]): boolean {
  if (!role) return false;
  const normalizedRole = role as UserRole;
  return ROLE_PERMISSIONS[normalizedRole]?.[permission] ?? false;
}

// Helper function to check if a user can access a specific purok
export function canAccessPurok(userRole: UserRole | string | null | undefined, userPurok: string | null, targetPurok: string | null): boolean {
  if (!userRole) return false;
  
  // Admins, nurses, and bhw_head can access all puroks
  if (['admin', 'nurse', 'bhw_head'].includes(userRole as UserRole)) {
    return true;
  }
  
  // bhw_purok can only access their assigned purok
  if (userRole === 'bhw_purok') {
    return userPurok === targetPurok;
  }
  
  return false;
}

// Helper function to check if a user can manage users
export function canManageUsers(role: UserRole | string | null | undefined): boolean {
  return hasPermission(role, 'canManageUsers');
}

// Helper function to check if a user can manage roles
export function canManageRoles(role: UserRole | string | null | undefined): boolean {
  return hasPermission(role, 'canManageRoles');
}

// Helper function to check if a user can edit the risk map
export function canEditRiskMap(role: UserRole | string | null | undefined): boolean {
  return hasPermission(role, 'canEditRiskMap');
}

// Helper function to check if a user can manage health tips
export function canManageHealthTips(role: UserRole | string | null | undefined): boolean {
  return hasPermission(role, 'canManageHealthTips');
}

// Helper function to check if a user can manage risk indicators
export function canManageRiskIndicators(role: UserRole | string | null | undefined): boolean {
  return hasPermission(role, 'canManageRiskIndicators');
}

// Helper function to check if a user can send SMS
export function canSendSMS(role: UserRole | string | null | undefined): boolean {
  return hasPermission(role, 'canSendSMS');
}

// Helper function to check if a user can view reports
export function canViewReports(role: UserRole | string | null | undefined): boolean {
  return hasPermission(role, 'canViewReports');
}

// Helper function to check if a user can manage referrals
export function canManageReferrals(role: UserRole | string | null | undefined): boolean {
  return hasPermission(role, 'canManageReferrals');
}
