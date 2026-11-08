// School / center management: teachers (members + pending invitations), classes,
// and the raw activity the school screens turn into reports. Only the owner of
// the organization reaches these screens; RLS enforces it on the server too.
import type { SupabaseClient } from '@supabase/supabase-js';
import { MOCK_SCHOOL_TEACHERS } from '../mockData';
import { toInternationalPhone } from '../lib/phone';
import type { Group } from '../types';
import type { AssessmentRow, DiagnosticRow } from './types';

export interface SchoolMember {
  membershipId: string;
  userId: string;
  name: string;
  phone: string;
  role: 'owner' | 'teacher';
  active: boolean;
}

export interface SchoolInvitation {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface SchoolGroup {
  id: string;
  name: string;
  gradeName: string;
  subjectName: string;
  studentCount: number;
  teacherIds: string[];
}

export interface SchoolRaw {
  members: SchoolMember[];
  invitations: SchoolInvitation[];
  groups: SchoolGroup[];
  assessments: { id: string; groupId: string; createdAt: string }[];
  submissions: { assessmentId: string; createdAt: string; status: string }[];
  rows: DiagnosticRow[];
  reportsSent: number;
  studentsCount: number;
}

export interface SchoolStore {
  getSchoolRaw(): Promise<SchoolRaw>;
  inviteTeacher(input: { name: string; phone: string }): Promise<void>;
  cancelInvitation(id: string): Promise<void>;
  setMemberActive(membershipId: string, active: boolean): Promise<void>;
  setGroupTeacher(groupId: string, userId: string, assigned: boolean): Promise<void>;
}

interface Base {
  listGroups(): Promise<Group[]>;
  listDiagnosticRows(groupId: string | null): Promise<DiagnosticRow[]>;
  listAssessments(): Promise<AssessmentRow[]>;
}

class SchoolError extends Error {}

function fail(error: { message?: string; code?: string } | null, fallback: string): never {
  const msg = error?.message ?? '';
  if (msg.toLowerCase().includes('failed to fetch')) throw new SchoolError('تعذّر الاتصال بالإنترنت. حاول مرة أخرى.');
  if (error?.code === '23505') throw new SchoolError('هذا الرقم مدعو من قبل.');
  if (error?.code === '42501') throw new SchoolError('ليس لديك صلاحية لهذا الإجراء.');
  if (/[؀-ۿ]/.test(msg)) throw new SchoolError(msg);
  throw new SchoolError(fallback);
}

function localPhone(p: string | null): string {
  if (!p) return '';
  const cc = String(import.meta.env.VITE_DEFAULT_COUNTRY_CODE ?? '970');
  return p.startsWith(`+${cc}`) ? `0${p.slice(cc.length + 1)}` : p;
}

const sinceDays = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export function createSupabaseSchool(db: SupabaseClient, orgId: string, base: Base): SchoolStore {
  return {
    async getSchoolRaw() {
      const since = sinceDays(150);
      const [members, invitations, groups, teachers, assessments, submissions, rows, reports, students] = await Promise.all([
        db.from('memberships').select('id, user_id, role, status, profiles(full_name, phone)').eq('organization_id', orgId),
        db.from('invitations').select('id, full_name, phone, created_at').eq('organization_id', orgId).is('accepted_at', null),
        base.listGroups(),
        db.from('group_teachers').select('group_id, user_id').eq('organization_id', orgId),
        db.from('assessments').select('id, group_id, created_at').eq('organization_id', orgId).gte('created_at', since),
        db.from('submissions').select('assessment_id, created_at, status').eq('organization_id', orgId).gte('created_at', since).limit(20000),
        base.listDiagnosticRows(null),
        db.from('reports').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'sent'),
        db.from('students').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active'),
      ]);
      const err = members.error ?? invitations.error ?? teachers.error ?? assessments.error ?? submissions.error;
      if (err) fail(err, 'تعذّر تحميل بيانات المدرسة.');
      const byGroup = new Map<string, string[]>();
      for (const t of teachers.data ?? []) byGroup.set(t.group_id, [...(byGroup.get(t.group_id) ?? []), t.user_id]);
      type MemberDb = { id: string; user_id: string; role: 'owner' | 'teacher'; status: string; profiles: { full_name: string | null; phone: string | null } | null };
      return {
        members: ((members.data ?? []) as unknown as MemberDb[]).map((m) => {
          const p = one(m.profiles);
          return {
            membershipId: m.id,
            userId: m.user_id,
            name: p?.full_name || localPhone(p?.phone ?? null) || 'معلّم',
            phone: localPhone(p?.phone ?? null),
            role: m.role,
            active: m.status === 'active',
          };
        }),
        invitations: (invitations.data ?? []).map((i) => ({ id: i.id, name: i.full_name ?? '', phone: localPhone(i.phone), createdAt: i.created_at })),
        groups: groups.map((g) => ({
          id: g.id,
          name: g.name,
          gradeName: g.gradeName,
          subjectName: g.subjectName,
          studentCount: g.studentCount,
          teacherIds: byGroup.get(g.id) ?? [],
        })),
        assessments: (assessments.data ?? []).map((a) => ({ id: a.id, groupId: a.group_id, createdAt: a.created_at })),
        submissions: (submissions.data ?? []).map((s) => ({ assessmentId: s.assessment_id, createdAt: s.created_at, status: s.status })),
        rows,
        reportsSent: reports.count ?? 0,
        studentsCount: students.count ?? 0,
      };
    },

    async inviteTeacher({ name, phone }) {
      const intl = toInternationalPhone(phone);
      if (!intl) throw new SchoolError('اكتب رقم واتساب صحيحاً، مثال: 0599123456');
      const { error } = await db.from('invitations').insert({ organization_id: orgId, phone: intl, full_name: name.trim() || null, role: 'teacher' });
      if (error) fail(error, 'تعذّر حفظ الدعوة.');
    },

    async cancelInvitation(id) {
      const { error } = await db.from('invitations').delete().eq('id', id);
      if (error) fail(error, 'تعذّر إلغاء الدعوة.');
    },

    async setMemberActive(membershipId, active) {
      const { error } = await db.from('memberships').update({ status: active ? 'active' : 'disabled' }).eq('id', membershipId);
      if (error) fail(error, 'تعذّر تحديث حالة المعلم.');
    },

    async setGroupTeacher(groupId, userId, assigned) {
      const { error } = assigned
        ? await db.from('group_teachers').upsert({ group_id: groupId, organization_id: orgId, user_id: userId }, { ignoreDuplicates: true })
        : await db.from('group_teachers').delete().eq('group_id', groupId).eq('user_id', userId);
      if (error) fail(error, 'تعذّر تحديث إسناد المعلم.');
    },
  };
}

export function createDemoSchool(base: Base): SchoolStore {
  const owner: SchoolMember = { membershipId: 'm_owner', userId: 'u_owner', name: 'مدير الجهة', phone: '0599000000', role: 'owner', active: true };
  const members: SchoolMember[] = [
    owner,
    ...MOCK_SCHOOL_TEACHERS.map((t, i) => ({
      membershipId: `m_${t.id}`,
      userId: `u_${t.id}`,
      name: t.name,
      phone: t.phone,
      role: 'teacher' as const,
      active: i !== 3,
    })),
  ];
  const invitations: SchoolInvitation[] = [];
  let assign: Record<string, string[]> | null = null;
  const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));

  return {
    async getSchoolRaw() {
      const [groups, rows, assessments] = await Promise.all([base.listGroups(), base.listDiagnosticRows(null), base.listAssessments()]);
      assign ??= Object.fromEntries(groups.map((g, i) => [g.id, [members[1 + (i % (members.length - 1))].userId]]));
      const submissions = assessments.flatMap((a) => {
        const g = groups.find((x) => x.id === a.groupId);
        return Array.from({ length: Math.round((g?.studentCount ?? 10) * 0.85) }, () => ({ assessmentId: a.id, createdAt: a.createdAt, status: 'approved' }));
      });
      return wait({
        members: members.map((m) => ({ ...m })),
        invitations: [...invitations],
        groups: groups.map((g) => ({ id: g.id, name: g.name, gradeName: g.gradeName, subjectName: g.subjectName, studentCount: g.studentCount, teacherIds: assign?.[g.id] ?? [] })),
        assessments: assessments.map((a) => ({ id: a.id, groupId: a.groupId, createdAt: a.createdAt })),
        submissions,
        rows,
        reportsSent: Math.round(submissions.length * 0.9),
        studentsCount: groups.reduce((n, g) => n + g.studentCount, 0),
      });
    },
    async inviteTeacher({ name, phone }) {
      if (!toInternationalPhone(phone)) throw new SchoolError('اكتب رقم واتساب صحيحاً، مثال: 0599123456');
      invitations.push({ id: `inv_${Date.now()}`, name, phone, createdAt: new Date().toISOString() });
      await wait(null);
    },
    async cancelInvitation(id) {
      const i = invitations.findIndex((x) => x.id === id);
      if (i >= 0) invitations.splice(i, 1);
      await wait(null);
    },
    async setMemberActive(membershipId, active) {
      const m = members.find((x) => x.membershipId === membershipId);
      if (m) m.active = active;
      await wait(null);
    },
    async setGroupTeacher(groupId, userId, assigned) {
      if (!assign) return;
      const cur = assign[groupId] ?? [];
      assign[groupId] = assigned ? [...new Set([...cur, userId])] : cur.filter((x) => x !== userId);
      await wait(null);
    },
  };
}
