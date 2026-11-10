// Platform admin › staff team: who helps run the platform, their role and the
// sections they may open. Only a super admin can manage this list; the
// database checks every call again (admin_list_staff / admin_add_staff ...).
import { supabase } from '../lib/supabase';
import { toInternationalPhone } from '../lib/phone';
import type { AdminPermission, StaffRole } from '../lib/adminAccess';

export interface StaffMember {
  /** null while the person is invited by phone and hasn't signed in yet. */
  userId: string | null;
  phone: string;
  fullName: string;
  role: StaffRole;
  permissions: AdminPermission[];
  isActive: boolean;
  isPending: boolean;
  isMe: boolean;
  createdAt: string;
}

export interface StaffInput {
  phone: string;
  fullName: string;
  role: StaffRole;
  permissions: AdminPermission[];
}

export interface StaffApi {
  list(): Promise<StaffMember[]>;
  /** 'added' when the number already has an account, 'invited' otherwise. */
  add(input: StaffInput): Promise<'added' | 'invited'>;
  update(userId: string, role: StaffRole, permissions: AdminPermission[], isActive: boolean): Promise<void>;
  /** Removes a member, or cancels an invitation (userId null, by phone). */
  remove(member: Pick<StaffMember, 'userId' | 'phone'>): Promise<void>;
}

const arabic = (m: string | undefined, fallback: string) => (m && /[؀-ۿ]/.test(m) ? m : fallback);

function cleanPhone(input: string): string {
  const p = toInternationalPhone(input);
  if (!p) throw new Error('رقم الواتساب غير صحيح. اكتبه مثل 0599123456.');
  return p;
}

function realApi(): StaffApi {
  const db = supabase!;
  return {
    async list() {
      const { data, error } = await db.rpc('admin_list_staff');
      if (error) throw new Error(arabic(error.message, 'تعذّر تحميل طاقم الإدارة.'));
      type Row = {
        user_id: string | null; phone: string; full_name: string | null; role: StaffRole; permissions: AdminPermission[] | null;
        is_active: boolean; is_pending: boolean; is_me: boolean; created_at: string;
      };
      return ((data ?? []) as Row[]).map((r) => ({
        userId: r.user_id,
        phone: r.phone ?? '',
        fullName: r.full_name ?? '',
        role: r.role,
        permissions: r.permissions ?? [],
        isActive: r.is_active,
        isPending: r.is_pending,
        isMe: r.is_me,
        createdAt: r.created_at,
      }));
    },
    async add(input) {
      const { data, error } = await db.rpc('admin_add_staff', {
        p_phone: cleanPhone(input.phone),
        p_full_name: input.fullName.trim() || null,
        p_role: input.role,
        p_permissions: input.permissions,
      });
      if (error) throw new Error(arabic(error.message, 'تعذّر إضافة العضو.'));
      return data === 'added' ? 'added' : 'invited';
    },
    async update(userId, role, permissions, isActive) {
      const { error } = await db.rpc('admin_update_staff', { p_user: userId, p_role: role, p_permissions: permissions, p_active: isActive });
      if (error) throw new Error(arabic(error.message, 'تعذّر حفظ التعديل.'));
    },
    async remove(member) {
      const { error } = await db.rpc('admin_remove_staff', { p_user: member.userId, p_phone: member.phone });
      if (error) throw new Error(arabic(error.message, 'تعذّر الحذف.'));
    },
  };
}

// Demo mode: an in-memory list (resets on reload).
function demoApi(): StaffApi {
  const now = new Date().toISOString();
  let rows: StaffMember[] = [
    { userId: 'me', phone: '+970599000099', fullName: 'مدير منصة دقة', role: 'super_admin', permissions: [], isActive: true, isPending: false, isMe: true, createdAt: now },
    { userId: 'demo-acc', phone: '+970599000123', fullName: 'سامي (محاسب)', role: 'accountant', permissions: ['finance', 'plans'], isActive: true, isPending: false, isMe: false, createdAt: now },
  ];
  const check = (role: StaffRole, permissions: AdminPermission[]) => {
    if (role !== 'super_admin' && permissions.length === 0) throw new Error('اختر صلاحية واحدة على الأقل');
    return role === 'super_admin' ? [] : [...permissions];
  };
  return {
    async list() {
      return rows.map((r) => ({ ...r }));
    },
    async add(input) {
      const phone = cleanPhone(input.phone);
      const permissions = check(input.role, input.permissions);
      const existing = rows.find((r) => r.phone === phone);
      if (existing && !existing.isPending) throw new Error('هذا الرقم موجود في الطاقم. عدّل صلاحياته من القائمة.');
      rows = rows.filter((r) => r.phone !== phone);
      rows.push({ userId: null, phone, fullName: input.fullName.trim(), role: input.role, permissions, isActive: true, isPending: true, isMe: false, createdAt: new Date().toISOString() });
      return 'invited';
    },
    async update(userId, role, permissions, isActive) {
      const clean = check(role, permissions);
      rows = rows.map((r) => (r.userId === userId ? { ...r, role, permissions: clean, isActive } : r));
    },
    async remove(member) {
      rows = rows.filter((r) => (member.userId ? r.userId !== member.userId : r.phone !== member.phone));
    },
  };
}

let api: StaffApi | null = null;
export function staffApi(): StaffApi {
  api ??= supabase ? realApi() : demoApi();
  return api;
}
