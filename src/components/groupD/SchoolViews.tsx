import React, { useMemo, useState } from 'react';
import { ScreenId } from '../../types';
import { errorMessage, useActiveOrg, useData, useLoad } from '../../data/DataContext';
import { lessonHeatmap, schoolStats, timeAgo, type TeacherStat } from '../../lib/schoolStats';
import { whatsappLink } from '../../data/billing';
import type { SchoolRaw } from '../../data/school';
import {
  BarChart3,
  AlertTriangle,
  Send,
  FileSpreadsheet,
  Download,
  MessageCircle,
  ArrowRight,
  Sparkles,
  Loader2,
  UserPlus,
  X,
} from 'lucide-react';
import { notify } from '../../lib/notify';

type Nav = { onNavigate: (screen: ScreenId) => void };

function useSchool() {
  const q = useLoad((st) => st.getSchoolRaw());
  const stats = useMemo(() => (q.data ? schoolStats(q.data) : null), [q.data]);
  return { ...q, stats };
}

const Loading: React.FC<{ error?: string | null }> = ({ error }) =>
  error ? (
    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 max-w-6xl mx-auto">{error}</div>
  ) : (
    <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحميل…
    </div>
  );

const BackToSchool: React.FC<Nav> = ({ onNavigate }) => (
  <button
    onClick={() => onNavigate('D1')}
    className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1"
  >
    <ArrowRight className="w-4 h-4" />
    <span>العودة للوحة المدرسة</span>
  </button>
);

const pctLabel = (n: number | null) => (n === null ? '—' : `${n}%`);

// D1: School Principal Dashboard
export const SchoolDashboard: React.FC<Nav> = ({ onNavigate }) => {
  const org = useActiveOrg();
  const { data, loading, error, stats } = useSchool();
  if (loading || error || !data || !stats) return <Loading error={error} />;
  const teachers = stats.teachers.filter((t) => t.role === 'teacher');

  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-16">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">لوحة الإدارة</span>
            {org.region && <span className="text-xs text-slate-500">{org.region}</span>}
          </div>
          <h1 className="text-2xl font-black text-[#1E3A5F] mt-1">{org.name}</h1>
          <p className="text-xs text-slate-600">
            <strong>{teachers.length} معلماً</strong> و <strong>{data.studentsCount} طالباً</strong> في {data.groups.length} صفاً/شعبة.
          </p>
        </div>
        <button
          onClick={() => onNavigate('D3')}
          className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs self-start md:self-auto"
        >
          تقرير المدرسة والجدول الحراري ←
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <span className="text-xs text-slate-500">طلاب الجهة</span>
          <div className="text-2xl font-black text-[#1E3A5F] font-mono tabular-nums">{data.studentsCount}</div>
          <span className="text-[11px] text-slate-400">في {data.groups.length} صفاً/شعبة</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <span className="text-xs text-slate-500">امتحانات آخر 30 يوماً</span>
          <div className="text-2xl font-black text-[#1E3A5F] font-mono tabular-nums">{stats.examsThisMonth}</div>
          <span className="text-[11px] text-slate-400">{data.submissions.filter((s) => Date.parse(s.createdAt) > Date.now() - 30 * 86400000).length} ورقة مرفوعة</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <span className="text-xs text-slate-500">متوسط الأداء</span>
          <div className="text-2xl font-black text-[#1E3A5F] font-mono tabular-nums">{pctLabel(stats.avgPct)}</div>
          {stats.avgChange !== null && (
            <span className={`text-[11px] font-bold ${stats.avgChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {stats.avgChange >= 0 ? '+' : ''}
              {stats.avgChange}% عن الشهر السابق
            </span>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <span className="text-xs text-slate-500">تقارير أُرسلت للأهالي</span>
          <div className="text-2xl font-black text-emerald-600 font-mono tabular-nums">{data.reportsSent}</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <h3 className="font-extrabold text-[#1E3A5F] text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <span>متوسط الأداء لكل صف/شعبة</span>
        </h3>
        {!stats.classes.length ? (
          <p className="text-xs text-slate-500">لا توجد صفوف بعد. أنشئها من «الطلاب والمجموعات».</p>
        ) : (
          <div className="space-y-3">
            {stats.classes.map((c) => (
              <div key={c.group.id} className="space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2 text-slate-700">
                  <span className="font-bold min-w-0 truncate">
                    {c.group.name}
                    {c.group.subjectName ? <span className="text-slate-400 font-normal"> · {c.group.subjectName}</span> : null}
                  </span>
                  <span className="font-mono font-bold text-blue-700 shrink-0">{pctLabel(c.avgPct)}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${c.avgPct === null ? '' : c.avgPct < 55 ? 'bg-rose-500' : c.avgPct < 70 ? 'bg-amber-500' : 'bg-blue-600'}`}
                    style={{ width: `${c.avgPct ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <h3 className="font-extrabold text-red-900 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>تنبيهات</span>
          </h3>
          {!stats.alerts.length ? (
            <p className="text-xs text-slate-500">لا توجد تنبيهات الآن.</p>
          ) : (
            <div className="space-y-3 text-xs">
              {stats.alerts.map((a, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-xl space-y-1 border ${a.tone === 'red' ? 'bg-red-50/70 border-red-200' : 'bg-amber-50/70 border-amber-200'}`}
                >
                  <div className={`flex items-start justify-between gap-2 font-bold ${a.tone === 'red' ? 'text-red-950' : 'text-amber-950'}`}>
                    <span className="min-w-0">{a.title}</span>
                    <span className={`px-2 py-0.5 rounded font-mono shrink-0 ${a.tone === 'red' ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'}`}>
                      {a.badge}
                    </span>
                  </div>
                  <p className={`text-[11px] leading-relaxed ${a.tone === 'red' ? 'text-red-800' : 'text-amber-800'}`}>{a.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-[#1E3A5F] text-sm">نشاط المعلمين</h3>
            <button onClick={() => onNavigate('D2')} className="text-xs text-blue-700 hover:underline font-bold shrink-0">
              إدارة المعلمين ←
            </button>
          </div>
          {!teachers.length ? (
            <p className="text-xs text-slate-500">لم تُضف معلمين بعد. ادعهم من «إدارة المعلمين».</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {teachers.map((t) => {
                const stale = !t.lastUploadAt || Date.parse(t.lastUploadAt) < Date.now() - 14 * 86400000;
                return (
                  <div key={t.userId} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="block text-slate-900">{t.name}</strong>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {[t.subjects.join('، '), t.groups.map((g) => g.name).join('، ')].filter(Boolean).join(' · ') || 'لا صفوف مسندة'}
                      </span>
                    </div>
                    <div className="text-left text-[11px] shrink-0">
                      <span className="text-slate-400 block">آخر رفع:</span>
                      <span className={stale ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'}>{timeAgo(t.lastUploadAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// D2: Teachers & Classes Page
export const TeachersClassesPage: React.FC<Nav> = ({ onNavigate }) => {
  const store = useData();
  const org = useActiveOrg();
  const { data, loading, error, stats, reload } = useSchool();
  const [tab, setTab] = useState<'teachers' | 'classes'>('teachers');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ name: '', phone: '' });
  const [assignFor, setAssignFor] = useState<TeacherStat | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading || error || !data || !stats) return <Loading error={error} />;
  const teachers = stats.teachers;
  const inviteText = (name: string) =>
    `مرحباً ${name || ''}، دعوتك للانضمام إلى «${org.name}» على منصة دقة لتصحيح الأوراق.\nادخل من الرابط برقم واتساب هذا: ${window.location.origin}/login`;

  const run = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      reload();
      if (ok) notify(ok);
    } catch (e) {
      notify(errorMessage(e, 'تعذّر الحفظ.'));
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async () => {
    if (!invite.name.trim() || !invite.phone.trim()) return notify('اكتب اسم المعلم ورقم واتساب.');
    await run(async () => {
      await store.inviteTeacher(invite);
      const url = whatsappLink(invite.phone, inviteText(invite.name));
      if (url) window.open(url, '_blank');
      setInvite({ name: '', phone: '' });
      setInviteOpen(false);
    }, 'تم حفظ الدعوة. سيدخل المعلم تلقائياً للجهة عند تسجيل دخوله بهذا الرقم.');
  };

  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <BackToSchool onNavigate={onNavigate} />
          <h1 className="text-xl font-extrabold text-[#1E3A5F]">المعلمون والصفوف</h1>
          <p className="text-xs text-slate-500">دعوة المعلمين، إسناد الصفوف لهم، ومتابعة كل صف.</p>
        </div>
        {tab === 'teachers' ? (
          <button
            onClick={() => setInviteOpen(true)}
            className="bg-[#1E3A5F] text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 self-start"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>دعوة معلم</span>
          </button>
        ) : (
          <button
            onClick={() => onNavigate('B2')}
            className="bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 self-start"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>إضافة صفوف واستيراد طلاب</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
        <button
          onClick={() => setTab('teachers')}
          className={`px-4 py-2 rounded-lg font-bold cursor-pointer ${tab === 'teachers' ? 'bg-[#1E3A5F] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          المعلمون ({teachers.length + data.invitations.length})
        </button>
        <button
          onClick={() => setTab('classes')}
          className={`px-4 py-2 rounded-lg font-bold cursor-pointer ${tab === 'classes' ? 'bg-[#1E3A5F] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          الصفوف ({stats.classes.length})
        </button>
      </div>

      {tab === 'teachers' ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-x-auto">
          <table className="w-full text-right text-xs min-w-[720px]">
            <thead className="bg-[#F7F8FA] text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">الاسم</th>
                <th className="p-3.5">الصفوف المسندة</th>
                <th className="p-3.5">واتساب</th>
                <th className="p-3.5 text-center">آخر رفع</th>
                <th className="p-3.5 text-center">الحالة</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teachers.map((t) => {
                const msg = whatsappLink(t.phone, `مرحباً ${t.name}،`);
                return (
                  <tr key={t.membershipId} className={`hover:bg-slate-50 ${t.active ? '' : 'opacity-60'}`}>
                    <td className="p-3.5 font-bold text-slate-900">
                      {t.name}
                      {t.role === 'owner' && <span className="mr-1 text-[10px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded">مدير</span>}
                    </td>
                    <td className="p-3.5 text-slate-600">{t.groups.map((g) => g.name).join('، ') || '—'}</td>
                    <td className="p-3.5 font-mono text-slate-600 tabular-nums" dir="ltr">
                      {t.phone || '—'}
                    </td>
                    <td className="p-3.5 text-center text-slate-600">{timeAgo(t.lastUploadAt)}</td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${t.active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        {t.active ? 'نشط' : 'موقوف'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => setAssignFor(t)} className="text-blue-700 hover:underline font-bold cursor-pointer">
                          الصفوف
                        </button>
                        {msg && (
                          <a href={msg} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline font-bold">
                            واتساب
                          </a>
                        )}
                        {t.role === 'teacher' && (
                          <button
                            disabled={busy}
                            onClick={() => run(() => store.setMemberActive(t.membershipId, !t.active))}
                            className="text-slate-500 hover:underline font-bold cursor-pointer"
                          >
                            {t.active ? 'إيقاف' : 'تفعيل'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {data.invitations.map((i) => {
                const url = whatsappLink(i.phone, inviteText(i.name));
                return (
                  <tr key={i.id} className="bg-amber-50/30">
                    <td className="p-3.5 font-bold text-slate-700">{i.name || '—'}</td>
                    <td className="p-3.5 text-slate-500">—</td>
                    <td className="p-3.5 font-mono text-slate-600 tabular-nums" dir="ltr">
                      {i.phone}
                    </td>
                    <td className="p-3.5 text-center text-slate-500">—</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">مدعو، لم يدخل بعد</span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-3">
                        {url && (
                          <a href={url} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline font-bold">
                            إرسال الدعوة
                          </a>
                        )}
                        <button
                          disabled={busy}
                          onClick={() => run(() => store.cancelInvitation(i.id), 'أُلغيت الدعوة.')}
                          className="text-rose-600 hover:underline font-bold cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-x-auto">
          {!stats.classes.length ? (
            <p className="p-6 text-xs text-slate-500">لا توجد صفوف بعد.</p>
          ) : (
            <table className="w-full text-right text-xs min-w-[640px]">
              <thead className="bg-[#F7F8FA] text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">الصف/الشعبة</th>
                  <th className="p-3.5">المادة</th>
                  <th className="p-3.5 text-center">الطلاب</th>
                  <th className="p-3.5">المعلم</th>
                  <th className="p-3.5 text-center">المتوسط</th>
                  <th className="p-3.5 text-center">آخر امتحان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.classes.map((c) => (
                  <tr key={c.group.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-bold text-slate-900">{c.group.name}</td>
                    <td className="p-3.5 text-slate-600">{c.group.subjectName || '—'}</td>
                    <td className="p-3.5 text-center font-mono tabular-nums">{c.group.studentCount}</td>
                    <td className="p-3.5 text-slate-700">{c.teacherNames.join('، ') || <span className="text-amber-700">غير مسند</span>}</td>
                    <td className="p-3.5 text-center font-mono font-bold text-[#1E3A5F] tabular-nums">{pctLabel(c.avgPct)}</td>
                    <td className="p-3.5 text-center text-slate-600">{c.lastExamAt ? timeAgo(c.lastExamAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {inviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-right space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-[#1E3A5F]">دعوة معلم</h3>
              <button onClick={() => setInviteOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              عندما يسجّل المعلم دخوله برقم الواتساب هذا، يصبح عضواً في «{org.name}» تلقائياً. سنفتح لك رسالة واتساب جاهزة لترسلها له.
            </p>
            <input
              value={invite.name}
              onChange={(e) => setInvite({ ...invite, name: e.target.value })}
              placeholder="اسم المعلم"
              className="w-full p-2.5 border border-slate-300 rounded-xl text-sm"
            />
            <input
              value={invite.phone}
              onChange={(e) => setInvite({ ...invite, phone: e.target.value })}
              placeholder="رقم الواتساب، مثال: 0599123456"
              inputMode="tel"
              dir="ltr"
              className="w-full p-2.5 border border-slate-300 rounded-xl text-sm text-right"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={sendInvite}
                disabled={busy}
                className="flex-1 bg-[#1E3A5F] text-white py-2.5 rounded-xl font-bold text-xs disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" /> حفظ الدعوة وإرسالها
              </button>
              <button onClick={() => setInviteOpen(false)} className="bg-slate-100 text-slate-700 py-2.5 px-4 rounded-xl text-xs">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {assignFor && (
        <AssignGroupsModal
          raw={data}
          teacher={assignFor}
          onClose={() => setAssignFor(null)}
          onToggle={(groupId, on) => run(() => store.setGroupTeacher(groupId, assignFor.userId, on))}
          onAssignSubject={(classGroup, subject) =>
            run(async () => {
              // A class imported without a subject: make (or reuse) the class + subject group,
              // put the class's students in it, and give it to the teacher.
              const name = `${classGroup.name} – ${subject.name}`;
              const existing = data.groups.find((g) => g.name === name);
              const id = existing?.id ?? (await store.createGroup({ name, gradeId: classGroup.gradeId || null, subjectId: subject.id, schedule: '' })).id;
              const ids = (await store.listStudents()).filter((st) => st.groupIds.includes(classGroup.id)).map((st) => st.id);
              if (ids.length) await store.addStudentsToGroup(id, ids);
              await store.setGroupTeacher(id, assignFor.userId, true);
            }, `أسندنا «${classGroup.name} – ${subject.name}» إلى ${assignFor.name}`)
          }
        />
      )}
    </div>
  );
};

const AssignGroupsModal: React.FC<{
  raw: SchoolRaw;
  teacher: TeacherStat;
  onClose: () => void;
  onToggle: (groupId: string, on: boolean) => Promise<void>;
  onAssignSubject: (classGroup: SchoolRaw['groups'][number], subject: { id: string; name: string }) => Promise<void>;
}> = ({ raw, teacher, onClose, onToggle, onAssignSubject }) => {
  const curriculaQ = useLoad((st) => st.listCurricula());
  // Classes imported without a subject (the school adds students first, then teachers).
  const plainClasses = raw.groups.filter((g) => !g.subjectName);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const cls = plainClasses.find((g) => g.id === classId);
  const subjects = useMemo(() => {
    if (!cls) return [];
    const grade = (curriculaQ.data ?? []).flatMap((c) => c.grades).find((g) => g.id === cls.gradeId);
    return (grade?.subjects ?? []).filter((s) => s.status === 'published');
  }, [cls, curriculaQ.data]);
  const subject = subjects.find((s) => s.id === subjectId);
  const [saving, setSaving] = useState(false);
  const assign = async () => {
    if (!cls || !subject) return notify('اختر الصف والمادة.');
    setSaving(true);
    await onAssignSubject(cls, subject);
    setSaving(false);
    setSubjectId('');
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 text-right space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-[#1E3A5F]">صفوف {teacher.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-slate-600">المعلم يرى طلاب وامتحانات الصفوف المسندة إليه فقط.</p>

        {plainClasses.length > 0 && (
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 space-y-2 text-xs">
            <p className="font-bold text-slate-800">أسند له صفاً ومادة</p>
            <select value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId(''); }} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
              <option value="">اختر الصف…</option>
              {plainClasses.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.studentCount} طالب)</option>)}
            </select>
            <select value={subjectId} disabled={!cls} onChange={(e) => setSubjectId(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-50">
              <option value="">{cls && !subjects.length ? 'ما لقينا مواد لهذا الصف بالمنهاج' : 'اختر المادة…'}</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={assign} disabled={saving || !cls || !subject} className="w-full bg-[#1E3A5F] text-white py-2 rounded-lg font-bold disabled:opacity-50">
              {saving ? 'جاري الإسناد…' : 'أسند'}
            </button>
            <p className="text-[11px] text-slate-500 leading-relaxed">بننشئ «الصف – المادة» ونضيف له طلاب الصف نفسهم وبنفس رموزهم.</p>
          </div>
        )}

        {!raw.groups.some((g) => g.subjectName) ? (
          !plainClasses.length && <p className="text-xs text-slate-500">لا توجد صفوف بعد.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700">الصفوف والمواد</p>
            {raw.groups.filter((g) => g.subjectName).map((g) => {
              const on = g.teacherIds.includes(teacher.userId);
              return (
                <label key={g.id} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs cursor-pointer">
                  <input type="checkbox" checked={on} onChange={() => onToggle(g.id, !on)} />
                  <span className="font-bold">{g.name}</span>
                  {!g.name.includes(g.subjectName) && <span className="text-slate-500">· {g.subjectName}</span>}
                </label>
              );
            })}
          </div>
        )}
        <button onClick={onClose} className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-xl text-xs font-bold">
          تم
        </button>
      </div>
    </div>
  );
};

// D3: School Report & Heatmap Page
export const SchoolReportPage: React.FC<Nav> = ({ onNavigate }) => {
  const { data, loading, error } = useSchool();
  const [period, setPeriod] = useState<'month' | 'term'>('month');
  const heat = useMemo(() => (data ? lessonHeatmap(data, period === 'month' ? 30 : 120) : null), [data, period]);
  if (loading || error || !data || !heat) return <Loading error={error} />;

  const color = (pct: number | null) => {
    if (pct === null) return 'bg-slate-50 text-slate-300';
    if (pct >= 85) return 'bg-emerald-600 text-white font-bold';
    if (pct >= 70) return 'bg-emerald-200 text-emerald-950 font-bold';
    if (pct >= 55) return 'bg-amber-200 text-amber-950 font-bold';
    return 'bg-red-500 text-white font-bold';
  };

  const exportCsv = () => {
    const lines = [['الصف', ...heat.lessons], ...heat.rows.map((r) => [r.group.name, ...r.cells.map((c) => (c === null ? '' : `${c}%`))])];
    const csv = lines.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'تقرير-المدرسة.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <BackToSchool onNavigate={onNavigate} />
          <h1 className="text-xl font-extrabold text-[#1E3A5F]">تقرير المدرسة: الصفوف × الدروس</h1>
          <p className="text-xs text-slate-500">نسبة إتقان كل صف في كل درس، من الأوراق المعتمدة.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={!heat.rows.length}
            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>تصدير Excel</span>
          </button>
          <button
            onClick={() => onNavigate('B10')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Send className="w-4 h-4" />
            <span>تقارير أولياء الأمور</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-700">الفترة:</span>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${period === 'month' ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            آخر شهر
          </button>
          <button
            onClick={() => setPeriod('term')}
            className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${period === 'term' ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            الفصل (آخر 4 أشهر)
          </button>
        </div>
        <div className="flex items-center gap-3 text-[11px] flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-600 inline-block"></span> 85%+
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-200 inline-block"></span> 70–84%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-200 inline-block"></span> 55–69%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500 inline-block"></span> أقل من 55%
          </span>
        </div>
      </div>

      {!heat.rows.length ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
          لا توجد أوراق معتمدة مربوطة بدروس في هذه الفترة.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
          <table className="w-full text-center text-xs">
            <thead className="bg-[#1E3A5F] text-white font-bold">
              <tr>
                <th className="p-3.5 text-right sticky right-0 bg-[#1E3A5F]">الصف</th>
                {heat.lessons.map((l) => (
                  <th key={l} className="p-3 min-w-[110px]">
                    {l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {heat.rows.map((r) => (
                <tr key={r.group.id} className="hover:bg-slate-50/70">
                  <td className="p-3.5 text-right font-sans font-bold text-slate-900 sticky right-0 bg-white">{r.group.name}</td>
                  {r.cells.map((c, i) => (
                    <td key={i} className="p-2">
                      <span className={`px-3 py-1 rounded-md text-xs inline-block ${color(c)}`}>{c === null ? '—' : `${c}%`}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// D4: Compare classes & teachers
export const TeacherComparisonPage: React.FC<Nav> = ({ onNavigate }) => {
  const { data, loading, error, stats } = useSchool();
  if (loading || error || !data || !stats) return <Loading error={error} />;
  const rows = stats.teachers.filter((t) => t.groups.length);

  return (
    <div className="space-y-6 text-right max-w-5xl mx-auto pb-16">
      <div className="border-b border-slate-200 pb-4">
        <BackToSchool onNavigate={onNavigate} />
        <h1 className="text-xl font-extrabold text-[#1E3A5F]">مقارنة المعلمين والصفوف</h1>
        <p className="text-xs text-slate-500">المتوسط، التغيّر عن الشهر السابق، أضعف درس، ونسبة تسليم الأوراق.</p>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-1">
        <strong className="font-bold text-[#1E3A5F] flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>الخلاصة:</span>
        </strong>
        <p className="leading-relaxed text-blue-900 text-[12px]">{stats.summary}</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
        {!rows.length ? (
          <p className="p-6 text-xs text-slate-500">أسند الصفوف للمعلمين أولاً من «المعلمون والصفوف».</p>
        ) : (
          <table className="w-full text-right text-xs min-w-[640px]">
            <thead className="bg-[#F7F8FA] text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">المعلم / الصفوف</th>
                <th className="p-3.5 text-center">المتوسط</th>
                <th className="p-3.5 text-center">التغيّر</th>
                <th className="p-3.5">أضعف درس</th>
                <th className="p-3.5 text-center">تسليم الأوراق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((t) => {
                const low = t.avgPct !== null && t.avgPct < 65;
                return (
                  <tr key={t.userId} className={`hover:bg-slate-50 ${low ? 'bg-red-50/30' : ''}`}>
                    <td className="p-3.5 font-bold text-slate-900">
                      {t.name}
                      <span className="block text-[11px] text-slate-500 font-normal">{t.groups.map((g) => g.name).join('، ')}</span>
                    </td>
                    <td className={`p-3.5 text-center font-mono font-bold tabular-nums ${low ? 'text-red-600' : 'text-emerald-600'}`}>{pctLabel(t.avgPct)}</td>
                    <td
                      className={`p-3.5 text-center font-bold ${t.change === null ? 'text-slate-400' : t.change >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
                    >
                      {t.change === null ? '—' : `${t.change >= 0 ? '+' : ''}${t.change}% ${t.change >= 0 ? '↗' : '↘'}`}
                    </td>
                    <td className="p-3.5 text-slate-600">{t.weakest ? `${t.weakest.lesson} (${t.weakest.pct}%)` : '—'}</td>
                    <td className="p-3.5 text-center font-mono tabular-nums">{pctLabel(t.submissionRate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
