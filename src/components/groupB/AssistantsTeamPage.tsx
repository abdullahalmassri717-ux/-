import React, { useState } from 'react';
import { ScreenId, Assistant } from '../../types';
import { MOCK_ASSISTANTS, MOCK_AUDIT_LOGS, MOCK_GROUPS } from '../../mockData';
import { notify } from '../../lib/notify';
import {
  UserPlus,
  Users,
  Clock,
  CheckSquare,
  History,
  X,
  Phone,
  Trash2,
  ShieldCheck,
} from 'lucide-react';

interface AssistantsTeamPageProps {
  onNavigate: (screen: ScreenId) => void;
}

type PermissionKey = keyof Assistant['permissions'];

const PERMISSIONS: { key: PermissionKey; label: string; hint: string }[] = [
  { key: 'uploadPapers', label: 'رفع الأوراق', hint: 'تصوير ورفع أوراق الطلاب' },
  { key: 'reviewGrading', label: 'مراجعة التصحيح', hint: 'مراجعة الإجابات المشكوك فيها' },
  { key: 'approveGrades', label: 'اعتماد الدرجات', hint: 'اعتماد الدرجات النهائية' },
  { key: 'sendReports', label: 'إرسال التقارير', hint: 'إرسال التقارير للطلاب والأهالي' },
  { key: 'viewParentData', label: 'رؤية بيانات الأهالي', hint: 'أرقام هواتف أولياء الأمور' },
];

const Toggle: React.FC<{ checked: boolean; onChange: () => void; label: string }> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
      checked ? 'bg-[#1E3A5F]' : 'bg-slate-300'
    }`}
  >
    <span
      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
        checked ? 'right-1' : 'right-5'
      }`}
    />
  </button>
);

export const AssistantsTeamPage: React.FC<AssistantsTeamPageProps> = ({ onNavigate }) => {
  const [assistants, setAssistants] = useState<Assistant[]>(MOCK_ASSISTANTS);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteGroups, setInviteGroups] = useState<string[]>([]);

  const groupNames = MOCK_GROUPS.map((g) => g.name);

  const togglePermission = (assistantId: string, key: PermissionKey) => {
    setAssistants((prev) =>
      prev.map((a) =>
        a.id === assistantId ? { ...a, permissions: { ...a.permissions, [key]: !a.permissions[key] } } : a
      )
    );
  };

  const removeAssistant = (assistant: Assistant) => {
    setAssistants((prev) => prev.filter((a) => a.id !== assistant.id));
    notify(`أُزيل ${assistant.name} من الفريق، ولم يعد يستطيع الدخول لبياناتك.`, 'success');
  };

  const sendInvite = () => {
    if (!inviteName.trim() || !invitePhone.trim()) {
      notify('اكتب اسم المساعد ورقم الواتساب أولاً.', 'warning');
      return;
    }
    const newAssistant: Assistant = {
      id: `as${Date.now()}`,
      name: inviteName.trim(),
      phone: invitePhone.trim(),
      assignedGroups: inviteGroups,
      lastActive: 'لم يدخل بعد (الدعوة مرسلة)',
      reviewsCountWeek: 0,
      permissions: {
        uploadPapers: true,
        reviewGrading: true,
        approveGrades: false,
        sendReports: false,
        viewParentData: false,
      },
    };
    setAssistants((prev) => [...prev, newAssistant]);
    setShowInvite(false);
    setInviteName('');
    setInvitePhone('');
    setInviteGroups([]);
    notify(`أُرسلت دعوة على واتساب إلى ${newAssistant.phone}. يبدأ برفع الأوراق ومراجعة التصحيح فقط حتى تمنحه صلاحيات أكثر.`, 'success');
  };

  const totalReviews = assistants.reduce((sum, a) => sum + a.reviewsCountWeek, 0);

  return (
    <div className="space-y-6 text-right max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#1E3A5F]">فريق المساعدين</h1>
          <p className="text-xs text-slate-500 mt-1">
            أضف مساعديك وحدّد ما يستطيع كل واحد فعله. كل تعديل يقوم به أي شخص يُسجَّل باسمه.
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>دعوة مساعد</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> عدد المساعدين
          </div>
          <div className="text-2xl font-black text-[#1E3A5F] mt-1">{assistants.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5" /> مراجعات هذا الأسبوع
          </div>
          <div className="text-2xl font-black text-[#1E3A5F] mt-1">{totalReviews}</div>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-950 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1E3A5F] shrink-0 mt-0.5" />
          <span>المساعد لا يرى الاشتراك والفواتير، ولا يستطيع إضافة مساعدين آخرين.</span>
        </div>
      </div>

      {/* Assistants list */}
      <div className="space-y-4">
        {assistants.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-xs text-slate-500">
            لا يوجد مساعدون بعد. ادعُ أول مساعد ليرفع الأوراق ويراجع التصحيح معك.
          </div>
        )}

        {assistants.map((assistant) => (
          <div key={assistant.id} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#E8F0F8] text-[#1E3A5F] flex items-center justify-center font-black shrink-0">
                  {assistant.name.replace('أ. ', '').charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-900">{assistant.name}</div>
                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <span className="flex items-center gap-1" dir="ltr">
                      <Phone className="w-3 h-3" /> {assistant.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> آخر نشاط: {assistant.lastActive}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckSquare className="w-3 h-3" /> {assistant.reviewsCountWeek} مراجعة هذا الأسبوع
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {assistant.assignedGroups.length === 0 ? (
                      <span className="text-[10px] text-slate-400">لم تُسند له مجموعات بعد</span>
                    ) : (
                      assistant.assignedGroups.map((g) => (
                        <span key={g} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                          {g}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeAssistant(assistant)}
                className="self-start text-[11px] text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer border border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>إزالة</span>
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {PERMISSIONS.map((perm) => (
                <div
                  key={perm.key}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#F7F8FA] border border-slate-200"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800">{perm.label}</div>
                    <div className="text-[10px] text-slate-500">{perm.hint}</div>
                  </div>
                  <Toggle
                    checked={assistant.permissions[perm.key]}
                    onChange={() => togglePermission(assistant.id, perm.key)}
                    label={`${perm.label} – ${assistant.name}`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Activity log */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
        <h2 className="font-bold text-sm text-[#1E3A5F] flex items-center gap-2 mb-3">
          <History className="w-4 h-4" /> سجل النشاط: من عدّل ماذا ومتى
        </h2>
        <div className="divide-y divide-slate-100">
          {MOCK_AUDIT_LOGS.map((log) => (
            <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-1">
              <div className="min-w-0">
                <div className="text-xs">
                  <span className="font-bold text-slate-900">{log.actor}</span>
                  <span className="text-slate-500"> · {log.action} · </span>
                  <span className="text-slate-700">{log.target}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{log.details}</div>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">{log.timestamp}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => onNavigate('B8')}
          className="mt-3 text-[11px] font-bold text-[#1E3A5F] hover:underline cursor-pointer"
        >
          الذهاب لمراجعة التصحيح ←
        </button>
      </div>

      {/* Invite dialog */}
      {showInvite && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#1E3A5F]">دعوة مساعد جديد</h3>
              <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer" title="إغلاق">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">اسم المساعد</span>
                <input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-xl focus:bg-white focus:border-[#1E3A5F] focus:outline-none"
                  placeholder="مثال: أ. سامي حلس"
                />
              </label>
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">رقم الواتساب</span>
                <input
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  inputMode="tel"
                  dir="ltr"
                  className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-xl text-left focus:bg-white focus:border-[#1E3A5F] focus:outline-none"
                  placeholder="059xxxxxxx"
                />
              </label>
              <div>
                <span className="block font-bold text-slate-700 mb-1">المجموعات التي يعمل عليها</span>
                <div className="space-y-1.5">
                  {groupNames.map((g) => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inviteGroups.includes(g)}
                        onChange={() =>
                          setInviteGroups((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))
                        }
                      />
                      <span>{g}</span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg">
                يبدأ المساعد بصلاحيتي رفع الأوراق ومراجعة التصحيح فقط. تستطيع تغييرها بعد قبوله الدعوة.
              </p>
            </div>
            <button
              onClick={sendInvite}
              className="w-full bg-[#1E3A5F] hover:bg-[#152a45] text-white py-3 rounded-xl font-bold text-xs cursor-pointer"
            >
              إرسال الدعوة على واتساب
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
