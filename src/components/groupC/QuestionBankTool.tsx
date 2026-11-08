import React, { useState } from 'react';
import { ScreenId, BankQuestion } from '../../types';
import {
  BookOpen,
  Search,
  Plus,
  Filter,
  Check,
  Sparkles,
  ArrowRight,
  FileCheck2,
  Trash2,
  Calendar,
  Layers,
  Award
} from 'lucide-react';
import { MOCK_QUESTION_BANK, CURRICULA_DATA } from '../../mockData';

interface QuestionBankToolProps {
  onNavigate: (screen: ScreenId) => void;
  onSelectQuestionsForExam?: (questionIds: string[]) => void;
}

export const QuestionBankTool: React.FC<QuestionBankToolProps> = ({ 
  onNavigate,
  onSelectQuestionsForExam 
}) => {
  const [questions, setQuestions] = useState<BankQuestion[]>(MOCK_QUESTION_BANK);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedLesson, setSelectedLesson] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>(['bq_1', 'bq_2']);
  const [showAddModal, setShowAddModal] = useState(false);

  // New question form state
  const [newText, setNewText] = useState('');
  const [newLesson, setNewLesson] = useState('متوسط التغير');
  const [newOutcome, setNewOutcome] = useState('حساب متوسط تغير الاقتران وتفسيره هندسياً');
  const [newSource, setNewSource] = useState<'ministerial' | 'teacher' | 'ai_generated'>('teacher');
  const [newYear, setNewYear] = useState('2023');

  const toggleSelectQuestion = (id: string) => {
    if (selectedQuestions.includes(id)) {
      setSelectedQuestions(selectedQuestions.filter(qId => qId !== id));
    } else {
      setSelectedQuestions([...selectedQuestions, id]);
    }
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    const newQ: BankQuestion = {
      id: `bq_${Date.now()}`,
      text: newText,
      curriculumId: 'curr_ps',
      gradeId: 'g_12_sci',
      subjectId: 's_math_12',
      lessonId: 'l_1_1',
      lessonName: newLesson,
      learningOutcome: newOutcome,
      difficulty: 'medium',
      source: newSource,
      ministerialYear: newSource === 'ministerial' ? newYear : undefined,
      historicalPassRate: 85,
    };

    setQuestions([newQ, ...questions]);
    setShowAddModal(false);
    setNewText('');
  };

  const filteredQuestions = questions.filter(q => {
    const lName = q.lessonName || q.lesson || '';
    const matchesSource = selectedSource === 'all' || q.source === selectedSource || (selectedSource === 'ministerial' && (q.source === 'past_ministerial' || q.source === 'ministerial')) || (selectedSource === 'teacher' && (q.source === 'teacher' || q.source === 'teacher_file'));
    const matchesYear = selectedYear === 'all' || (q.ministerialYear && q.ministerialYear === selectedYear);
    const matchesDiff = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
    const matchesLesson = selectedLesson === 'all' || lName.includes(selectedLesson);
    const matchesSearch = q.text.includes(searchQuery) || lName.includes(searchQuery) || q.learningOutcome.includes(searchQuery);
    return matchesSource && matchesYear && matchesDiff && matchesLesson && matchesSearch;
  });

  const uniqueLessons = Array.from(new Set(questions.map(q => q.lessonName || q.lesson || '').filter(Boolean)));
  const uniqueYears = Array.from(new Set(questions.map(q => q.ministerialYear).filter(Boolean)));

  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => onNavigate('C_HUB')}
            className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للأدوات الذكية</span>
          </button>
          <h1 className="text-2xl font-black text-[#1E3A5F] flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-700" />
            <span>بنك الأسئلة المعتمد ونواتج التعلّم</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            مستودع شامل للأسئلة الوزارية السابقة، أسئلتك الخاصة، والأسئلة المولّدة؛ مصنفة حسب كل درس وناتج تعلّم في المنهاج.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة سؤال للبنك</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بنص السؤال، اسم الدرس، أو ناتج التعلم..."
              className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 text-slate-800"
            />
          </div>

          {/* Source Filter: وزاري سابق / أسئلة المعلم / مولدة ومراجعة */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-600 shrink-0">المصدر:</span>
            <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50 text-xs">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'ministerial', label: 'وزاري سابق' },
                { id: 'teacher', label: 'أسئلة المدرّس' },
                { id: 'ai_generated', label: 'مولّدة ومراجعة' },
              ].map(src => (
                <button
                  key={src.id}
                  onClick={() => setSelectedSource(src.id)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    selectedSource === src.id
                      ? 'bg-[#1E3A5F] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {src.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Secondary filters: Year, Lesson, Difficulty */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Ministerial Year selector (enabled if ministerial or all) */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold shrink-0">السنة الوزارية:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-slate-800"
            >
              <option value="all">جميع السنوات</option>
              {uniqueYears.map((yr, idx) => (
                <option key={idx} value={yr as string}>دورة {yr}</option>
              ))}
            </select>
          </div>

          {/* Lesson Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold shrink-0">الدرس:</span>
            <select
              value={selectedLesson}
              onChange={(e) => setSelectedLesson(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-slate-800"
            >
              <option value="all">جميع الدروس</option>
              {uniqueLessons.map((l, idx) => (
                <option key={idx} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold shrink-0">مستوى الصعوبة:</span>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-slate-800"
            >
              <option value="all">كل المستويات</option>
              <option value="easy">سهل (تذكر وتطبيق مباشر)</option>
              <option value="medium">متوسط (فهم ومهارات)</option>
              <option value="hard">صعب (تفكير عالي وتميز)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Selected questions action bar */}
      {selectedQuestions.length > 0 && (
        <div className="bg-[#1E3A5F] text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="bg-white/20 px-2.5 py-1 rounded-full font-mono">{selectedQuestions.length}</span>
            <span>أسئلة محددة لإدراجها في ورقة امتحان جديدة</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onSelectQuestionsForExam) {
                  onSelectQuestionsForExam(selectedQuestions);
                } else {
                  onNavigate('C1');
                }
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              تكوين امتحان من الأسئلة المختارة (C1)
            </button>
            <button
              onClick={() => setSelectedQuestions([])}
              className="text-xs text-white/80 hover:text-white px-2 py-1"
            >
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-3">
        {filteredQuestions.map((q) => {
          const isSelected = selectedQuestions.includes(q.id);

          const sourceBadge = {
            ministerial: {
              label: `وزاري (${q.ministerialYear || 'إنجاز'})`,
              color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            },
            past_ministerial: {
              label: `وزاري (${q.ministerialYear || 'إنجاز'})`,
              color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            },
            teacher: {
              label: 'أسئلة المدرّس',
              color: 'bg-blue-50 text-blue-800 border-blue-200',
            },
            teacher_file: {
              label: 'من ملفات المدرّس',
              color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
            },
            ai_generated: {
              label: 'مولّدة ومراجعة',
              color: 'bg-purple-50 text-purple-800 border-purple-200',
            },
          }[q.source] || {
            label: 'سؤال معتمد',
            color: 'bg-slate-50 text-slate-700 border-slate-200',
          };

          const diffBadge = {
            easy: { label: 'سهل', color: 'text-emerald-700 bg-emerald-50' },
            medium: { label: 'متوسط', color: 'text-amber-700 bg-amber-50' },
            hard: { label: 'صعب', color: 'text-red-700 bg-red-50' },
          }[q.difficulty];

          const lessonDisplayName = q.lessonName || q.lesson || 'درس بالمنهاج';

          return (
            <div
              key={q.id}
              className={`bg-white rounded-2xl border transition-all p-5 shadow-2xs flex flex-col md:flex-row md:items-start justify-between gap-4 ${
                isSelected ? 'border-[#1E3A5F] ring-1 ring-[#1E3A5F]/20 bg-blue-50/20' : 'border-slate-200/90'
              }`}
            >
              <div className="flex items-start gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelectQuestion(q.id)}
                  aria-label={`تحديد السؤال: ${lessonDisplayName}`}
                  className="mt-1 rounded text-[#1E3A5F] focus:ring-0 cursor-pointer"
                />

                <div className="space-y-2 flex-1">
                  {/* Badges: Lesson & Learning Outcome & Source with Year */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-[#1E3A5F] bg-slate-100 px-2.5 py-0.5 rounded-md">
                      الدرس: {lessonDisplayName}
                    </span>

                    <span className={`px-2.5 py-0.5 rounded-full font-bold border text-[11px] ${sourceBadge.label ? sourceBadge.color : ''}`}>
                      {sourceBadge.label}
                    </span>

                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${diffBadge.color}`}>
                      {diffBadge.label}
                    </span>

                    {q.historicalPassRate && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        نسبة حل الطلاب: {q.historicalPassRate}%
                      </span>
                    )}
                  </div>

                  {/* Learning Outcome Tag */}
                  <div className="text-xs text-slate-600 flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <Award className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="font-semibold text-slate-700">ناتج التعلّم المقاس:</span>
                    <span>{q.learningOutcome}</span>
                  </div>

                  {/* Question Text */}
                  <p className="text-sm font-bold text-slate-900 leading-relaxed pt-1">
                    {q.text}
                  </p>
                </div>
              </div>

              <div className="flex md:flex-col items-center justify-end gap-2 shrink-0">
                <button
                  onClick={() => toggleSelectQuestion(q.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors w-full ${
                    isSelected
                      ? 'bg-[#1E3A5F] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isSelected ? 'تم الاختيار ✓' : 'إضافة للامتحان'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 text-right space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-[#1E3A5F] flex items-center gap-2">
              <Plus className="w-5 h-5" />
              <span>إضافة سؤال جديد لبنك الأسئلة المعتمد</span>
            </h3>

            <form onSubmit={handleAddQuestion} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">نص السؤال</label>
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="اكتب نص السؤال بدقة رياضية وعلمية..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 min-h-[90px]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الدرس المرتبط به</label>
                  <input
                    type="text"
                    value={newLesson}
                    onChange={(e) => setNewLesson(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">المصدر</label>
                  <select
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ministerial">وزاري سابق</option>
                    <option value="teacher">أسئلة المدرّس الخاصة</option>
                    <option value="ai_generated">سؤال مولّد بالذكاء ومراجع</option>
                  </select>
                </div>
              </div>

              {newSource === 'ministerial' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الدورة والسنة الوزارية</label>
                  <input
                    type="text"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    placeholder="مثال: إنجاز 2023 - الدورة الأولى"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">ناتج التعلّم المستهدف</label>
                <input
                  type="text"
                  value={newOutcome}
                  onChange={(e) => setNewOutcome(e.target.value)}
                  placeholder="مثال: إتقان قاعدة السلسلة وتطبيقها في الاشتقاق"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 bg-[#1E3A5F] hover:bg-[#152a45] text-white py-2.5 rounded-xl font-bold text-xs"
                >
                  حفظ في بنك الأسئلة
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-xl font-medium text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
