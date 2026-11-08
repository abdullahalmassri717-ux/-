import React, { useState } from 'react';
import { ScreenId } from '../../types';
import {
  CheckCircle2,
  Clock,
  Send,
  Sparkles,
  BarChart3,
  Users,
  Wallet,
  FileText,
  Smartphone,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Building,
  GraduationCap,
  MessageCircle,
  Camera,
  Play
} from 'lucide-react';
import { useLandingConfig } from '../../lib/landing';

interface LandingPageProps {
  onNavigate: (screen: ScreenId) => void;
  onOpenAI: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenAI }) => {
  const [activeSubjectTab, setActiveSubjectTab] = useState<'math' | 'physics' | 'chemistry' | 'english'>('math');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const cfg = useLandingConfig();
  const featureIcons = [CheckCircle2, Send, BarChart3, Wallet, FileText, Sparkles];
  const features = cfg.features.items.map((f, i) => ({ ...f, icon: featureIcons[i % featureIcons.length] }));
  const steps = cfg.howItWorks.steps;
  const faqs = cfg.faqs.items;

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-[#F7F8FA] border-b border-slate-200 pt-10 pb-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-[#E8F0F8] text-[#1E3A5F] px-4 py-1.5 rounded-full text-xs font-bold border border-blue-200 shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{cfg.hero.announcementBadge}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#1E3A5F] tracking-tight leading-tight max-w-4xl mx-auto">
            {cfg.hero.headline}
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
            {cfg.hero.subheadline}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('A3')}
              className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-6 py-3.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2"
            >
              <span>{cfg.hero.primaryCtaText}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('who-is-it-for');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-5 py-3.5 rounded-xl font-semibold text-sm transition-colors cursor-pointer flex items-center gap-2"
            >
              <span>{cfg.hero.secondaryCtaText}</span>
              <ChevronDown className="w-4 h-4 text-[#1E3A5F]" />
            </button>
          </div>

          {/* Interactive Visual: Graded Paper Card Preview */}
          <div className="max-w-3xl mx-auto mt-10 pt-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-right p-6 relative">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    ✓
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{cfg.hero.sampleExamTitle}</h3>
                    <p className="text-xs text-slate-500">الطالب: {cfg.hero.sampleStudentName} · ورقة إجابة مصححة بدعم دقة</p>
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-xs text-slate-500 block">الدرجة المعتمدة</span>
                  <span className="text-xl font-bold text-emerald-600 tabular-nums">{cfg.hero.sampleExamScore}</span>
                </div>
              </div>

              {/* Scanned Paper Snippet with handwritten simulation */}
              <div className="bg-[#FAF9F6] border border-amber-200/80 rounded-xl p-4 font-mono text-xs text-slate-800 relative space-y-2">
                <div className="absolute top-3 left-4 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  ✓ مكتمل الخطوات
                </div>
                <p className="text-slate-500 text-[11px] font-sans">حل الطالب بالخط اليدوي مقروء عبر الذكاء الاصطناعي المنهاجي:</p>
                <div className="text-sm font-semibold text-blue-950 font-serif leading-relaxed">
                  س² + ص² = 25  ⇒  2س + 2ص (ص') = 0 <span className="text-emerald-600 font-bold mr-2">✓ (+6)</span><br />
                  ص' = -س / ص = -3/4 <span className="text-emerald-600 font-bold mr-2">✓ (+4)</span><br />
                  ص'' = (-ص - س ص') / ص² = (-25) / 64 <span className="text-emerald-600 font-bold mr-2">✓ (+10)</span>
                </div>
                <div className="pt-2 border-t border-amber-200/50 flex items-center justify-between text-xs font-sans">
                  <span className="text-red-600 font-semibold italic">
                    ملاحظة المعلم: "{cfg.hero.sampleTeacherNote}"
                  </span>
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[11px]">
                    فُحص: داخل المنهج المعتمد ✓
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  أُرسلت النتيجة وتفاصيل الورقة تلقائياً على واتساب ولي الأمر
                </span>
                <button
                  onClick={() => onNavigate('B8')}
                  className="text-[#1E3A5F] hover:underline font-bold cursor-pointer"
                >
                  افتح شاشة المراجعة كاملة ←
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: لمن دِقّـة؟ (Who is Dequa for? - 3 Cards with practical examples) */}
      {cfg.sectionVisibility.whoIsItFor && (
      <section id="who-is-it-for" className="max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-24">
        <div className="text-center space-y-2 mb-10">
          <div className="inline-block bg-blue-100 text-[#1E3A5F] text-xs font-bold px-3 py-1 rounded-full">
            {cfg.whoIsItFor.sectionBadge}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E3A5F]">
            {cfg.whoIsItFor.sectionTitle}
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl mx-auto">
            {cfg.whoIsItFor.sectionSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: المدرّس الخصوصي */}
          <div className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">{cfg.whoIsItFor.tutor.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{cfg.whoIsItFor.tutor.subtitle}</p>
              </div>

              {/* Real-world example */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                <span className="font-bold text-slate-700 block">{cfg.whoIsItFor.tutor.exampleTitle}</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {cfg.whoIsItFor.tutor.exampleText}
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-600 pt-1">
                {cfg.whoIsItFor.tutor.features.map((f, n) => (
                  <li key={n} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => onNavigate('A3')}
              className="w-full bg-[#1E3A5F] hover:bg-[#152a45] text-white py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer text-center"
            >
              {cfg.whoIsItFor.tutor.buttonText}
            </button>
          </div>

          {/* Card 2: المدرسة */}
          <div className="bg-white border-2 border-[#1E3A5F] rounded-2xl p-6 shadow-md space-y-4 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-[#1E3A5F] text-white text-[10px] font-bold px-3 py-1 rounded-br-xl">
              حل مؤسسي متكامل
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">{cfg.whoIsItFor.school.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{cfg.whoIsItFor.school.subtitle}</p>
              </div>

              {/* Real-world example */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xs space-y-1">
                <span className="font-bold text-emerald-900 block">{cfg.whoIsItFor.school.exampleTitle}</span>
                <p className="text-emerald-800 text-[11px] leading-relaxed">
                  {cfg.whoIsItFor.school.exampleText}
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-600 pt-1">
                {cfg.whoIsItFor.school.features.map((f, n) => (
                  <li key={n} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => onNavigate('A3')}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer text-center"
            >
              {cfg.whoIsItFor.school.buttonText}
            </button>
          </div>

          {/* Card 3: المركز التعليمي */}
          <div className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">{cfg.whoIsItFor.center.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{cfg.whoIsItFor.center.subtitle}</p>
              </div>

              {/* Real-world example */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                <span className="font-bold text-slate-700 block">{cfg.whoIsItFor.center.exampleTitle}</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {cfg.whoIsItFor.center.exampleText}
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-600 pt-1">
                {cfg.whoIsItFor.center.features.map((f, n) => (
                  <li key={n} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => onNavigate('A3')}
              className="w-full bg-[#1E3A5F] hover:bg-[#152a45] text-white py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer text-center"
            >
              {cfg.whoIsItFor.center.buttonText}
            </button>
          </div>
        </div>
      </section>
      )}

      {/* Section: المناهج المدعومة (Supported Curricula) */}
      {cfg.sectionVisibility.curricula && (
      <section id="curricula-section" className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                {cfg.curricula.badge}
              </span>
              <h2 className="text-2xl font-black text-[#1E3A5F] mt-2">
                {cfg.curricula.title}
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-xl">
                {cfg.curricula.description}
              </p>
            </div>

            <button
              onClick={() => onNavigate('A3')}
              className="bg-[#1E3A5F] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer whitespace-nowrap self-start md:self-auto shadow-xs"
            >
              اختر منهجك وابدأ الآن ←
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Curriculum 1: Palestine */}
            <div className="bg-white border-2 border-emerald-500 rounded-xl p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">🇵🇸 المنهاج الفلسطيني</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  متاح الآن
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                الصفوف 1 - 12 (الأساسي والثانوي والتوجيهي) لكافة المواد العلمية والأدبية.
              </p>
            </div>

            {/* Curriculum 2: Jordan */}
            <div className="bg-white/80 border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2 opacity-85">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">🇯🇴 المنهاج الأردني</span>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  قريباً
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                مرحلة التوجيهي والمرحلة الأساسية - قيد المراجعة وإدخال بنوك الأسئلة.
              </p>
            </div>

            {/* Curriculum 3: Saudi */}
            <div className="bg-white/80 border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2 opacity-85">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">🇸🇦 المنهاج السعودي</span>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  قريباً
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                نظام المسارات والمرحلة المتوسطة والابتدائية.
              </p>
            </div>

            {/* Curriculum 4: Egypt */}
            <div className="bg-white/80 border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2 opacity-85">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">🇪🇬 المنهاج المصري</span>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  قريباً
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                الثانوية العامة ونظام التعليم الجديد والمرحلة الإعدادية.
              </p>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* 6 Feature Cards */}
      {cfg.sectionVisibility.features && (
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E3A5F]">
            {cfg.features.sectionTitle}
          </h2>
          <p className="text-sm text-slate-600">
            {cfg.features.sectionSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-xs transition-all space-y-3"
              >
                <div className="w-10 h-10 rounded-lg bg-[#E8F0F8] text-[#1E3A5F] flex items-center justify-center font-bold">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">{feat.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>
      )}

      {/* How it Works: 6-Step Loop (01 - 06) */}
      {cfg.sectionVisibility.howItWorks && (
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-24">
        <div className="text-center space-y-2 mb-12">
          <div className="inline-block bg-blue-100 text-[#1E3A5F] text-xs font-bold px-3 py-1 rounded-full">
            {cfg.howItWorks.sectionBadge}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E3A5F]">
            {cfg.howItWorks.sectionTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {steps.map((st, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-xl p-5 relative overflow-hidden group hover:border-[#1E3A5F] transition-colors"
            >
              <div className="text-3xl font-black text-slate-200 group-hover:text-blue-100 transition-colors tabular-nums absolute top-3 left-4">
                {st.num}
              </div>
              <div className="space-y-2 pr-1 pt-2">
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  خطوة {st.num}
                </span>
                <h3 className="font-bold text-slate-900 text-sm">{st.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{st.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Before & After Interactive Paper Comparison */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1E3A5F]">
              مقارنة «قبل وبعد»: نفس الورقة بأعين دقة
            </h2>
            <p className="text-xs text-slate-500">
              شاهد كيف يحول الذكاء الاصطناعي خط الطالب الورقي إلى ورقة مصححة احترافية بمعايير دقيقة.
            </p>
          </div>

          {/* Subject Tabs */}
          <div className="flex items-center justify-center gap-2 border-b border-slate-200 pb-3">
            {[
              { id: 'math', label: 'الرياضيات (توجيهي)' },
              { id: 'physics', label: 'الفيزياء' },
              { id: 'chemistry', label: 'الكيمياء' },
              { id: 'english', label: 'اللغة الإنجليزية (Writing)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubjectTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeSubjectTab === tab.id
                    ? 'bg-[#1E3A5F] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 2 Side-by-side papers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before: Raw Student paper */}
            <div className="border border-slate-200 rounded-xl p-4 bg-[#FFFDF9] space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 border-b border-slate-200 pb-2">
                <span>(قبل) ورقة الطالب كما رفعها</span>
                <span className="text-[11px] text-slate-400 font-mono">IMG_SCAN_1042.jpg</span>
              </div>
              <div className="p-4 bg-white border border-dashed border-slate-300 rounded-lg min-h-[220px] font-mono text-xs text-slate-700 space-y-3">
                <div className="border-b border-slate-100 pb-2 flex justify-between">
                  <span>اسم الطالب: محمود البطش</span>
                  <span>سؤال 1</span>
                </div>
                <div className="leading-relaxed opacity-85">
                  س² + ص² = 25<br />
                  2س + 2ص ص' = 0  ⇒  ص' = -س/ص = -3/4<br />
                  ص'' = (-ص - س ص') / ص²<br />
                  = (-4 - 3(-3/4)) / 16 = (-7/4) / 16 = -7/64
                </div>
                <div className="text-[11px] text-slate-400 italic">
                  (خط يدوي غير واضح قليلاً، أخطأ في توحيد المقامات بالخطوة الأخيرة)
                </div>
              </div>
            </div>

            {/* After: Graded Paper */}
            <div className="border border-blue-200 rounded-xl p-4 bg-[#F8FAFC] space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#1E3A5F] border-b border-blue-100 pb-2">
                <span>(بعد) تصحيح منصة دقة مع تفريغ المعايير</span>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5 rounded font-bold">
                  14 / 20 علامة
                </span>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-lg min-h-[220px] text-xs space-y-3 relative">
                <div className="flex justify-between items-center text-slate-800 border-b border-slate-100 pb-2">
                  <span className="font-bold">المعيار الوزاري المطبق:</span>
                  <span className="text-red-600 font-bold">يحتاج مراجعة حسابية</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>✓ اشتقاق ضمني أولي صحيح (2س + 2ص ص' = 0)</span>
                    <span className="font-bold font-mono">6/6</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>✓ إيجاد ميل المشتقة الأولى (-3/4)</span>
                    <span className="font-bold font-mono">4/4</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>✓ تطبيق قاعدة قسمة اقترانين للمشتقة الثانية</span>
                    <span className="font-bold font-mono">4/7</span>
                  </div>
                  <div className="flex items-center justify-between text-red-600 font-medium">
                    <span>✗ خطأ في توحيد المقامات: الناتج الصحيح هو -25/64</span>
                    <span className="font-bold font-mono">0/3</span>
                  </div>
                </div>
                <div className="p-2 bg-red-50 text-red-800 rounded border border-red-200 text-[11px] font-sans">
                  ملاحظة المحبرة بالقلم الأحمر على الورقة: "انتبه لتوحيد المقامات بالبسط (-4 + 9/4 = -7/4)"
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2 Audience Sections (Private Tutor vs Private Schools) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Private Tutor */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1E3A5F] flex items-center justify-center font-bold">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">الحل الأمثل</span>
              <h3 className="text-xl font-extrabold text-[#1E3A5F] mt-1">للمدرّس الخصوصي</h3>
            </div>
            <p className="text-xs text-slate-600">
              صُممت منصة دقة خصيصاً لمدرسي التوجيهي الذين يديرون مئات الطلاب في مجموعات متعددة.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>وقت أكثر لمجموعات جديدة:</strong> وفّر 15 ساعة تصحيح أسبوعياً وافتح شعباً إضافية.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>امتحان أسبوعي بلا أي عبء:</strong> قيّم طلابك أسبوعياً وتتبع تقدمهم بدون تكديس الأوراق.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>تقرير يميّزك أمام الأهالي:</strong> تقارير واتساب احترافية ترتقي بسمعتك ومصداقيتك.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>نظام مالي وحسابات رسوم الطلاب:</strong> تتبع أقساط الطلاب (150 ₪)، إصدار سندات قبض رسمية، وتذكير الأهالي عبر واتساب.</span>
              </li>
            </ul>
            <button
              onClick={() => onNavigate('A2')}
              className="w-full bg-[#1E3A5F] hover:bg-[#152a45] text-white py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              عرض باقات المدرسين (5 شيكل للطالب)
            </button>
          </div>

          {/* Card 2: Private Schools */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">نظام المؤسسات التعليمية</span>
              <h3 className="text-xl font-extrabold text-[#1E3A5F] mt-1">للمدارس الخاصة (الصفوف 1 - 9)</h3>
            </div>
            <p className="text-xs text-slate-600">
              منظومة متكاملة لمدراء المدارس والمشرفين التربويين لمتابعة أداء المعلمين والصفوف.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>متابعة الفاقد التعليمي:</strong> خريطة حرارية ترصد المهارات الضعيفة في كل صف فوراً.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>تقارير شهرية موحدة للأهالي:</strong> ترسل لإشراك أولياء الأمور بنتائج أبنائهم.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>لوحة أداء ورقابة للإدارة:</strong> معرفة نشاط المعلمين ومعدلات التصحيح والتأخير.</span>
              </li>
            </ul>
            <button
              onClick={() => onNavigate('A2')}
              className="w-full bg-slate-900 hover:bg-black text-white py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              عرض خطة المدارس (50 شيكل سنوياً)
            </button>
          </div>
        </div>
      </section>

      {/* WhatsApp Parent Report Preview (as required by PDF page 5) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-emerald-800 text-white rounded-2xl p-6 sm:p-8 space-y-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-700/60 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-emerald-700/80 text-emerald-200 text-xs px-2.5 py-0.5 rounded-full mb-1">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>تقرير واتساب التلقائي</span>
              </div>
              <h3 className="text-xl font-bold">نموذج التقرير الذي يصله ولي الأمر على هاتفه</h3>
            </div>
            <button
              onClick={() => onNavigate('B10')}
              className="bg-white text-emerald-900 hover:bg-emerald-50 px-4 py-2 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer"
            >
              معاينة التقرير الكامل PDF ←
            </button>
          </div>

          {/* Simulated WhatsApp Chat Bubble */}
          <div className="bg-[#EFEAE2] text-slate-800 rounded-xl p-4 max-w-lg mx-auto shadow-inner text-right space-y-2 text-xs">
            <div className="bg-white rounded-lg p-3 shadow-xs space-y-2 border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 text-[11px] text-slate-500">
                <span className="font-bold text-[#1E3A5F]">منصة دِقّـة · أ. محمد المصري</span>
                <span className="tabular-nums">11:42 ص</span>
              </div>
              <p className="font-semibold text-slate-800">
                السلام عليكم ولي أمر الطالب: <strong>أحمد محمود المصري</strong> 🌸
              </p>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                نرفق لكم نتيجة ورقة امتحان الرياضيات (الشهر الأول - التفاضل والتكامل):<br />
                📊 <strong>الدرجة: 88 / 100</strong> (مستوى ممتاز ↗ أعلى بـ 6 درجات عن الاختبار السابق)<br />
                💪 <strong>نقاط القوة:</strong> إتقان ممتاز لقواعد الاشتقاق الضمني والمشتقات العليا.<br />
                🎯 <strong>يحتاج تركيزاً على:</strong> تطبيقات القيم القصوى والمعدلات المرتبطة بالزمن.<br />
                📎 مرفق أدناه صورة ورقة الامتحان المصححة كاملة مع ملاحظات المعلم.
              </p>
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 flex items-center justify-between text-[11px]">
                <span>📄 ورقة_الامتحان_المصححة_أحمد_المصري.pdf</span>
                <span className="font-bold text-emerald-700">تحميل</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Placeholder */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="border border-dashed border-slate-300 rounded-xl p-8 bg-white/50 space-y-2">
          <h3 className="font-bold text-slate-800 text-sm">شهادات وتجارب معلمين من قطاع غزة وفلسطين</h3>
          <p className="text-xs text-slate-500">
            [قريباً — سيتم عرض تجارب المعلمين بعد انتهاء المرحلة التجريبية الأولى بنهاية الفصل الدراسي]
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      {cfg.sectionVisibility.faqs && (
      <section id="faq-section" className="max-w-4xl mx-auto px-4 sm:px-6 scroll-mt-24 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-extrabold text-[#1E3A5F]">{cfg.faqs.sectionTitle}</h2>
          <p className="text-xs text-slate-500">{cfg.faqs.sectionSubtitle}</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-colors"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-right p-4 font-bold text-xs sm:text-sm text-slate-800 hover:text-[#1E3A5F] flex items-center justify-between cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 transition-transform text-slate-400 ${openFaq === idx ? 'rotate-180 text-[#1E3A5F]' : ''}`} />
              </button>
              {openFaq === idx && (
                <div className="px-4 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white pt-10 pb-6 px-4 sm:px-6 mt-16 text-slate-600 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/dequa-logo.png" alt="منصة دقة" className="h-9 w-auto object-contain" />
            <span className="text-slate-400 mr-2 text-[11px] border-r border-slate-200 pr-2">غزة، فلسطين 🇵🇸</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-600">
            <span>واتساب الدعم: <strong className="font-mono text-slate-800 tabular-nums" dir="ltr">{cfg.footer.whatsappNumber}</strong></span>
            <span>البريد: <strong className="font-mono text-slate-800">{cfg.footer.contactEmail}</strong></span>
            <button onClick={() => onNavigate('A2')} className="hover:text-[#1E3A5F] cursor-pointer">الأسعار</button>
            <button onClick={() => onNavigate('B11')} className="hover:text-[#1E3A5F] cursor-pointer font-bold text-emerald-700">حسابات ورسوم الطلاب</button>
            <button onClick={() => onNavigate('B5')} className="hover:text-[#1E3A5F] cursor-pointer">تصوير الامتحانات</button>
            <button onClick={() => onNavigate('A4')} className="hover:text-[#1E3A5F] cursor-pointer font-bold">تسجيل الدخول</button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto text-center text-slate-400 text-[11px] pt-6 mt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{cfg.footer.copyright}</span>
          <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">نظام مالي وسندات قبض للأستاذ مدمج ✓</span>
        </div>
      </footer>
    </div>
  );
};
