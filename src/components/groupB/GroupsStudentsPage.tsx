import React, { useState } from 'react';
import { ScreenId, Student } from '../../types';
import { MOCK_GROUPS, MOCK_STUDENTS, CURRICULA_DATA } from '../../mockData';
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
  BookOpen
} from 'lucide-react';
import { notify } from '../../lib/notify';

interface GroupsStudentsPageProps {
  onNavigate: (screen: ScreenId) => void;
  onSelectStudent: (studentId: string) => void;
}

export const GroupsStudentsPage: React.FC<GroupsStudentsPageProps> = ({
  onNavigate,
  onSelectStudent,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCurriculumId, setNewGroupCurriculumId] = useState('curr_ps');
  const [newGroupGradeId, setNewGroupGradeId] = useState('g_12_sci');
  const [newGroupSubjectId, setNewGroupSubjectId] = useState('s_math_12');
  const [newGroupSchedule, setNewGroupSchedule] = useState('السبت والثلاثاء 4:00 م');

  // Groups list state to allow dynamic addition
  const [groups, setGroups] = useState(MOCK_GROUPS);

  const currentGroupObj = groups.find(g => g.name === selectedGroup || g.id === selectedGroup);

  const filteredStudents = MOCK_STUDENTS.filter((st) => {
    const matchesGroup = selectedGroup === 'all' || st.group === selectedGroup;
    const matchesSearch = st.name.includes(searchQuery) || st.studentCode.includes(searchQuery) || st.parentPhone.includes(searchQuery);
    return matchesGroup && matchesSearch;
  });

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      notify('يرجى إدخال اسم المجموعة');
      return;
    }
    const curr = CURRICULA_DATA.find(c => c.id === newGroupCurriculumId);
    const gr = curr?.grades.find(g => g.id === newGroupGradeId);
    const sub = gr?.subjects.find(s => s.id === newGroupSubjectId);

    const newGroup = {
      id: `g_${Date.now()}`,
      name: newGroupName,
      curriculumId: newGroupCurriculumId,
      curriculumName: curr?.name || 'المنهاج الفلسطيني',
      gradeId: newGroupGradeId,
      gradeName: gr?.name || 'الصف الثاني عشر',
      subjectId: newGroupSubjectId,
      subjectName: sub?.name || 'الرياضيات',
      schedule: newGroupSchedule,
      studentCount: 0,
      taughtLessonsCount: 0,
      totalLessonsCount: sub?.units.reduce((acc, u) => acc + u.lessons.length, 0) || 20,
      type: 'tawjihi_scientific',
      avgScore: 0,
    };

    setGroups([...groups, newGroup]);
    setSelectedGroup(newGroup.name);
    setShowAddGroupModal(false);
    setNewGroupName('');
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
            onClick={() => setShowExcelModal(true)}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>استيراد من Excel</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
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
          كل الطلاب ({MOCK_STUDENTS.length})
        </button>

        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelectedGroup(g.name)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              selectedGroup === g.name
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
              المواعيد: {currentGroupObj.schedule} · عدد الطلاب: {currentGroupObj.studentCount}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-700">
                شُرح {currentGroupObj.taughtLessonsCount || 9} من {currentGroupObj.totalLessonsCount || 24} درساً
              </div>
              <div className="w-36 bg-slate-200 h-2 rounded-full overflow-hidden mt-1.5">
                <div 
                  className="bg-[#1E3A5F] h-full rounded-full transition-all"
                  style={{ width: `${Math.round(((currentGroupObj.taughtLessonsCount || 9) / (currentGroupObj.totalLessonsCount || 24)) * 100)}%` }}
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
                <td className="p-3.5 text-slate-600">{st.group.split('(')[0]}</td>
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
                  <button
                    onClick={() => {
                      onSelectStudent(st.id);
                      onNavigate('B3');
                    }}
                    className="text-[#1E3A5F] hover:bg-blue-50 px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer"
                  >
                    الملف الشخصي
                  </button>
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
                <span className="text-[10px] text-slate-400 font-mono">رمز: {st.studentCode} · {st.group.split('(')[0]}</span>
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
          </div>
        ))}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-right space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-[#1E3A5F]">إضافة طالب جديد للمجموعة</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم الطالب الرباعي</label>
                <input type="text" placeholder="مثال: يحيى خليل السقا" className="w-full p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">المجموعة</label>
                <select className="w-full p-2 border border-slate-300 rounded-lg">
                  {MOCK_GROUPS.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">رقم واتساب ولي الأمر (لإرسال التقارير)</label>
                <input type="tel" placeholder="0599000000" className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">الرمز التعريفي للطالب (4 أرقام)</label>
                <input type="text" defaultValue="5012" className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  notify('تمت إضافة الطالب وتوليد رمز QR الخاص بورقة إجابته بنجاح!');
                  setShowAddModal(false);
                }}
                className="flex-1 bg-[#1E3A5F] text-white py-2 rounded-lg font-bold text-xs cursor-pointer"
              >
                حفظ وإضافة الطالب
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg font-medium text-xs cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {showExcelModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-right space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-[#1E3A5F] flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>استيراد قائمة الطلاب من ملف Excel</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              ارفع ملف Excel يحتوي على الأعمدة: [اسم الطالب، رقم هاتف ولي الأمر، المجموعة، الرمز]. سيقوم النظام بإنشاء ملفات الطلاب وتخصيص أكواد QR تلقائياً.
            </p>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center space-y-2 bg-slate-50">
              <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-xs text-slate-600">اسحب وأفلت ملف .xlsx أو اضغط للاختيار</div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  notify('تم استيراد 48 طالباً بنجاح وتوزيعهم على المجموعات.');
                  setShowExcelModal(false);
                }}
                className="flex-1 bg-emerald-700 text-white py-2 rounded-lg font-bold text-xs cursor-pointer"
              >
                بدء الاستيراد
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 text-right space-y-4 shadow-2xl">
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

              {/* Curriculum Selector */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">المنهاج التعليمي</label>
                <select
                  value={newGroupCurriculumId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setNewGroupCurriculumId(cId);
                    const c = CURRICULA_DATA.find(x => x.id === cId);
                    if (c && c.grades.length > 0) {
                      setNewGroupGradeId(c.grades[0].id);
                      const publishedSubjects = c.grades[0].subjects.filter(s => s.status === 'published');
                      if (publishedSubjects.length > 0) {
                        setNewGroupSubjectId(publishedSubjects[0].id);
                      }
                    }
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white"
                >
                  {CURRICULA_DATA.filter(c => c.isAvailable).map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.country})</option>
                  ))}
                </select>
              </div>

              {/* Grade Selector */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الصف الدراسي</label>
                  <select
                    value={newGroupGradeId}
                    onChange={(e) => {
                      const gId = e.target.value;
                      setNewGroupGradeId(gId);
                      const curr = CURRICULA_DATA.find(c => c.id === newGroupCurriculumId);
                      const gr = curr?.grades.find(g => g.id === gId);
                      const pub = gr?.subjects.filter(s => s.status === 'published') || [];
                      if (pub.length > 0) setNewGroupSubjectId(pub[0].id);
                    }}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white"
                  >
                    {CURRICULA_DATA.find(c => c.id === newGroupCurriculumId)?.grades.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                {/* Subject Selector (Drafts filtered out) */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">المادة المقررة</label>
                  <select
                    value={newGroupSubjectId}
                    onChange={(e) => setNewGroupSubjectId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white"
                  >
                    {CURRICULA_DATA.find(c => c.id === newGroupCurriculumId)
                      ?.grades.find(g => g.id === newGroupGradeId)
                      ?.subjects.filter(s => s.status === 'published')
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </select>
                </div>
              </div>

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
                onClick={handleCreateGroup}
                className="flex-1 bg-[#1E3A5F] hover:bg-[#152a45] text-white py-2.5 rounded-lg font-bold text-xs transition-colors shadow-sm cursor-pointer"
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
