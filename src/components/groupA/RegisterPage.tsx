import React, { useState } from 'react';
import { ScreenId, UserRole, EntityType, Entity } from '../../types';
import {
  Check,
  ArrowRight,
  GraduationCap,
  Building2,
  Briefcase,
  Smartphone,
  Lock,
  User,
  School,
  BookOpen,
  Upload,
  Calendar,
  MessageCircle,
  Plus,
  Trash2,
  Sparkles,
  PhoneCall
} from 'lucide-react';
import { CURRICULA_DATA, PLATFORM_CONFIG } from '../../mockData';

interface RegisterPageProps {
  onNavigate: (screen: ScreenId) => void;
  onRoleChange: (role: UserRole) => void;
  onRegisterEntity?: (entity: Entity) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onNavigate,
  onRoleChange,
  onRegisterEntity,
}) => {
  // Account Type
  const [entityType, setEntityType] = useState<EntityType>('individual_teacher');
  const [step, setStep] = useState<number>(1);

  // Teacher Form State
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>(CURRICULA_DATA[0].id);
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>(['grade_12']);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(['math_scientific']);
  const [teacherName, setTeacherName] = useState('أ. محمد المصري');
  const [teacherPhone, setTeacherPhone] = useState('0599123456');
  const [teacherPassword, setTeacherPassword] = useState('••••••••');

  // School / Center Form State
  const [orgName, setOrgName] = useState('مدرسة الأمل الخاصة');
  const [orgRegion, setOrgRegion] = useState('غزة - الرمال الجنوبي');
  const [studentEstimate, setStudentEstimate] = useState('280');
  const [logoUploaded, setLogoUploaded] = useState(false);
  const [teachersToInvite, setTeachersToInvite] = useState([
    { name: 'أ. أحمد حلس', phone: '0599110011', subject: 'الرياضيات' },
    { name: 'أ. ريم شملخ', phone: '0599220022', subject: 'اللغة الإنجليزية' },
  ]);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherPhone, setNewTeacherPhone] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('');
  const [callBooked, setCallBooked] = useState(false);

  // Active Curriculum Data
  const currentCurriculum = CURRICULA_DATA.find((c) => c.id === selectedCurriculumId) || CURRICULA_DATA[0];

  // Filter available grades in curriculum
  const availableGrades = currentCurriculum.grades;

  // Filter available subjects across selected grades (exclude draft subjects)
  const availableSubjects = availableGrades
    .filter((g) => selectedGradeIds.includes(g.id))
    .flatMap((g) => g.subjects)
    .filter((s) => s.status === 'published'); // DRAFT subjects do not show to teachers

  const handleToggleGrade = (gradeId: string) => {
    if (selectedGradeIds.includes(gradeId)) {
      if (selectedGradeIds.length > 1) {
        setSelectedGradeIds(selectedGradeIds.filter((id) => id !== gradeId));
      }
    } else {
      setSelectedGradeIds([...selectedGradeIds, gradeId]);
    }
  };

  const handleToggleSubject = (subjectId: string) => {
    if (selectedSubjectIds.includes(subjectId)) {
      if (selectedSubjectIds.length > 1) {
        setSelectedSubjectIds(selectedSubjectIds.filter((id) => id !== subjectId));
      }
    } else {
      setSelectedSubjectIds([...selectedSubjectIds, subjectId]);
    }
  };

  const handleAddTeacherToInvite = () => {
    if (newTeacherName && newTeacherPhone) {
      setTeachersToInvite([
        ...teachersToInvite,
        {
          name: newTeacherName,
          phone: newTeacherPhone,
          subject: newTeacherSubject || 'عام',
        },
      ]);
      setNewTeacherName('');
      setNewTeacherPhone('');
      setNewTeacherSubject('');
    }
  };

  const handleRemoveTeacherToInvite = (index: number) => {
    setTeachersToInvite(teachersToInvite.filter((_, i) => i !== index));
  };

  const handleCompleteTeacherRegistration = () => {
    const newEntity: Entity = {
      id: `e_tutor_${Date.now()}`,
      name: `أكاديمية ${teacherName}`,
      type: 'individual_teacher',
      logo: '/dequa-logo.png',
      role: 'owner',
      billingPlan: 'monthly_per_student',
      pricePerStudent: PLATFORM_CONFIG.pricing.tutorMonthlyPerStudent,
      currency: PLATFORM_CONFIG.currencySymbol,
      activeStudentsCount: 52,
      region: 'فلسطين',
      principalOrOwnerName: teacherName,
    };

    onRegisterEntity?.(newEntity);
    onRoleChange('teacher');
    onNavigate('B1');
  };

  const handleCompleteOrgRegistration = () => {
    const newEntity: Entity = {
      id: `e_org_${Date.now()}`,
      name: orgName,
      type: entityType,
      logo: '/dequa-logo.png',
      role: 'owner',
      billingPlan: 'yearly_contract',
      pricePerStudent: PLATFORM_CONFIG.pricing.schoolYearlyPerStudent,
      currency: PLATFORM_CONFIG.currencySymbol,
      activeStudentsCount: parseInt(studentEstimate) || 200,
      region: orgRegion,
      principalOrOwnerName: orgName,
    };

    onRegisterEntity?.(newEntity);
    onRoleChange('school_principal');
    onNavigate('D1');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-right">
        {/* Progress header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>الخطوة {step} من {entityType === 'individual_teacher' ? '3' : '3'}</span>
            <span>
              {step === 1 && 'اختيار نوع الحساب'}
              {step === 2 && (entityType === 'individual_teacher' ? 'المنهج والصفوف والمواد' : 'بيانات المؤسسة والشعار')}
              {step === 3 && (entityType === 'individual_teacher' ? 'معلومات المعلم والبدء' : 'دعوة المعلمين ومكالمة التجهيز')}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#1E3A5F] h-full transition-all duration-300 rounded-full"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: نوع الحساب (مدرّس فردي / مدرسة / مركز تعليمي) */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-black text-[#1E3A5F]">اختر نوع حسابك في منصة دقة</h2>
              <p className="text-xs text-slate-500 mt-1">
                منصة عامة مهيأة للتعليم الفردي والمؤسسي لكافة المناهج والصفوف.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: مدرّس فردي */}
              <button
                type="button"
                onClick={() => setEntityType('individual_teacher')}
                className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer space-y-3 ${
                  entityType === 'individual_teacher'
                    ? 'border-[#1E3A5F] bg-[#E8F0F8]/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1E3A5F] flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">مدرّس فردي</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    للمعلمين الخصوصيين والمستقلين. فوترة شهرية {PLATFORM_CONFIG.pricing.tutorMonthlyPerStudent} {PLATFORM_CONFIG.currencySymbol} لكل طالب نشط.
                  </p>
                </div>
              </button>

              {/* Option 2: مدرسة */}
              <button
                type="button"
                onClick={() => setEntityType('school')}
                className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer space-y-3 ${
                  entityType === 'school'
                    ? 'border-[#1E3A5F] bg-[#E8F0F8]/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">مدرسة</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    خاصة أو حكومية. عقد سنوي لكل طالب بدفعتين فصليتين مع ربط المعلمين والشعب.
                  </p>
                </div>
              </button>

              {/* Option 3: مركز تعليمي */}
              <button
                type="button"
                onClick={() => setEntityType('learning_center')}
                className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer space-y-3 ${
                  entityType === 'learning_center'
                    ? 'border-[#1E3A5F] bg-[#E8F0F8]/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">مركز تعليمي</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    للمعاهد والمراكز التي تشمل معلمين متعددين ودورات للمناهج المختلفة.
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
              >
                <span>المتابعة للخطوة التالية</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: TEACHER (Curriculum, Grades, Subjects) */}
        {step === 2 && entityType === 'individual_teacher' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-black text-[#1E3A5F]">اختر المنهج والصفوف والمواد</h2>
              <p className="text-xs text-slate-500 mt-1">
                تُقرأ القوائم ديناميكياً من المناهج المعتمدة في المنصة، ويمكنك إضافة المزيد لاحقاً.
              </p>
            </div>

            {/* Select Curriculum */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">1. المنهج الدراسي</label>
              <select
                value={selectedCurriculumId}
                onChange={(e) => {
                  setSelectedCurriculumId(e.target.value);
                  const curr = CURRICULA_DATA.find((c) => c.id === e.target.value);
                  if (curr && curr.grades.length > 0) {
                    setSelectedGradeIds([curr.grades[0].id]);
                    if (curr.grades[0].subjects.length > 0) {
                      setSelectedSubjectIds([curr.grades[0].subjects[0].id]);
                    }
                  }
                }}
                className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-xl font-bold text-slate-800"
              >
                {CURRICULA_DATA.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.country})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Grade(s) */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">
                2. الصفوف التي تدرّسها (يمكنك اختيار أكثر من صف):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableGrades.map((g) => (
                  <label
                    key={g.id}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                      selectedGradeIds.includes(g.id)
                        ? 'bg-[#E8F0F8] border-blue-300 text-[#1E3A5F] font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{g.name}</span>
                    <input
                      type="checkbox"
                      checked={selectedGradeIds.includes(g.id)}
                      onChange={() => handleToggleGrade(g.id)}
                      className="accent-[#1E3A5F] w-4 h-4 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Select Subject(s) - excludes drafts */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">
                3. المواد الدراسية (مستخرجة من الصفوف المختارة):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableSubjects.map((s) => (
                  <label
                    key={s.id}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                      selectedSubjectIds.includes(s.id)
                        ? 'bg-[#E8F0F8] border-blue-300 text-[#1E3A5F] font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{s.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{s.code}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedSubjectIds.includes(s.id)}
                      onChange={() => handleToggleSubject(s.id)}
                      className="accent-[#1E3A5F] w-4 h-4 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                ← السابق
              </button>
              <button
                onClick={() => setStep(3)}
                className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
              >
                <span>المتابعة لبيانات الحساب</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: TEACHER (Details & Start Instantly) */}
        {step === 3 && entityType === 'individual_teacher' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-black text-[#1E3A5F]">بيانات المعلم والبدء الفوري</h2>
              <p className="text-xs text-slate-500 mt-1">
                حسابك جاهز للانطلاق وتصحيح أول ورقة امتحان في دقائق.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المعلم الكامل</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم الهاتف (الواتساب للتواصل)</label>
                <input
                  type="text"
                  value={teacherPhone}
                  onChange={(e) => setTeacherPhone(e.target.value)}
                  className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-xl font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">كلمة المرور</label>
                <input
                  type="password"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              {/* Confirmation badge */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>تم ضبط حسابك مع المنهج والصفوف المختارة بنجاح!</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  خطة الفوترة: {PLATFORM_CONFIG.pricing.tutorMonthlyPerStudent} {PLATFORM_CONFIG.currencySymbol} شهرياً لكل طالب نشط فقط، دون أي التزام مسبق.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                ← السابق
              </button>
              <button
                onClick={handleCompleteTeacherRegistration}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-7 py-3 rounded-xl font-black text-sm flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>ابدأ الآن وادخل للوحة التحكم</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SCHOOL / CENTER (Org details, region, students, logo) */}
        {step === 2 && entityType !== 'individual_teacher' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-black text-[#1E3A5F]">
                بيانات {entityType === 'school' ? 'المدرسة' : 'المركز التعليمي'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                سيظهر اسم وشعار جهتك التعليمية على كافة الأوراق المصححة وتقارير واتساب.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  اسم {entityType === 'school' ? 'المدرسة' : 'المركز التعليمي'}
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-xl font-bold text-slate-900"
                  placeholder="مثال: مدرسة الأمل الخاصة"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المنطقة والمدينة</label>
                  <input
                    type="text"
                    value={orgRegion}
                    onChange={(e) => setOrgRegion(e.target.value)}
                    className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-xl text-slate-900"
                    placeholder="مثال: غزة - الرمال"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">عدد الطلاب التقريبي</label>
                  <input
                    type="number"
                    value={studentEstimate}
                    onChange={(e) => setStudentEstimate(e.target.value)}
                    className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-xl font-mono text-slate-900"
                    placeholder="280"
                  />
                </div>
              </div>

              {/* Logo Upload Simulation */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  شعار {entityType === 'school' ? 'المدرسة' : 'المركز'} (يُطبع على الأوراق)
                </label>
                <div
                  onClick={() => setLogoUploaded(true)}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-400 p-4 rounded-xl text-center cursor-pointer transition-colors bg-slate-50 flex items-center justify-center gap-2"
                >
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="font-semibold text-slate-600">
                    {logoUploaded ? '✓ تم رفع الشعار بنجاح (logo.png)' : 'انقر لرفع الشعار بصيغة PNG أو JPG'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                ← السابق
              </button>
              <button
                onClick={() => setStep(3)}
                className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
              >
                <span>المتابعة لشاشة دعوة المعلمين</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SCHOOL / CENTER («ادعُ معلميك» + «احجز مكالمة تجهيز») */}
        {step === 3 && entityType !== 'individual_teacher' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-[#1E3A5F]">ادعُ معلميك وجهّز المنظومة</h2>
              <p className="text-xs text-slate-500 mt-1">
                أدخل أرقام واتساب لمعلمي الشعب لربطهم بمدرستك تلقائياً وبدء التصحيح.
              </p>
            </div>

            {/* Quick Add Teacher to Invite Form */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
              <span className="font-bold text-slate-800 block">إضافة معلم للدعوة:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="اسم المعلم"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
                <input
                  type="text"
                  placeholder="رقم الواتساب (059...)"
                  value={newTeacherPhone}
                  onChange={(e) => setNewTeacherPhone(e.target.value)}
                  className="p-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                />
                <input
                  type="text"
                  placeholder="المادة (رياضيات، علوم...)"
                  value={newTeacherSubject}
                  onChange={(e) => setNewTeacherSubject(e.target.value)}
                  className="p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={handleAddTeacherToInvite}
                className="bg-[#1E3A5F] text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ أضف لقائمة الدعوة</span>
              </button>
            </div>

            {/* Invited Teachers List */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-700 block">قائمة المعلمين المرشحين للإرسال ({teachersToInvite.length}):</span>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {teachersToInvite.map((tc, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between">
                    <div>
                      <strong className="block text-slate-900">{tc.name}</strong>
                      <span className="text-[11px] text-slate-500 font-mono">{tc.phone} · {tc.subject}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveTeacherToInvite(idx)}
                      className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Action 1: احجز مكالمة تجهيز ودعم فني */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-[#1E3A5F] block flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4 text-blue-600" />
                  <span>جلسة تدريب وتجهيز مخصصة لطاقمك</span>
                </span>
                <p className="text-slate-600 text-[11px]">
                  يقوم فريق الدقة التقني بإدخال قوائم طلابك وربط الشعب ومساعدتكم في طباعة النماذج الأولى.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCallBooked(true)}
                className={`px-4 py-2 rounded-xl font-bold cursor-pointer transition-colors whitespace-nowrap ${
                  callBooked
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white hover:bg-slate-50 text-[#1E3A5F] border border-blue-300'
                }`}
              >
                {callBooked ? '✓ تم حجز المكالمة بنجاح' : 'احجز مكالمة تجهيز مجانية'}
              </button>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                ← السابق
              </button>
              <button
                onClick={handleCompleteOrgRegistration}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-7 py-3 rounded-xl font-black text-sm flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>إتمام التسجيل والدخول للوحة الإدارة</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
