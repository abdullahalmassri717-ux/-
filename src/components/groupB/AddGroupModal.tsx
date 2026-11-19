import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useData, errorMessage } from '../../data/DataContext';
import type { Curriculum, Group } from '../../data/types';
import { notify } from '../../lib/notify';

// «إنشاء مجموعة»: a new group is always tied to a curriculum, grade and subject,
// so questions and grading stay inside what its students study.
export const AddGroupModal: React.FC<{
  curricula: Curriculum[];
  curriculaLoading: boolean;
  onClose: () => void;
  onCreated: (group: Group) => void;
}> = ({ curricula, curriculaLoading, onClose, onCreated }) => {
  const store = useData();
  const [saving, setSaving] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCurriculumId, setNewGroupCurriculumId] = useState('');
  const [newGroupGradeId, setNewGroupGradeId] = useState('');
  const [newGroupSubjectId, setNewGroupSubjectId] = useState('');
  const [newGroupSchedule, setNewGroupSchedule] = useState('');

  // Default the curriculum pickers to the first available choice.
  useEffect(() => {
    if (newGroupCurriculumId || !curricula.length) return;
    const c = curricula[0];
    const g = c.grades[0];
    setNewGroupCurriculumId(c.id);
    setNewGroupGradeId(g?.id ?? '');
    setNewGroupSubjectId(g?.subjects.find((x) => x.status === 'published')?.id ?? '');
  }, [curricula, newGroupCurriculumId]);

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
      onCreated(group);
      notify('تم إنشاء المجموعة');
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
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
            if (curriculaLoading) return <div className="text-slate-500">جارٍ تحميل المناهج…</div>;
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
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-lg font-medium text-xs transition-colors cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
