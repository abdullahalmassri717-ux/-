// Platform staff roles and permissions. The database enforces them
// (private.admin_can in supabase/migrations/20261110000100_platform_staff_roles.sql);
// the app only uses them to hide sections a staff member can't open.

export type AdminPermission = 'orgs' | 'finance' | 'plans' | 'quality' | 'support' | 'curricula' | 'landing' | 'settings';
export type StaffRole = 'super_admin' | 'accountant' | 'support_agent' | 'content_editor' | 'custom';

export interface AdminAccess {
  role: StaffRole;
  isSuper: boolean;
  /** Every section this person may open (all of them for a super admin). */
  permissions: AdminPermission[];
}

export const ADMIN_PERMISSIONS: { id: AdminPermission; label: string; hint: string }[] = [
  { id: 'orgs', label: 'الجهات', hint: 'قبول المدرّسين والمدارس وإيقافهم وتعديلهم' },
  { id: 'finance', label: 'المدفوعات والفواتير', hint: 'تأكيد الإيصالات وإصدار الفواتير والاشتراكات' },
  { id: 'plans', label: 'الباقات والأسعار', hint: 'إضافة الباقات وتعديل أسعارها' },
  { id: 'quality', label: 'جودة وتكلفة التصحيح', hint: 'تقارير دقة التصحيح وتكلفته' },
  { id: 'support', label: 'الدعم الفني', hint: 'قراءة التذاكر والرد عليها' },
  { id: 'curricula', label: 'المناهج والكتب', hint: 'استيراد المناهج وتعديلها ونشرها' },
  { id: 'landing', label: 'الصفحة التعريفية', hint: 'تعديل محتوى الصفحة الرئيسية للموقع' },
  { id: 'settings', label: 'إعدادات المنصة', hint: 'الحسابات البنكية والعملة والفترة التجريبية ورقم الدعم' },
];

export const ALL_PERMISSIONS = ADMIN_PERMISSIONS.map((p) => p.id);

/** Ready-made roles; picking one fills in its usual sections (they can still be changed). */
export const STAFF_ROLES: { id: StaffRole; label: string; hint: string; preset: AdminPermission[] }[] = [
  { id: 'super_admin', label: 'مدير عام', hint: 'كل الأقسام، ويدير طاقم الإدارة', preset: ALL_PERMISSIONS },
  { id: 'accountant', label: 'محاسب', hint: 'المدفوعات والفواتير والباقات', preset: ['finance', 'plans'] },
  { id: 'support_agent', label: 'دعم فني', hint: 'تذاكر الدعم ومتابعة الجهات', preset: ['support', 'orgs'] },
  { id: 'content_editor', label: 'محرر محتوى', hint: 'المناهج والصفحة التعريفية', preset: ['curricula', 'landing'] },
  { id: 'custom', label: 'دور مخصص', hint: 'تختار أقسامه بنفسك', preset: [] },
];

export const roleLabel = (r: StaffRole) => STAFF_ROLES.find((x) => x.id === r)?.label ?? r;
export const permissionLabel = (p: AdminPermission) => ADMIN_PERMISSIONS.find((x) => x.id === p)?.label ?? p;

/** Demo mode and older databases: the admin can open everything. */
export const FULL_ACCESS: AdminAccess = { role: 'super_admin', isSuper: true, permissions: ALL_PERMISSIONS };

export function parseAdminAccess(raw: unknown): AdminAccess | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { role?: string; is_super?: boolean; permissions?: string[] };
  const role = (STAFF_ROLES.some((x) => x.id === r.role) ? r.role : 'custom') as StaffRole;
  return {
    role,
    isSuper: !!r.is_super,
    permissions: (r.permissions ?? []).filter((p): p is AdminPermission => ALL_PERMISSIONS.includes(p as AdminPermission)),
  };
}

export const adminCan = (access: AdminAccess | null | undefined, p: AdminPermission) =>
  !!access && (access.isSuper || access.permissions.includes(p));
