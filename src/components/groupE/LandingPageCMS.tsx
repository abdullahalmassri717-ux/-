import React, { useState, useEffect } from 'react';
import { ScreenId, LandingPageConfig } from '../../types';
import {
  getLandingPageConfig,
  saveLandingPageConfig,
  resetLandingPageConfig
} from '../../mockData';
import {
  LayoutTemplate,
  Save,
  RotateCcw,
  Eye,
  CheckCircle2,
  Sparkles,
  Type,
  Users,
  Compass,
  HelpCircle,
  PhoneCall,
  Sliders,
  Plus,
  Trash2,
  AlertCircle,
  ExternalLink,
  Layers,
  BookOpen,
  ArrowRight
} from 'lucide-react';

interface LandingPageCMSProps {
  onNavigate: (screen: ScreenId) => void;
}

export const LandingPageCMS: React.FC<LandingPageCMSProps> = ({ onNavigate }) => {
  const [config, setConfig] = useState<LandingPageConfig>(getLandingPageConfig());
  const [activeTab, setActiveTab] = useState<'hero' | 'audience' | 'howItWorks' | 'curricula' | 'features' | 'faqs' | 'footer' | 'visibility'>('hero');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  useEffect(() => {
    const handleUpdate = () => {
      setConfig(getLandingPageConfig());
    };
    window.addEventListener('dequa_landing_config_updated', handleUpdate);
    return () => window.removeEventListener('dequa_landing_config_updated', handleUpdate);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSave = () => {
    saveLandingPageConfig(config);
    setIsDirty(false);
    showToast('تم حفظ ونشر إعدادات الصفحة التعريفية بنجاح!');
  };

  const handleReset = () => {
    if (window.confirm('هل أنت متأكد من استعادة كافة النصوص والإعدادات الافتراضية للمنصة؟')) {
      const def = resetLandingPageConfig();
      setConfig(def);
      setIsDirty(false);
      showToast('تمت استعادة الإعدادات والنصوص الافتراضية.');
    }
  };

  const updateHero = (field: keyof LandingPageConfig['hero'], val: string) => {
    setConfig(prev => ({
      ...prev,
      hero: { ...prev.hero, [field]: val }
    }));
    setIsDirty(true);
  };

  const updateWhoIsItForCard = (
    cardKey: 'tutor' | 'school' | 'center',
    field: string,
    val: string | string[]
  ) => {
    setConfig(prev => ({
      ...prev,
      whoIsItFor: {
        ...prev.whoIsItFor,
        [cardKey]: {
          ...prev.whoIsItFor[cardKey],
          [field]: val
        }
      }
    }));
    setIsDirty(true);
  };

  const updateStep = (index: number, field: 'title' | 'desc', val: string) => {
    const nextSteps = [...config.howItWorks.steps];
    nextSteps[index] = { ...nextSteps[index], [field]: val };
    setConfig(prev => ({
      ...prev,
      howItWorks: { ...prev.howItWorks, steps: nextSteps }
    }));
    setIsDirty(true);
  };

  const updateFeature = (index: number, field: 'title' | 'desc', val: string) => {
    const nextItems = [...config.features.items];
    nextItems[index] = { ...nextItems[index], [field]: val };
    setConfig(prev => ({
      ...prev,
      features: { ...prev.features, items: nextItems }
    }));
    setIsDirty(true);
  };

  const updateFaq = (index: number, field: 'q' | 'a', val: string) => {
    const nextFaqs = [...config.faqs.items];
    nextFaqs[index] = { ...nextFaqs[index], [field]: val };
    setConfig(prev => ({
      ...prev,
      faqs: { ...prev.faqs, items: nextFaqs }
    }));
    setIsDirty(true);
  };

  const handleAddFaq = () => {
    setConfig(prev => ({
      ...prev,
      faqs: {
        ...prev.faqs,
        items: [
          ...prev.faqs.items,
          { q: 'سؤال جديد يطرحه المعلمون أو أولياء الأمور؟', a: 'اكتب الإجابة التوضيحية والشاملة هنا بالتفصيل.' }
        ]
      }
    }));
    setIsDirty(true);
    showToast('تمت إضافة سؤال جديد إلى القائمة.');
  };

  const handleDeleteFaq = (index: number) => {
    setConfig(prev => ({
      ...prev,
      faqs: {
        ...prev.faqs,
        items: prev.faqs.items.filter((_, i) => i !== index)
      }
    }));
    setIsDirty(true);
  };

  const toggleSection = (section: keyof LandingPageConfig['sectionVisibility']) => {
    setConfig(prev => ({
      ...prev,
      sectionVisibility: {
        ...prev.sectionVisibility,
        [section]: !prev.sectionVisibility[section]
      }
    }));
    setIsDirty(true);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#1E3A5F] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-blue-300 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner & Global Action Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>نظام إدارة محتوى الصفحة التعريفية (Landing Page CMS)</span>
            </span>
            {isDirty && (
              <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold animate-pulse">
                توجد تعديلات غير محفوظة
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#1E3A5F] mt-1">
            إعدادات ونصوص الصفحة التعريفية للمنصة
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            تحكم كامل بالعناوين، البنرات، نصوص الفئات المستهدفة، خطوات العمل، الأسئلة الشائعة، وإظهار/إخفاء الأقسام فورياً دون لمس الكود.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('A1')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-200"
            title="معاينة الصفحة كما تظهر للزائر"
          >
            <Eye className="w-4 h-4 text-blue-600" />
            <span>معاينة حية للموقع (A1)</span>
          </button>

          <button
            onClick={handleReset}
            className="bg-white hover:bg-red-50 text-slate-600 hover:text-red-700 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-200"
            title="استعادة النصوص الأساسية"
          >
            <RotateCcw className="w-4 h-4" />
            <span>استعادة الافتراضي</span>
          </button>

          <button
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer flex items-center gap-2 active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>حفظ ونشر التعديلات</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveTab('hero')}
          className={`px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'hero' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Type className="w-4 h-4" />
          <span>الواجهة والهيدر (Hero)</span>
        </button>

        <button
          onClick={() => setActiveTab('audience')}
          className={`px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'audience' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>قسم «لمن دقة؟»</span>
        </button>

        <button
          onClick={() => setActiveTab('howItWorks')}
          className={`px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'howItWorks' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>خطوات العمل (6 خطوات)</span>
        </button>

        <button
          onClick={() => setActiveTab('curricula')}
          className={`px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'curricula' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>المناهج والصفوف</span>
        </button>

        <button
          onClick={() => setActiveTab('features')}
          className={`px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'features' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>المزايا والقدرات</span>
        </button>

        <button
          onClick={() => setActiveTab('faqs')}
          className={`px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'faqs' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>الأسئلة الشائعة (FAQ)</span>
        </button>

        <button
          onClick={() => setActiveTab('footer')}
          className={`px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'footer' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          <span>الفوتر وبيانات الاتصال</span>
        </button>

        <button
          onClick={() => setActiveTab('visibility')}
          className={`px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'visibility' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>إظهار/إخفاء الأقسام</span>
        </button>
      </div>

      {/* Tab 1: Hero Section Editor */}
      {activeTab === 'hero' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-[#1E3A5F] text-base">الواجهة الرئيسية والبانر العلوي (Hero Section)</h2>
              <p className="text-xs text-slate-500">العناوين الرئيسية وأزرار الدعوة للإجراء ونموذج الورقة المصححة</p>
            </div>
            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-bold">أعلى الصفحة</span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Announcement Badge */}
            <div className="space-y-1">
              <label className="font-bold text-slate-800">شريط الإعلان العلوي الصغير (Badge)</label>
              <input
                type="text"
                value={config.hero.announcementBadge}
                onChange={(e) => updateHero('announcementBadge', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Headline */}
            <div className="space-y-1">
              <label className="font-bold text-slate-800">العنوان الرئيسي الكبير (Headline)</label>
              <input
                type="text"
                value={config.hero.headline}
                onChange={(e) => updateHero('headline', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400">مثال: «صحّح واجبات وامتحانات طلابك في دقائق» (بدون ذكر التوجيهي كحصر)</p>
            </div>

            {/* Subheadline */}
            <div className="space-y-1">
              <label className="font-bold text-slate-800">العنوان الفرعي والوصف (Subheadline)</label>
              <textarea
                rows={3}
                value={config.hero.subheadline}
                onChange={(e) => updateHero('subheadline', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 leading-relaxed"
              />
            </div>

            {/* CTA Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="font-bold text-slate-800">نص الزر الأساسي (Primary CTA)</label>
                <input
                  type="text"
                  value={config.hero.primaryCtaText}
                  onChange={(e) => updateHero('primaryCtaText', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">نص الزر الثانوي (Secondary CTA)</label>
                <input
                  type="text"
                  value={config.hero.secondaryCtaText}
                  onChange={(e) => updateHero('secondaryCtaText', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Sample Exam Card Settings */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>عناصر بطاقة معاينة ورقة الإجابة المصححة التفاعلية</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">عنوان نموذج الامتحان</label>
                  <input
                    type="text"
                    value={config.hero.sampleExamTitle}
                    onChange={(e) => updateHero('sampleExamTitle', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">اسم الطالب التجريبي</label>
                  <input
                    type="text"
                    value={config.hero.sampleStudentName}
                    onChange={(e) => updateHero('sampleStudentName', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">الدرجة المعتمدة</label>
                  <input
                    type="text"
                    value={config.hero.sampleExamScore}
                    onChange={(e) => updateHero('sampleExamScore', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">ملاحظة المعلم المحبرة على الورقة</label>
                <input
                  type="text"
                  value={config.hero.sampleTeacherNote}
                  onChange={(e) => updateHero('sampleTeacherNote', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-red-700"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Who Is It For Section Editor */}
      {activeTab === 'audience' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-[#1E3A5F] text-base">قسم «لمن صُممت منصة دِقّـة؟»</h2>
              <p className="text-xs text-slate-500">تعديل البطاقات الثلاث: المدرّس الخصوصي، المدرسة، المركز التعليمي</p>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-bold">3 بطاقات</span>
          </div>

          {/* Section Titles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">شارة القسم (Badge)</label>
              <input
                type="text"
                value={config.whoIsItFor.sectionBadge}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  whoIsItFor: { ...prev.whoIsItFor, sectionBadge: e.target.value }
                }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">عنوان القسم الرئيسي</label>
              <input
                type="text"
                value={config.whoIsItFor.sectionTitle}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  whoIsItFor: { ...prev.whoIsItFor, sectionTitle: e.target.value }
                }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">الوصف الفرعي</label>
              <input
                type="text"
                value={config.whoIsItFor.sectionSubtitle}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  whoIsItFor: { ...prev.whoIsItFor, sectionSubtitle: e.target.value }
                }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* 3 Audience Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
            {/* Card 1: Tutor */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="font-bold text-blue-900 flex items-center justify-between border-b border-slate-200 pb-2">
                <span>1. المدرّس الخصوصي والمستقل</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">فردي</span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">عنوان البطاقة</label>
                <input
                  type="text"
                  value={config.whoIsItFor.tutor.title}
                  onChange={(e) => updateWhoIsItForCard('tutor', 'title', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">الوصف التوضيحي</label>
                <textarea
                  rows={2}
                  value={config.whoIsItFor.tutor.subtitle}
                  onChange={(e) => updateWhoIsItForCard('tutor', 'subtitle', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">المثال التطبيقي (التوجيهي)</label>
                <textarea
                  rows={3}
                  value={config.whoIsItFor.tutor.exampleText}
                  onChange={(e) => updateWhoIsItForCard('tutor', 'exampleText', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">نص زر الإجراء</label>
                <input
                  type="text"
                  value={config.whoIsItFor.tutor.buttonText}
                  onChange={(e) => updateWhoIsItForCard('tutor', 'buttonText', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                />
              </div>
            </div>

            {/* Card 2: School */}
            <div className="bg-slate-50 border-2 border-emerald-500/60 rounded-xl p-4 space-y-3">
              <div className="font-bold text-emerald-900 flex items-center justify-between border-b border-emerald-200 pb-2">
                <span>2. المدرسة (الخاصة والحكومية)</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">مؤسسي</span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">عنوان البطاقة</label>
                <input
                  type="text"
                  value={config.whoIsItFor.school.title}
                  onChange={(e) => updateWhoIsItForCard('school', 'title', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">الوصف التوضيحي</label>
                <textarea
                  rows={2}
                  value={config.whoIsItFor.school.subtitle}
                  onChange={(e) => updateWhoIsItForCard('school', 'subtitle', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">المثال التطبيقي (الصفوف 1 - 9)</label>
                <textarea
                  rows={3}
                  value={config.whoIsItFor.school.exampleText}
                  onChange={(e) => updateWhoIsItForCard('school', 'exampleText', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">نص زر الإجراء</label>
                <input
                  type="text"
                  value={config.whoIsItFor.school.buttonText}
                  onChange={(e) => updateWhoIsItForCard('school', 'buttonText', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                />
              </div>
            </div>

            {/* Card 3: Center */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="font-bold text-purple-900 flex items-center justify-between border-b border-slate-200 pb-2">
                <span>3. المركز التعليمي والمعهد</span>
                <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">معهد</span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">عنوان البطاقة</label>
                <input
                  type="text"
                  value={config.whoIsItFor.center.title}
                  onChange={(e) => updateWhoIsItForCard('center', 'title', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">الوصف التوضيحي</label>
                <textarea
                  rows={2}
                  value={config.whoIsItFor.center.subtitle}
                  onChange={(e) => updateWhoIsItForCard('center', 'subtitle', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">المثال التطبيقي (دورات التقوية)</label>
                <textarea
                  rows={3}
                  value={config.whoIsItFor.center.exampleText}
                  onChange={(e) => updateWhoIsItForCard('center', 'exampleText', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">نص زر الإجراء</label>
                <input
                  type="text"
                  value={config.whoIsItFor.center.buttonText}
                  onChange={(e) => updateWhoIsItForCard('center', 'buttonText', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: How It Works Steps Editor */}
      {activeTab === 'howItWorks' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-[#1E3A5F] text-base">خطوات كيف تعمل المنصة (How it Works)</h2>
              <p className="text-xs text-slate-500">تعديل الخطوات الست التي توضح دورة عمل تصحيح الأوراق للزائر</p>
            </div>
            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-bold">6 خطوات</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {config.howItWorks.steps.map((step, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs">
                    خطوة {step.num}
                  </span>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">عنوان الخطوة</label>
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) => updateStep(idx, 'title', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">شرح الخطوة</label>
                  <textarea
                    rows={2}
                    value={step.desc}
                    onChange={(e) => updateStep(idx, 'desc', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs leading-relaxed"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Curricula Section */}
      {activeTab === 'curricula' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-[#1E3A5F] text-base">قسم المناهج والصفوف الدراسية المدعومة</h2>
              <p className="text-xs text-slate-500">نصوص المنهاج الفلسطيني والمناهج القادمة قريباً</p>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-bold">المناهج</span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-800">العنوان الرئيسي للقسم</label>
              <input
                type="text"
                value={config.curricula.title}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  curricula: { ...prev.curricula, title: e.target.value }
                }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-800">وصف المنهاج المفتوح</label>
              <textarea
                rows={2}
                value={config.curricula.description}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  curricula: { ...prev.curricula, description: e.target.value }
                }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-800">إشعار المنهاج الفلسطيني (المتاح الآن)</label>
              <input
                type="text"
                value={config.curricula.palestineNotice}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  curricula: { ...prev.curricula, palestineNotice: e.target.value }
                }))}
                className="w-full bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold rounded-xl px-3 py-2 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-800">إشعار المناهج القادمة (الأردني، السعودي، المصري...)</label>
              <input
                type="text"
                value={config.curricula.upcomingNotice}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  curricula: { ...prev.curricula, upcomingNotice: e.target.value }
                }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Features Editor */}
      {activeTab === 'features' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-[#1E3A5F] text-base">مزايا وقدرات المنصة (Features Grid)</h2>
              <p className="text-xs text-slate-500">بطاقات المزايا الرئيسية الست التي تظهر للزائر</p>
            </div>
            <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg font-bold">6 مزايا</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {config.features.items.map((feat, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <span className="font-bold text-slate-400 text-[10px]">ميزة #{idx + 1}</span>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">عنوان الميزة</label>
                  <input
                    type="text"
                    value={feat.title}
                    onChange={(e) => updateFeature(idx, 'title', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">الوصف</label>
                  <textarea
                    rows={2}
                    value={feat.desc}
                    onChange={(e) => updateFeature(idx, 'desc', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs leading-relaxed"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: FAQs Manager */}
      {activeTab === 'faqs' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-[#1E3A5F] text-base">إدارة الأسئلة الشائعة (FAQ Management)</h2>
              <p className="text-xs text-slate-500">إضافة وتعديل وحذف الأسئلة وإجاباتها في الصفحة الرئيسية</p>
            </div>
            <button
              onClick={handleAddFaq}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors border border-blue-200"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة سؤال جديد</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {config.faqs.items.map((faq, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 text-xs">سؤال #{idx + 1}</span>
                  <button
                    onClick={() => handleDeleteFaq(idx)}
                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded cursor-pointer transition-colors"
                    title="حذف هذا السؤال"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">نص السؤال</label>
                  <input
                    type="text"
                    value={faq.q}
                    onChange={(e) => updateFaq(idx, 'q', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">الإجابة المفصلة</label>
                  <textarea
                    rows={3}
                    value={faq.a}
                    onChange={(e) => updateFaq(idx, 'a', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs leading-relaxed"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 7: Footer & Contact Info */}
      {activeTab === 'footer' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-[#1E3A5F] text-base">بيانات التواصل والفوتر وشريط الدعوة النهائي</h2>
              <p className="text-xs text-slate-500">أرقام هواتف الدعم، البريد، نصوص الحقوق، وبانر ختام الصفحة</p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold">الفوتر</span>
          </div>

          <div className="space-y-4 text-xs">
            {/* CTA Banner */}
            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-3">
              <h3 className="font-bold text-[#1E3A5F] text-xs">بانر الحث الختامي (Pre-footer CTA Banner)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">العنوان</label>
                  <input
                    type="text"
                    value={config.ctaBanner.title}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      ctaBanner: { ...prev.ctaBanner, title: e.target.value }
                    }))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">الوصف الفرعي</label>
                  <input
                    type="text"
                    value={config.ctaBanner.subtitle}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      ctaBanner: { ...prev.ctaBanner, subtitle: e.target.value }
                    }))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">نص الزر</label>
                  <input
                    type="text"
                    value={config.ctaBanner.buttonText}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      ctaBanner: { ...prev.ctaBanner, buttonText: e.target.value }
                    }))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Footer details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">رقم واتساب الدعم الفني المباشر</label>
                <input
                  type="text"
                  value={config.footer.whatsappNumber}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    footer: { ...prev.footer, whatsappNumber: e.target.value }
                  }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-left font-mono"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">رقم الهاتف الرسمي</label>
                <input
                  type="text"
                  value={config.footer.contactPhone}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    footer: { ...prev.footer, contactPhone: e.target.value }
                  }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-left font-mono"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">البريد الإلكتروني للدعم</label>
                <input
                  type="text"
                  value={config.footer.contactEmail}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    footer: { ...prev.footer, contactEmail: e.target.value }
                  }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-left font-mono"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">نص حقوق الملكية (Copyright)</label>
                <input
                  type="text"
                  value={config.footer.copyright}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    footer: { ...prev.footer, copyright: e.target.value }
                  }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 8: Section Visibility Toggles */}
      {activeTab === 'visibility' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-[#1E3A5F] text-base">إدارة ظهور أقسام الصفحة الرئيسية (Section Visibility)</h2>
              <p className="text-xs text-slate-500">تحكم فوري بإظهار أو إخفاء أي قسم من أقسام الصفحة التعريفية</p>
            </div>
            <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg font-bold">مفاتيح العرض</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            {[
              { key: 'hero' as const, label: 'الواجهة والهيدر (Hero)', desc: 'العنوان الرئيسي وأزرار البدء والورقة المصححة' },
              { key: 'whoIsItFor' as const, label: 'قسم «لمن دقة؟»', desc: 'بطاقات المعلم المستقل والمدرسة والمركز' },
              { key: 'curricula' as const, label: 'قسم المناهج المدعومة', desc: 'إعلانات المنهاج الفلسطيني والمناهج القادمة' },
              { key: 'howItWorks' as const, label: 'قسم كيف تعمل (How it Works)', desc: 'خطوات العمل الست من التصوير للتصحيح' },
              { key: 'features' as const, label: 'قسم المزايا والقدرات', desc: 'شبكة المزايا الست بالذكاء الاصطناعي' },
              { key: 'faqs' as const, label: 'قسم الأسئلة الشائعة (FAQ)', desc: 'الأوكورديون التفاعلي للإجابات' },
              { key: 'ctaBanner' as const, label: 'بانر الحث الختامي', desc: 'دعوة الاشتراك أسفل الصفحة قبل الفوتر' },
            ].map(sec => {
              const isVisible = config.sectionVisibility[sec.key];
              return (
                <div
                  key={sec.key}
                  onClick={() => toggleSection(sec.key)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    isVisible
                      ? 'bg-emerald-50/50 border-emerald-400'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{sec.label}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isVisible ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                    }`}>
                      {isVisible ? 'ظاهر للزوار' : 'مخفي حالياً'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{sec.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
