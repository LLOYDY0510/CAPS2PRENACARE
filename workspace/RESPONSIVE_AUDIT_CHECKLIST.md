PRENATRACK RESPONSIVENESS AUDIT — CHECKLIST
=============================================
Roles: admin, bhw_head, bhw_purok, nurse, pregnant_mother, pending
Device widths (portrait + landscape for each):
  Mobile: 320, 375, 414
  Tablet: 768, 820, 1024
  Desktop: 1280, 1440, 1920+

PAGES BY ROLE (from app/dashboard/):
----------------------------------
admin:        /dashboard, /pregnant, /schedule, /users, /sms-log, /reports, /risk-map
bhw_head:     /dashboard, /pregnant, /schedule, /checkups, /sms-log, /reports, /risk-map, /bhw
bhw_purok:    /dashboard, /pregnant, /checkups, /schedule (view), /risk-map (view), /reports
nurse:        /dashboard, /pregnant, /schedule, /checkups, /sms-log, /risk-indicators, /health-tips, /nutrition-tips, /reports
pregnant_mother: /dashboard (messages), /my-schedule, /my-info, /my-records
pending:       (redirects / no dashboard)

COMPONENTS TO AUDIT:
-------------------
- Sidebar (navigation, hamburger, drawer, touch targets)
- Header (search, user dropdown, notifications)
- AdminDashboard / NurseDashboard / BhwHeadDashboard / BhwPurokDashboard
- PregnantRecordsTable, CheckupsTable, ReportsTable, SmsLogTable, UsersTable, BhwTable
- ScheduleSetter, ScheduleEditor
- RiskMap / RiskMapClient / FullscreenMapModal
- Forms: CreateAccountForm, LoginForm, ScheduleEditor inputs
- Modals: Modal, FullscreenMapModal
- Charts/graphs: any embedded
- PageHeader, StatCard, InfoRow, RiskBadge, Pagination, Tabs, SearchBar
- Auth layouts: AuthLayout, BrandPanel
- NotificationBell, LogoutButton

ISSUE CATEGORIES:
-----------------
[ ] Horizontal scroll / overflow
[ ] Navigation (sidebar/menu collapses properly, touch-reachable, usable)
[ ] Tables (scroll, stack, card conversion)
[ ] Charts (resize, readable labels/legends)
[ ] Forms/inputs (full-width, spacing, keyboard types)
[ ] Buttons/links (44x44px touch targets, spacing)
[ ] Modals/dropdowns/popups (fit screen, closable)
[ ] Typography (readable sizes, no truncation)
[ ] Images/icons (scale, no distortion)
[ ] Spacing/alignment/layout consistency
[ ] Safe areas / fixed headers / sticky elements not blocking
[ ] Performance (layout shift, slow loading, heavy assets)
[ ] Role-based differences responsive
