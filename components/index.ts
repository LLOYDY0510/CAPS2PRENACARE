// components/index.ts

// Dashboard role components
export { default as AdminDashboard } from './dashboard/AdminDashboard';
export { default as BhwHeadDashboard } from './dashboard/BhwHeadDashboard';
export { default as NurseDashboard } from './dashboard/NurseDashboard';
export { default as PregnantMotherDashboard } from './dashboard/PregnantMotherDashboard';

// Layout components
export { default as Sidebar } from './layout/Sidebar';
export { default as LogoutButton } from './layout/LogoutButton';

// Map components
export { default as RiskMap } from './maps/RiskMap';
export { default as RiskMapClient } from './maps/RiskMapClient';
export { default as LocationPicker } from './maps/LocationPicker';

// Pregnant & Checkup components
export { default as PrenatalCheckups } from './pregnant/PrenatalCheckups';
export { default as DeleteRecordButton } from './pregnant/DeleteRecordButton';
export { default as EditPregnantMotherForm } from './pregnant/EditPregnantMotherForm';

// Schedule & SMS components
export { default as ScheduleSetter } from './schedule/ScheduleSetter';
export { default as ScheduleSmsForm } from './schedule/ScheduleSmsForm';

// Tips & Risk Indicator components
export { default as IndicatorManager } from './tips/IndicatorManager';
export { default as MonthlyTipsManager } from './tips/MonthlyTipsManager';

// User & Staff management components
export { default as BhwTable } from './users/BhwTable';
export { default as UserRoleEditor } from './users/UserRoleEditor';

// Report components
export { default as ReportExport } from './reports/ReportExport';
export * from './reports/ReportExport';
