import React, { useEffect, useMemo, useState } from 'react';
import { ScreenId } from '../../types';
import { useData, useLoad, errorMessage } from '../../data/DataContext';
import type { StudentInput, StudentRow } from '../../data/types';
import {
  Users,
  Search,
  Plus,
  FileSpreadsheet,
  ArrowUp,
  ArrowDown,
  Minus,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Smartphone,
  BookOpen,
  Pencil,
  Trash2,
  Ban,
  RotateCcw
} from 'lucide-react';
import { notify } from '../../lib/notify';

interface GroupsStudentsPageProps {
  onNavigate: (screen: ScreenId) => void;
  onSelectStudent: (studentId: string) => void;
}

/** Reads rows pasted from Excel (tab-separated) or a CSV file: name, parent phone, student phone. */
function parseStudentRows(text: string, groupId: string): StudentInput[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(/\t|,|؛|;/).map((c) => c.trim().replace(/^"|"$/g, '')))
    .filter((cells) => cells[0] && !/اسم|name/i.test(cells[0]))
    .map((cells) => ({ name: cells[0], parentPhone: cells[1] ?? '', studentPhone: cells[2] ?? '', groupId }));
}

/** Compares names the way people type them: spaces, hamza forms, taa marbuta and alef maqsura don't matter. */
const nameKey = (name: string) =>
  name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');

export const GroupsStudentsPage: React.FC<GroupsStudentsPageProps> = ({
  onNavigate,
  onSelectStudent,
}) => {
  const store = useData();
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCurriculumId, setNewGroupCurriculumId] = useState('');
  const [newGroupGradeId, setNewGroupGradeId] = useState('');
  const [newGroupSubjectId, setNewGroupSubjectId] = useState('');
  const [newGroupSchedule, setNewGroupSchedule] = useState('');
  // Add-student form
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGroupId, setNewStudentGroupId] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newParentApproval, setNewParentApproval] = useState(false);
  // «طالب موجود»: put a student who is already saved (e.g. in another subject's group) in this group too.
  const [addMode, setAddMode] = useState<'new' | 'existing'>('new');
  const [existingQuery, setExistingQuery] = useState('');
  const [copyFromGroupId, setCopyFromGroupId] = useState('');
  // Import form
  const [importGroupId, setImportGroupId] = useState('');
  const [importText, setImportText] = useState('');
  const [linkExisting, setLinkExisting] = useState(true);

  // Edit / disable / delete a student
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editGroupIds, setEditGroupIds] = useState<string[]>([]);
  const [editParentPhone, setEditParentPhone] = useState('');
  const [editStudentPhone, setEditStudentPhone] = useState('');
  const [editApproval, setEditApproval] = useState(false);
  const [confirming, setConfirming] = useState<{ kind: 'disable' | 'delete'; student: StudentRow } | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const groupsQ = useLoad((st) => st.listGroups());
  const studentsQ = useLoad((st) => st.listStudents());
  const archivedQ = useLoad((st) => st.listArchivedStudents());
  const archived = archivedQ.data ?? [];
  const curriculaQ = useLoad((st) => st.listCurricula());
  const groups = groupsQ.data ?? [];
  const students = studentsQ.data ?? [];
  const curricula = useMemo(() => (curriculaQ.data ?? []).filter((c) => c.isAvailable !== false), [curriculaQ.data]);

  // Default the curriculum pickers to the first available choice.
  useEffect(() => {
    if (newGroupCurriculumId || !curricula.length) return;
    const c = curricula[0];
    const g = c.grades[0];
    setNewGroupCurriculumId(c.id);
    setNewGroupGradeId(g?.id ?? '');
    setNewGroupSubjectId(g?.subjects.find((x) => x.status === 'published')?.id ?? '');
  }, [curricula, newGroupCurriculumId]);

  const currentGroupObj = groups.find(g => g.id === selectedGroup);

  const filteredStudents = students.filter((st) => {
    const matchesGroup = selectedGroup === 'all' || st.groupIds.includes(selectedGroup);
    const matchesSearch = st.name.includes(searchQuery) || st.studentCode.includes(searchQuery) || st.parentPhone.includes(searchQuery);
    return matchesGroup && matchesSearch;
  });

  const defaultGroupId = currentGroupObj?.id ?? groups[0]?.id ?? '';

  const groupName = (id: string) => groups.find((g) => g.id === id)?.name.split('(')[0].trim() ?? '';
  const groupsLabel = (st: StudentRow) => st.groupIds.map(groupName).filter(Boolean).join('، ') || st.group.split('(')[0];

  const openAddStudent = () => {
    setNewStudentGroupId(defaultGroupId);
    setAddMode('new');
    setExistingQuery('');
    setCopyFromGroupId('');
    setShowAddModal(true);
  };

  // Students already saved but not yet in the chosen group.
  const existingMatches = useMemo(() => {
    const q = nameKey(existingQuery);
    return students
      .filter((st) => !st.groupIds.includes(newStudentGroupId))
      .filter((st) => !q || nameKey(st.name).includes(q) || st.studentCode.includes(q))
      .slice(0, 8);
  }, [students, existingQuery, newStudentGroupId]);
  const copySource = students.filter((st) => copyFromGroupId && st.groupIds.includes(copyFromGroupId) && !st.groupIds.includes(newStudentGroupId));

  const addExisting = async (ids: string[], message: string) => {
    if (!newStudentGroupId) return notify('اختر المجموعة أولاً');
    if (!ids.length) return notify('لا يوجد طلاب جدد لإضافتهم لهذه المجموعة');
    setSaving(true);
    try {
      await store.addStudentsToGroup(newStudentGroupId, ids);
      notify(message, 'success');
      studentsQ.reload();
      groupsQ.reload();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const openImport = () => {
    setImportGroupId(defaultGroupId);
    setImportText('');
    setLinkExisting(true);
    setShowExcelModal(true);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      notify('يرجى إدخال اسم المجموعة');
      return;
    }
    if (!newGroupSubjectId) {
      notify('اختر الصف والمادة للمجموعة');
      return;
    }
    setSaving(true);
    try {
      const group = await store.createGroup({
        name: newGroupName,
        gradeId: newGroupGradeId || null,
        subjectId: newGroupSubjectId || null,
        schedule: newGroupSchedule,
      });
      groupsQ.setData((prev) => [...(prev ?? []), group]);
      setSelectedGroup(group.id);
      setShowAddGroupModal(false);
      setNewGroupName('');
      setNewGroupSchedule('');
      notify('تم إنشاء المجموعة');
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleAddStudent = async () => {
    if (newStudentName.trim().split(/\s+/).length < 2) {
      notify('اكتب اسم الطالب كاملاً (اسمين على الأقل)');
      return;
    }
    if (!newStudentGroupId) {
      notify('أنشئ مجموعة أولاً ثم أضف الطالب إليها');
      return;
    }
    setSaving(true);
    try {
      await store.createStudent({
        name: newStudentName,
        groupId: newStudentGroupId,
        parentPhone: newParentPhone,
        studentPhone: newStudentPhone,
        parentApproval: newParentApproval,
      });
      notify('تمت إضافة الطالب، وتولّد رمزه الخاص (4 أرقام) تلقائياً');
      setShowAddModal(false);
      setNewStudentName('');
      setNewParentPhone('');
      setNewStudentPhone('');
      setNewParentApproval(false);
      studentsQ.reload();
      groupsQ.reload();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (st: StudentRow) => {
    setEditing(st);
    setEditName(st.name);
    setEditGroupIds(st.groupIds);
    setEditParentPhone(st.parentPhone);
    setEditStudentPhone(st.studentPhone ?? '');
    setEditApproval(st.parentApproval);
  };

  const reloadAll = () => {
    studentsQ.reload();
    archivedQ.reload();
    groupsQ.reload();
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (editName.trim().split(/\s+/).length < 2) {
      notify('اكتب اسم الطالب كاملاً (اسمين على الأقل)');
      return;
    }
    setSaving(true);
    try {
      await store.updateStudent(editing.id, {
        name: editName,
        parentPhone: editParentPhone,
        studentPhone: editStudentPhone,
        parentApproval: editApproval,
      });
      const sameGroups =
        editGroupIds.length === editing.groupIds.length && editGroupIds.every((g) => editing.groupIds.includes(g));
      if (!sameGroups) await store.setStudentGroups(editing.id, editGroupIds);
      notify('تم حفظ بيانات الطالب', 'success');
      setEditing(null);
      reloadAll();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirming) return;
    const { kind, student } = confirming;
    setSaving(true);
    try {
      if (kind === 'disable') {
        await store.archiveStudent(student.id);
        notify(`تم تعطيل ${student.name}. تجده في «الطلاب المعطّلون» ويمكنك تفعيله متى شئت.`, 'success');
      } else {
        await store.deleteStudent(student.id);
        notify(`تم حذف ${student.name} نهائياً`, 'success');
      }
      setConfirming(null);
      reloadAll();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (st: StudentRow) => {
    try {
      await store.restoreStudent(st.id);
      notify(`تم تفعيل ${st.name} من جديد`, 'success');
      reloadAll();
    } catch (e) {
      notify(errorMessage(e));
    }
  };

  const importRows = parseStudentRows(importText, importGroupId);
  // Names that match a saved student: link them to that same student (same code, billed once).
  const studentsByName = useMemo(() => {
    const m = new Map<string, StudentRow[]>();
    for (const st of students) m.set(nameKey(st.name), [...(m.get(nameKey(st.name)) ?? []), st]);
    return m;
  }, [students]);
  const importMatched = importRows
    .map((r) => studentsByName.get(nameKey(r.name)))
    .filter((list): list is StudentRow[] => !!list && list.length === 1)
    .map((list) => list[0]);
  const matchedKeys = new Set(importMatched.map((st) => nameKey(st.name)));
  const handleImport = async () => {
    if (!importGroupId) {
      notify('اختر المجموعة أولاً');
      return;
    }
    if (!importRows.length) {
      notify('الصق أسماء الطلاب أولاً، اسم كل طالب في سطر');
      return;
    }
    setSaving(true);
    try {
      const linked = linkExisting ? importMatched.map((st) => st.id) : [];
      const fresh = linkExisting ? importRows.filter((r) => !matchedKeys.has(nameKey(r.name))) : importRows;
      const n = fresh.length ? await store.createStudents(fresh) : 0;
      if (linked.length) await store.addStudentsToGroup(importGroupId, linked);
      notify(
        linked.length
          ? `تمت إضافة ${n} طالباً جديداً، وربط ${linked.length} طالباً موجوداً مسبقاً بنفس رموزهم`
          : `تم استيراد ${n} طالباً بنجاح`,
      );
      setShowExcelModal(false);
      studentsQ.reload();
      groupsQ.reload();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    if (/\.xlsx?$/i.test(file.name)) {
      notify('احفظ ملف Excel بصيغة CSV أولاً، أو انسخ الأعمدة والصقها هنا');
      return;
    }
    setImportText(await file.text());
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#1E3A5F]">المجموعات والطلاب</h1>
          <p className="text-xs text-slate-500">إدارة الطلاب والمجموعات المرتبطة بمناهج وصفوف محددة لمنع خروج الأسئلة عن المساق</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openImport}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>استيراد من Excel</span>
          </button>

          <button
            onClick={openAddStudent}
            className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة طالب</span>
          </button>
        </div>
      </div>

      {/* Group Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setSelectedGroup('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
            selectedGroup === 'all'
              ? 'bg-[#1E3A5F] text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          كل الطلاب ({students.length})
        </button>

        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelectedGroup(g.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              selectedGroup === g.id
                ? 'bg-[#1E3A5F] text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {g.name.split('(')[0].trim()} ({g.studentCount})
          </button>
        ))}

        <button
          onClick={() => setShowAddGroupModal(true)}
          className="text-xs text-blue-700 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg font-bold border border-dashed border-blue-300 whitespace-nowrap cursor-pointer flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>مجموعة جديدة</span>
        </button>
      </div>

      {/* Group Curriculum & Progress Banner (Shown when a specific group is selected) */}
      {currentGroupObj && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-[#1E3A5F] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200/60">
                {currentGroupObj.curriculumName}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-700 font-semibold">{currentGroupObj.gradeName}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-900 font-bold">{currentGroupObj.subjectName}</span>
            </div>
            <p className="text-xs text-slate-500">
              {currentGroupObj.schedule && <>المواعيد: {currentGroupObj.schedule} · </>}عدد الطلاب: {currentGroupObj.studentCount}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-700">
                شُرح {currentGroupObj.taughtLessonsCount} من {currentGroupObj.totalLessonsCount} درساً
              </div>
              <div className="w-36 bg-slate-200 h-2 rounded-full overflow-hidden mt-1.5">
                <div 
                  className="bg-[#1E3A5F] h-full rounded-full transition-all"
                  style={{ width: `${currentGroupObj.totalLessonsCount ? Math.round((currentGroupObj.taughtLessonsCount / currentGroupObj.totalLessonsCount) * 100) : 0}%` }}
                />
              </div>
            </div>

            <button
              onClick={() => onNavigate('B14')}
              className="bg-[#1E3A5F] hover:bg-[#152a45] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span>وين وصلنا؟</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث باسم الطالب، رمزه الرباعي، أو رقم هاتف ولي الأمر..."
          className="w-full text-xs bg-transparent focus:outline-hidden text-slate-800"
        />
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <table className="w-full text-right text-xs">
          <thead className="bg-[#F7F8FA] text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th className="p-3.5">الاسم والرمز</th>
              <th className="p-3.5">المجموعة</th>
              <th className="p-3.5">هاتف ولي الأمر (واتساب)</th>
              <th className="p-3.5 text-center">آخر درجة</th>
              <th className="p-3.5 text-center">الاتجاه</th>
              <th className="p-3.5 text-center">موافقة التقارير</th>
              <th className="p-3.5 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.map((st) => (
              <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3.5">
                  <div
                    onClick={() => {
                      onSelectStudent(st.id);
                      onNavigate('B3');
                    }}
                    className="cursor-pointer group"
                  >
                    <span className="font-bold text-slate-900 group-hover:text-[#1E3A5F]">
                      {st.name}
                    </span>
                    <span className="block font-mono text-[10px] text-slate-400 tabular-nums">
                      رمز: {st.studentCode}
                    </span>
                  </div>
                </td>
                <td className="p-3.5 text-slate-600">{groupsLabel(st)}</td>
                <td className="p-3.5">
                  <div className="flex items-center gap-1.5 font-mono text-slate-700 tabular-nums">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{st.parentPhone}</span>
                  </div>
                </td>
                <td className="p-3.5 text-center">
                  <span className={`font-bold font-mono text-sm tabular-nums ${
                    st.latestScore >= 85 ? 'text-emerald-600' : st.latestScore >= 65 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {st.latestScore} / {st.totalScore}
                  </span>
                </td>
                <td className="p-3.5 text-center">
                  {st.trend === 'up' && (
                    <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded">
                      <ArrowUp className="w-3.5 h-3.5" /> تحسن
                    </span>
                  )}
                  {st.trend === 'down' && (
                    <span className="inline-flex items-center gap-0.5 text-red-700 font-bold text-xs bg-red-50 px-2 py-0.5 rounded">
                      <ArrowDown className="w-3.5 h-3.5" /> تراجع
                    </span>
                  )}
                  {st.trend === 'steady' && (
                    <span className="inline-flex items-center gap-0.5 text-slate-500 text-xs bg-slate-100 px-2 py-0.5 rounded">
                      <Minus className="w-3.5 h-3.5" /> ثابت
                    </span>
                  )}
                </td>
                <td className="p-3.5 text-center">
                  {st.parentApproval ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      موافق
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-400 font-medium text-[11px]">
                      <XCircle className="w-3.5 h-3.5" />
                      معلق
                    </span>
                  )}
                </td>
                <td className="p-3.5 text-center">
                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={() => {
                        onSelectStudent(st.id);
                        onNavigate('B3');
                      }}
                      className="text-[#1E3A5F] hover:bg-blue-50 px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer"
                    >
                      الملف الشخصي
                    </button>
                    <button onClick={() => openEdit(st)} title="تعديل" aria-label={`تعديل ${st.name}`} className="p-1.5 rounded text-slate-600 hover:bg-slate-100 cursor-pointer">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirming({ kind: 'disable', student: st })} title="تعطيل" aria-label={`تعطيل ${st.name}`} className="p-1.5 rounded text-amber-700 hover:bg-amber-50 cursor-pointer">
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirming({ kind: 'delete', student: st })} title="حذف" aria-label={`حذف ${st.name}`} className="p-1.5 rounded text-red-600 hover:bg-red-50 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View (PDF requirement: على الهاتف يتحول الجدول إلى بطاقات) */}
      <div className="md:hidden space-y-3">
        {filteredStudents.map((st) => (
          <div
            key={st.id}
            onClick={() => {
              onSelectStudent(st.id);
              onNavigate('B3');
            }}
            className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs active:bg-slate-50 cursor-pointer"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{st.name}</h3>
                <span className="text-[10px] text-slate-400 font-mono">رمز: {st.studentCode} · {groupsLabel(st)}</span>
              </div>
              <div className="text-left">
                <span className={`font-black text-base tabular-nums ${
                  st.latestScore >= 85 ? 'text-emerald-600' : st.latestScore >= 65 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {st.latestScore} / {st.totalScore}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                {st.parentPhone}
              </span>
              <div className="flex items-center gap-2">
                {st.trend === 'up' && <span className="text-emerald-700 text-xs font-bold">↑ تحسن</span>}
                {st.trend === 'down' && <span className="text-red-700 text-xs font-bold">↓ تراجع</span>}
                {st.trend === 'steady' && <span className="text-slate-500 text-xs">− ثابت</span>}
                <span className="text-blue-700 font-bold text-xs">عرض الملف ←</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => openEdit(st)} className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer">
                <Pencil className="w-3.5 h-3.5" /> تعديل
              </button>
              <button onClick={() => setConfirming({ kind: 'disable', student: st })} className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold cursor-pointer">
                <Ban className="w-3.5 h-3.5" /> تعطيل
              </button>
              <button onClick={() => setConfirming({ kind: 'delete', student: st })} className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" /> حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty / loading states */}
      {(studentsQ.loading || groupsQ.loading) && !students.length && (
        <div className="text-center text-xs text-slate-500 py-10">جاري تحميل الطلاب...</div>
      )}
      {(studentsQ.error || groupsQ.error) && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-center justify-between">
          <span>{studentsQ.error || groupsQ.error}</span>
          <button onClick={() => { studentsQ.reload(); groupsQ.reload(); }} className="font-bold underline cursor-pointer">إعادة المحاولة</button>
        </div>
      )}
      {!studentsQ.loading && !studentsQ.error && filteredStudents.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-2">
          <Users className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">
            {groups.length === 0 ? 'ابدأ بإنشاء أول مجموعة' : searchQuery ? 'لا يوجد طالب بهذا البحث' : 'لا يوجد طلاب في هذه المجموعة بعد'}
          </p>
          <p className="text-xs text-slate-500">
            {groups.length === 0 ? 'كل مجموعة مرتبطة بصف ومادة من المنهج.' : 'أضف الطلاب واحداً واحداً أو الصق القائمة من Excel.'}
          </p>
          <button
            onClick={groups.length === 0 ? () => setShowAddGroupModal(true) : openAddStudent}
            className="mt-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer"
          >
            {groups.length === 0 ? 'مجموعة جديدة' : 'إضافة طالب'}
          </button>
        </div>
      )}

      {/* Disabled students */}
      {archived.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowArchived(!showArchived)}
            aria-expanded={showArchived}
            className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Ban className="w-4 h-4 text-amber-600" />
              الطلاب المعطّلون ({archived.length})
            </span>
            <span className="text-[#1E3A5F]">{showArchived ? 'إخفاء' : 'عرض'}</span>
          </button>
          {showArchived && (
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              <p className="p-3 text-[11px] text-slate-500 leading-relaxed">
                الطالب المعطّل لا يظهر في القوائم، ولا يُحسب في الاشتراك، ولا يستطيع التسليم من رابط الامتحان. درجاته السابقة محفوظة.
              </p>
              {archived.map((st) => (
                <div key={st.id} className="p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <span className="font-bold text-slate-700 block">{st.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">رمز: {st.studentCode}{st.group ? ` · ${st.group.split('(')[0]}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleRestore(st)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold cursor-pointer">
                      <RotateCcw className="w-3.5 h-3.5" /> تفعيل
                    </button>
                    <button onClick={() => setConfirming({ kind: 'delete', student: st })} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 font-bold cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" /> حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Student Modal */}
      {editing && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-right space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-[#1E3A5F]">تعديل بيانات الطالب</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم الطالب</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">المجموعات (المواد) التي يدرس فيها</label>
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {groups.map((g) => {
                    const on = editGroupIds.includes(g.id);
                    return (
                      <label key={g.id} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => setEditGroupIds((prev) => (on ? prev.filter((x) => x !== g.id) : [...prev, g.id]))}
                        />
                        <span className="font-bold">{g.name}</span>
                        {g.subjectName && <span className="text-slate-500">· {g.subjectName}</span>}
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">نفس الطالب ونفس رمزه في كل مجموعاته، ويُحسب في الاشتراك مرة واحدة.</p>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">رقم واتساب ولي الأمر</label>
                <input type="tel" dir="ltr" value={editParentPhone} onChange={(e) => setEditParentPhone(e.target.value)} placeholder="0599000000" className="w-full p-2 border border-slate-300 rounded-lg font-mono text-right" />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" /> رقم الطالب (اختياري)</label>
                <input type="tel" dir="ltr" value={editStudentPhone} onChange={(e) => setEditStudentPhone(e.target.value)} placeholder="0599000000" className="w-full p-2 border border-slate-300 rounded-lg font-mono text-right" />
              </div>
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input type="checkbox" checked={editApproval} onChange={(e) => setEditApproval(e.target.checked)} />
                <span>ولي الأمر وافق على استلام التقارير على واتساب</span>
              </label>
              <p className="text-[11px] text-slate-500">رمز الطالب ({editing.studentCode}) لا يتغيّر.</p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button disabled={saving} onClick={handleSaveEdit} className="flex-1 bg-[#1E3A5F] text-white py-2 rounded-lg font-bold text-xs cursor-pointer disabled:opacity-60">
                {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
              <button onClick={() => setEditing(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg font-medium text-xs cursor-pointer">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm disable / delete */}
      {confirming && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-right space-y-4 shadow-2xl">
            <h3 className={`font-bold text-base ${confirming.kind === 'delete' ? 'text-red-700' : 'text-amber-800'}`}>
              {confirming.kind === 'delete' ? `حذف ${confirming.student.name} نهائياً؟` : `تعطيل ${confirming.student.name}؟`}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {confirming.kind === 'delete'
                ? 'سيُحذف الطالب وكل أوراقه ودرجاته ورسومه، ولا يمكن التراجع. إن كان الطالب ترك مؤقتاً فالأفضل «تعطيله» بدل الحذف.'
                : 'سيختفي من القوائم ولن يُحسب في الاشتراك، ولن يقبل رابط التسليم رمزه. درجاته محفوظة، ويمكنك تفعيله لاحقاً من «الطلاب المعطّلون».'}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                disabled={saving}
                onClick={handleConfirm}
                className={`flex-1 text-white py-2 rounded-lg font-bold text-xs cursor-pointer disabled:opacity-60 ${confirming.kind === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
              >
                {saving ? 'لحظة...' : confirming.kind === 'delete' ? 'نعم، احذف نهائياً' : 'نعم، عطّل الطالب'}
              </button>
              <button onClick={() => setConfirming(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg font-medium text-xs cursor-pointer">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-right space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-[#1E3A5F]">إضافة طالب للمجموعة</h3>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setAddMode('new')}
                className={`flex-1 py-1.5 rounded-lg font-bold cursor-pointer ${addMode === 'new' ? 'bg-white text-[#1E3A5F] shadow-2xs' : 'text-slate-600'}`}
              >
                طالب جديد
              </button>
              <button
                onClick={() => setAddMode('existing')}
                className={`flex-1 py-1.5 rounded-lg font-bold cursor-pointer ${addMode === 'existing' ? 'bg-white text-[#1E3A5F] shadow-2xs' : 'text-slate-600'}`}
              >
                طالب موجود مسبقاً
              </button>
            </div>
            {addMode === 'existing' ? (
              <div className="space-y-3 text-xs">
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  للطالب المسجّل في مادة أخرى: يبقى نفس الطالب بنفس رمزه، ويُحسب في الاشتراك مرة واحدة.
                </p>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">أضفه إلى المجموعة</label>
                  <select value={newStudentGroupId} onChange={(e) => setNewStudentGroupId(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg">
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 space-y-2">
                  <label className="block text-slate-700 font-bold">انسخ طلاب مجموعة أخرى (مثلاً نفس الشعبة في مادة ثانية)</label>
                  <div className="flex items-center gap-2">
                    <select value={copyFromGroupId} onChange={(e) => setCopyFromGroupId(e.target.value)} className="flex-1 min-w-0 p-2 border border-slate-300 rounded-lg bg-white">
                      <option value="">اختر المجموعة</option>
                      {groups.filter((g) => g.id !== newStudentGroupId).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <button
                      disabled={saving || !copySource.length}
                      onClick={() => addExisting(copySource.map((st) => st.id), `تمت إضافة ${copySource.length} طالباً بنفس رموزهم`)}
                      className="shrink-0 bg-[#1E3A5F] text-white px-3 py-2 rounded-lg font-bold cursor-pointer disabled:opacity-50"
                    >
                      أضف ({copySource.length})
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">أو ابحث عن طالب واحد</label>
                  <input
                    type="text"
                    value={existingQuery}
                    onChange={(e) => setExistingQuery(e.target.value)}
                    placeholder="اسم الطالب أو رمزه"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  {existingMatches.length === 0 ? (
                    <p className="text-slate-500">لا يوجد طالب مطابق خارج هذه المجموعة.</p>
                  ) : (
                    existingMatches.map((st) => (
                      <div key={st.id} className="flex items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate">{st.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">رمز: {st.studentCode}{st.groupIds.length ? ` · ${groupsLabel(st)}` : ''}</span>
                        </div>
                        <button
                          disabled={saving}
                          onClick={() => addExisting([st.id], `تمت إضافة ${st.name} للمجموعة`)}
                          className="shrink-0 text-[#1E3A5F] bg-white border border-blue-200 px-2.5 py-1 rounded-lg font-bold cursor-pointer disabled:opacity-50"
                        >
                          إضافة
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <button onClick={() => setShowAddModal(false)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg font-bold text-xs cursor-pointer">
                  تم
                </button>
              </div>
            ) : (
            <>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم الطالب</label>
                <input type="text" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} placeholder="مثال: يحيى خليل السقا" className="w-full p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">المجموعة</label>
                <select value={newStudentGroupId} onChange={(e) => setNewStudentGroupId(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg">
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">رقم واتساب ولي الأمر (لإرسال التقارير)</label>
                <input type="tel" dir="ltr" value={newParentPhone} onChange={(e) => setNewParentPhone(e.target.value)} placeholder="0599000000" className="w-full p-2 border border-slate-300 rounded-lg font-mono text-right" />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" /> رقم الطالب (اختياري)</label>
                <input type="tel" dir="ltr" value={newStudentPhone} onChange={(e) => setNewStudentPhone(e.target.value)} placeholder="0599000000" className="w-full p-2 border border-slate-300 rounded-lg font-mono text-right" />
              </div>
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input type="checkbox" checked={newParentApproval} onChange={(e) => setNewParentApproval(e.target.checked)} />
                <span>ولي الأمر وافق على استلام التقارير على واتساب</span>
              </label>
              <p className="text-[11px] text-slate-500">رمز الطالب الخاص (4 أرقام) يتولّد تلقائياً بعد الحفظ.</p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                disabled={saving}
                onClick={handleAddStudent}
                className="flex-1 bg-[#1E3A5F] text-white py-2 rounded-lg font-bold text-xs cursor-pointer disabled:opacity-60"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ وإضافة الطالب'}
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg font-medium text-xs cursor-pointer"
              >
                إلغاء
              </button>
            </div>
            </>
            )}
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {showExcelModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-right space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-[#1E3A5F] flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>استيراد قائمة الطلاب من Excel</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              انسخ من Excel ثلاثة أعمدة بهذا الترتيب: اسم الطالب، رقم ولي الأمر، رقم الطالب (اختياري)، ثم الصقها هنا. أو ارفع ملف CSV.
            </p>
            <div className="text-xs">
              <label className="block text-slate-700 font-bold mb-1">المجموعة</label>
              <select value={importGroupId} onChange={(e) => setImportGroupId(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg">
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={6}
              placeholder={'أحمد محمود المصري\t0599112233\nسارة خالد النجار\t0598223344'}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
            />
            <label className="block border-2 border-dashed border-slate-300 rounded-xl p-3 text-center bg-slate-50 cursor-pointer text-xs text-slate-600">
              <input type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={(e) => handleImportFile(e.target.files?.[0])} />
              أو اضغط لاختيار ملف CSV
            </label>
            {importRows.length > 0 && (
              <p className="text-xs text-emerald-700 font-bold">جاهز لاستيراد {importRows.length} طالباً</p>
            )}
            {importMatched.length > 0 && (
              <label className="flex items-start gap-2 text-xs text-slate-700 bg-blue-50/60 border border-blue-200 rounded-xl p-2.5 cursor-pointer">
                <input type="checkbox" checked={linkExisting} onChange={(e) => setLinkExisting(e.target.checked)} className="mt-0.5" />
                <span>
                  {importMatched.length} من هذه الأسماء مسجّلون مسبقاً (في مادة أخرى). اربطهم بنفس الطالب ونفس رمزه بدل إنشاء طالب جديد، حتى يُحسبوا في الاشتراك مرة واحدة.
                </span>
              </label>
            )}
            <div className="flex items-center gap-2 pt-2">
              <button
                disabled={saving}
                onClick={handleImport}
                className="flex-1 bg-emerald-700 text-white py-2 rounded-lg font-bold text-xs cursor-pointer disabled:opacity-60"
              >
                {saving ? 'جاري الاستيراد...' : 'بدء الاستيراد'}
              </button>
              <button
                onClick={() => setShowExcelModal(false)}
                className="bg-slate-100 text-slate-700 py-2 px-4 rounded-lg font-medium text-xs cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Group Modal Bound to Curriculum (Requirement: إلزامية تحديد المنهج والصف والمادة) */}
      {showAddGroupModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 text-right space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#1E3A5F]" />
                <h3 className="font-bold text-base text-[#1E3A5F]">إنشاء مجموعة دراسية جديدة</h3>
              </div>
              <span className="text-[11px] bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full">
                مرتبطة بمنهاج رسمي
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              ربط المجموعة بالمنهاج والصف والمادة يضمن أن كافة الأسئلة والتصحيح الآلي وبنك الأسئلة تظل محصورة بدقة داخل ما يدرسه الطلاب فقط.
            </p>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم المجموعة / الشعبة</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="مثال: الفوج الذهبي - رياضيات علمي أ"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 text-slate-900"
                />
              </div>

              {/* Curriculum, grade and subject (draft subjects are hidden) */}
              {(() => {
                const selCurr = curricula.find((c) => c.id === newGroupCurriculumId);
                const selGrade = selCurr?.grades.find((g) => g.id === newGroupGradeId);
                const pubSubjects = selGrade?.subjects.filter((s) => s.status === 'published') ?? [];
                if (curriculaQ.loading) return <div className="text-slate-500">جارٍ تحميل المناهج…</div>;
                if (!curricula.length)
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 leading-relaxed">
                      لا يوجد منهج متاح بعد. يجب أن يضيف مدير المنصة المنهج، ويجعله «متاحاً للتسجيل»، وينشر مادة واحدة على الأقل.
                    </div>
                  );
                return (
                  <>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">المنهاج التعليمي</label>
                      <select
                        value={newGroupCurriculumId}
                        onChange={(e) => {
                          const c = curricula.find((x) => x.id === e.target.value);
                          const g = c?.grades[0];
                          setNewGroupCurriculumId(e.target.value);
                          setNewGroupGradeId(g?.id ?? '');
                          setNewGroupSubjectId(g?.subjects.find((x) => x.status === 'published')?.id ?? '');
                        }}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white"
                      >
                        {curricula.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.country ? `${c.name} (${c.country})` : c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">الصف الدراسي</label>
                        <select
                          value={newGroupGradeId}
                          disabled={!selCurr?.grades.length}
                          onChange={(e) => {
                            const gr = selCurr?.grades.find((g) => g.id === e.target.value);
                            setNewGroupGradeId(e.target.value);
                            setNewGroupSubjectId(gr?.subjects.find((s) => s.status === 'published')?.id ?? '');
                          }}
                          className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white disabled:bg-slate-50"
                        >
                          {!selCurr?.grades.length && <option value="">لا توجد صفوف</option>}
                          {selCurr?.grades.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">المادة المقررة</label>
                        <select
                          value={newGroupSubjectId}
                          disabled={!pubSubjects.length}
                          onChange={(e) => setNewGroupSubjectId(e.target.value)}
                          className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white disabled:bg-slate-50"
                        >
                          {!pubSubjects.length && <option value="">لا توجد مواد</option>}
                          {pubSubjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {selGrade && !pubSubjects.length && (
                      <div className="text-[11px] text-amber-800">لا توجد مادة منشورة لهذا الصف بعد. المواد المسودة لا تظهر للمدرّسين.</div>
                    )}
                  </>
                );
              })()}

              <div>
                <label className="block text-slate-700 font-bold mb-1">مواعيد الجلسات الأسبوعية</label>
                <input
                  type="text"
                  value={newGroupSchedule}
                  onChange={(e) => setNewGroupSchedule(e.target.value)}
                  placeholder="مثال: الأحد والثلاثاء 3:30 م"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={saving || !newGroupSubjectId}
                onClick={handleCreateGroup}
                className="disabled:opacity-60 flex-1 bg-[#1E3A5F] hover:bg-[#152a45] text-white py-2.5 rounded-lg font-bold text-xs transition-colors shadow-sm cursor-pointer"
              >
                إنشاء المجموعة وربط المنهاج
              </button>
              <button
                type="button"
                onClick={() => setShowAddGroupModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-lg font-medium text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
