// Platform admin › staff team. A super admin adds people by WhatsApp number,
// picks their role and ticks the sections they may open. The database enforces
// the same sections (see supabase/migrations/20261110000100_platform_staff_roles.sql).
import React, { useState } from 'react';
import { Plus, Edit, Trash2, UserCog, PauseCircle, PlayCircle } from 'lucide-react';
import { staffApi, type StaffMember } from '../../data/adminStaff';
import { ADMIN_PERMISSIONS, STAFF_ROLES, AdminPermission, StaffRole, roleLabel, permissionLabel } from '../../lib/adminAccess';
import { notify } from '../../lib/notify';
import { SaveRow } from './AdminOrgsTab';
import { useAsync, Spinner, ErrorBox, Modal, Field, inputCls, dateLabel, errText } from './adminUi';

const api = staffApi();

type Draft = {
  /** null = a new member */
  member: StaffMember | null;
  phone: string;
  fullName: string;
  role: StaffRole;
  permissions: AdminPermission[];
};

const presetOf = (r: StaffRole) => STAFF_ROLES.find((x) => x.id === r)?.preset ?? [];

function localPhone(p: string): string {
  const cc = String(import.meta.env.VITE_DEFAULT_COUNTRY_CODE ?? '970');
  return p.startsWith(`+${cc}`) ? `0${p.slice(cc.length + 1)}` : p;
}

export const AdminStaffTab: React.FC = () => {
  const staff = useAsync(() => api.list());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [removing, setRemoving] = useState<StaffMember | null>(null);
  const [busy, setBusy] = useState(false);

  if (staff.error) return <ErrorBox text={staff.error} />;
  if (!staff.data) return <Spinner />;

  const pickRole = (role: StaffRole) => draft && setDraft({ ...draft, role, permissions: role === 'custom' ? draft.permissions : presetOf(role) });
  const togglePerm = (p: AdminPermission) => {
    if (!draft || draft.role === 'super_admin') return;
    const on = draft.permissions.includes(p);
    setDraft({ ...draft, permissions: on ? draft.permissions.filter((x) => x !== p) : [...draft.permissions, p] });
  };

  const save = async () => {
    if (!draft) return;
    if (draft.role !== 'super_admin' && draft.permissions.length === 0) return notify('اختر قسماً واحداً على الأقل لهذا العضو.', 'warning');
    setBusy(true);
    try {
      const m = draft.member;
      if (m && m.userId) {
        await api.update(m.userId, draft.role, draft.permissions, m.isActive);
        notify('تم حفظ صلاحيات العضو.', 'success');
      } else {
        if (!draft.phone.trim()) throw new Error('اكتب رقم الواتساب.');
        const res = await api.add({ phone: draft.phone, fullName: draft.fullName, role: draft.role, permissions: draft.permissions });
        notify(
          res === 'added'
            ? 'تمت الإضافة. سيجد لوحة الإدارة عند دخوله القادم.'
            : 'تم حفظ الدعوة. عندما يدخل المنصة بهذا الرقم يصبح عضواً في الطاقم تلقائياً.',
          'success',
        );
      }
      setDraft(null);
      staff.reload();
    } catch (e) {
      notify(errText(e, 'تعذّر الحفظ.'), 'warning');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (m: StaffMember) => {
    if (!m.userId) return;
    try {
      await api.update(m.userId, m.role, m.permissions, !m.isActive);
      notify(m.isActive ? 'تم إيقاف العضو. لن يستطيع فتح لوحة الإدارة.' : 'تمت إعادة تفعيل العضو.', 'success');
      staff.reload();
    } catch (e) {
      notify(errText(e, 'تعذّر الحفظ.'), 'warning');
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await api.remove(removing);
      notify(removing.isPending ? 'تم إلغاء الدعوة.' : 'تم إخراج العضو من الطاقم. حسابه في المنصة يبقى كما هو.', 'success');
      setRemoving(null);
      staff.reload();
    } catch (e) {
      notify(errText(e, 'تعذّر الحذف.'), 'warning');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-extrabold text-[#1E3A5F] text-sm flex items-center gap-2">
              <UserCog className="w-4 h-4 text-emerald-600" /> طاقم إدارة المنصة
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">كل عضو يرى فقط الأقسام التي تختارها له. إدارة الطاقم للمدير العام فقط.</p>
          </div>
          <button
            onClick={() => setDraft({ member: null, phone: '', fullName: '', role: 'accountant', permissions: presetOf('accountant') })}
            className="bg-[#1E3A5F] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> إضافة عضو
          </button>
        </div>

        <div className="space-y-3">
          {staff.data.map((m) => (
            <div key={m.userId ?? m.phone} className={`border rounded-2xl p-3 sm:p-4 space-y-2 text-xs ${m.isActive ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-75'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-slate-900">{m.fullName || 'بدون اسم'}</strong>
                    {m.isMe && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">أنت</span>}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.role === 'super_admin' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                      {roleLabel(m.role)}
                    </span>
                    {m.isPending && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">لم يدخل المنصة بعد</span>}
                    {!m.isActive && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">موقوف</span>}
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    <span dir="ltr" className="font-mono">{localPhone(m.phone)}</span> · أضيف {dateLabel(m.createdAt)}
                  </span>
                </div>
                {!m.isMe && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setDraft({ member: m, phone: m.phone, fullName: m.fullName, role: m.role, permissions: m.role === 'super_admin' ? presetOf('super_admin') : m.permissions })}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                      aria-label="تعديل الصلاحيات"
                      title="تعديل الصلاحيات"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {!m.isPending && (
                      <button
                        onClick={() => toggleActive(m)}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                        aria-label={m.isActive ? 'إيقاف' : 'إعادة تفعيل'}
                        title={m.isActive ? 'إيقاف' : 'إعادة تفعيل'}
                      >
                        {m.isActive ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      onClick={() => setRemoving(m)}
                      className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700"
                      aria-label={m.isPending ? 'إلغاء الدعوة' : 'إخراج من الطاقم'}
                      title={m.isPending ? 'إلغاء الدعوة' : 'إخراج من الطاقم'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {m.role === 'super_admin' ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px]">كل الأقسام + إدارة الطاقم</span>
                ) : (
                  m.permissions.map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
                      {permissionLabel(p)}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {draft && (
        <Modal title={draft.member ? `صلاحيات: ${draft.member.fullName || localPhone(draft.member.phone)}` : 'إضافة عضو لطاقم الإدارة'} onClose={() => setDraft(null)} wide>
          {!draft.member && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="رقم الواتساب">
                <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="0599123456" dir="ltr" inputMode="tel" className={`${inputCls} font-mono`} />
              </Field>
              <Field label="الاسم">
                <input value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} placeholder="مثال: سامي أحمد" className={inputCls} />
              </Field>
            </div>
          )}
          {!draft.member && (
            <p className="text-[11px] text-slate-500">يدخل العضو المنصة برقمه هذا ورمز الواتساب كالمعتاد، فتظهر له لوحة الإدارة بالأقسام التي تختارها هنا فقط.</p>
          )}

          <div className="space-y-2">
            <span className="font-bold text-slate-700 block">الدور</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STAFF_ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => pickRole(r.id)}
                  className={`text-right p-2.5 rounded-xl border ${draft.role === r.id ? 'border-[#1E3A5F] bg-[#1E3A5F]/5 ring-1 ring-[#1E3A5F]' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <strong className="block text-slate-900">{r.label}</strong>
                  <span className="text-[11px] text-slate-500">{r.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-slate-700 block">الأقسام التي يستطيع فتحها</span>
            {draft.role === 'super_admin' && <p className="text-[11px] text-emerald-700">المدير العام يملك كل الأقسام ويستطيع إدارة الطاقم.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ADMIN_PERMISSIONS.map((p) => {
                const on = draft.role === 'super_admin' || draft.permissions.includes(p.id);
                return (
                  <label key={p.id} className={`flex items-start gap-2 p-2.5 rounded-xl border ${on ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200'} ${draft.role === 'super_admin' ? 'opacity-70' : 'cursor-pointer'}`}>
                    <input type="checkbox" checked={on} disabled={draft.role === 'super_admin'} onChange={() => togglePerm(p.id)} className="mt-0.5 accent-emerald-600" />
                    <span>
                      <strong className="block text-slate-900">{p.label}</strong>
                      <span className="text-[11px] text-slate-500">{p.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <SaveRow busy={busy} onSave={save} onCancel={() => setDraft(null)} label={draft.member ? 'حفظ الصلاحيات' : 'إضافة العضو'} />
        </Modal>
      )}

      {removing && (
        <Modal title={removing.isPending ? 'إلغاء الدعوة' : 'إخراج من طاقم الإدارة'} onClose={() => setRemoving(null)}>
          <p className="text-slate-700">
            {removing.isPending
              ? `هل تريد إلغاء دعوة ${removing.fullName || localPhone(removing.phone)}؟`
              : `سيفقد ${removing.fullName || localPhone(removing.phone)} الوصول للوحة الإدارة. حسابه وجهاته في المنصة تبقى كما هي، ويمكنك إضافته مرة أخرى لاحقاً.`}
          </p>
          <SaveRow busy={busy} onSave={confirmRemove} onCancel={() => setRemoving(null)} label={removing.isPending ? 'إلغاء الدعوة' : 'إخراج'} danger />
        </Modal>
      )}
    </div>
  );
};
