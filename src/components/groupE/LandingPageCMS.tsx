import React, { useEffect, useState } from 'react';
import type {
  ScreenId,
  LandingPageConfig,
  LandingItemStatus,
  LandingAudienceCard,
  LandingCustomSection,
} from '../../types';
import { loadLandingConfig, mergeLanding, storeLandingConfig } from '../../lib/landing';
import { CUSTOM_PREFIX, newId, type BuiltinSectionKey } from '../../lib/landingConfig';
import {
  LayoutTemplate,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  Type,
  Users,
  Compass,
  HelpCircle,
  PhoneCall,
  Plus,
  Trash2,
  BookOpen,
  ChevronUp,
  ChevronDown,
  Layers,
  Clock,
  Pencil,
  Lock,
} from 'lucide-react';

interface LandingPageCMSProps {
  onNavigate: (screen: ScreenId) => void;
}

type Tab = 'sections' | 'hero' | 'audience' | 'curricula' | 'features' | 'howItWorks' | 'faqs' | 'custom' | 'footer';

/** Built-in sections: their name in the list, and the tab that edits them (none = fixed content). */
const BUILTIN_INFO: Record<BuiltinSectionKey, { label: string; tab?: Tab }> = {
  whoIsItFor: { label: 'لمن دقة؟ (بطاقات الفئات)', tab: 'audience' },
  curricula: { label: 'المناهج المدعومة', tab: 'curricula' },
  features: { label: 'المزايا والقدرات', tab: 'features' },
  howItWorks: { label: 'كيف تعمل (الخطوات)', tab: 'howItWorks' },
  install: { label: 'تنزيل التطبيق على الهاتف' },
  comparison: { label: 'مقارنة «قبل وبعد» للورقة' },
  plans: { label: 'بطاقتا المدرّس الخصوصي والمدارس' },
  whatsapp: { label: 'نموذج تقرير واتساب لولي الأمر' },
  testimonials: { label: 'شهادات المعلمين' },
  faqs: { label: 'الأسئلة الشائعة', tab: 'faqs' },
  ctaBanner: { label: 'بانر الدعوة الختامي', tab: 'footer' },
};

const STATUS_OPTIONS: { value: LandingItemStatus; label: string; on: string; Icon: React.FC<{ className?: string }> }[] = [
  { value: 'visible', label: 'ظاهر', on: 'bg-emerald-600 text-white border-emerald-600', Icon: Eye },
  { value: 'soon', label: 'قريباً', on: 'bg-amber-500 text-white border-amber-500', Icon: Clock },
  { value: 'hidden', label: 'مخفي', on: 'bg-slate-500 text-white border-slate-500', Icon: EyeOff },
];

const inputCls = 'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500';

// ---------- small building blocks ----------

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  ltr?: boolean;
  bold?: boolean;
  hint?: string;
}> = ({ label, value, onChange, rows, ltr, bold, hint }) => (
  <label className="block space-y-1 min-w-0">
    <span className="text-[11px] font-bold text-slate-700">{label}</span>
    {rows ? (
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} leading-relaxed`} />
    ) : (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={ltr ? 'ltr' : undefined}
        className={`${inputCls} ${bold ? 'font-bold' : ''} ${ltr ? 'text-left font-mono' : ''}`}
      />
    )}
    {hint && <span className="block text-[10px] text-slate-400">{hint}</span>}
  </label>
);

const StatusPicker: React.FC<{ value: LandingItemStatus; onChange: (s: LandingItemStatus) => void }> = ({ value, onChange }) => (
  <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-[11px] font-bold shrink-0">
    {STATUS_OPTIONS.map(({ value: v, label, on, Icon }) => (
      <button
        key={v}
        type="button"
        onClick={() => onChange(v)}
        className={`px-2 py-1 flex items-center gap-1 cursor-pointer transition-colors border-l last:border-l-0 border-slate-200 ${
          value === v ? on : 'bg-white text-slate-600 hover:bg-slate-50'
        }`}
        title={label}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </button>
    ))}
  </div>
);

const IconBtn: React.FC<{ title: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }> = ({
  title,
  onClick,
  disabled,
  danger,
  children,
}) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    disabled={disabled}
    onClick={onClick}
    className={`p-1.5 rounded-lg border border-slate-200 bg-white transition-colors ${
      disabled ? 'opacity-30 cursor-not-allowed' : danger ? 'text-red-600 hover:bg-red-50 cursor-pointer' : 'text-slate-600 hover:bg-slate-100 cursor-pointer'
    }`}
  >
    {children}
  </button>
);

/** Delete that needs a second tap, so a slip of the finger doesn't remove anything. */
const DeleteBtn: React.FC<{ onConfirm: () => void; label?: string }> = ({ onConfirm, label = 'حذف' }) => {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return armed ? (
    <button
      type="button"
      onClick={onConfirm}
      className="px-2 py-1 rounded-lg bg-red-600 text-white text-[11px] font-bold cursor-pointer whitespace-nowrap"
    >
      تأكيد الحذف
    </button>
  ) : (
    <IconBtn title={label} danger onClick={() => setArmed(true)}>
      <Trash2 className="w-4 h-4" />
    </IconBtn>
  );
};

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/**
 * A list where every item can be edited, moved, deleted, and set to
 * shown / coming soon / hidden; plus an «add» button.
 */
function ListEditor<T extends { id: string; status: LandingItemStatus }>({
  items,
  onChange,
  itemName,
  addLabel,
  makeNew,
  renderFields,
  columns = 2,
  compact,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  itemName: string;
  addLabel: string;
  makeNew: () => T;
  renderFields: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  columns?: 1 | 2;
  compact?: boolean;
}) {
  const update = (i: number, patch: Partial<T>) => onChange(items.map((it, n) => (n === i ? { ...it, ...patch } : it)));
  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
          لا يوجد عناصر بعد. أضف أول عنصر من الزر بالأسفل.
        </p>
      )}
      <div className={`grid gap-3 ${columns === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {items.map((item, i) => (
          <div
            key={item.id}
            className={`border rounded-xl ${compact ? 'p-2.5 space-y-2' : 'p-3.5 space-y-2.5'} ${
              item.status === 'hidden' ? 'bg-slate-100 border-slate-200' : item.status === 'soon' ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-500 text-[11px]">
                  {itemName} {i + 1}
                </span>
                <StatusPicker value={item.status} onChange={(s) => update(i, { status: s } as Partial<T>)} />
              </div>
              <div className="flex items-center gap-1">
                <IconBtn title="تحريك لأعلى" disabled={i === 0} onClick={() => onChange(move(items, i, -1))}>
                  <ChevronUp className="w-4 h-4" />
                </IconBtn>
                <IconBtn title="تحريك لأسفل" disabled={i === items.length - 1} onClick={() => onChange(move(items, i, 1))}>
                  <ChevronDown className="w-4 h-4" />
                </IconBtn>
                <DeleteBtn onConfirm={() => onChange(items.filter((_, n) => n !== i))} />
              </div>
            </div>
            <div className={item.status === 'hidden' ? 'opacity-60' : ''}>{renderFields(item, (p) => update(i, p))}</div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...items, makeNew()])}
        className="w-full sm:w-auto bg-blue-50 hover:bg-blue-100 text-blue-700 px-3.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors border border-blue-200"
      >
        <Plus className="w-4 h-4" />
        <span>{addLabel}</span>
      </button>
    </div>
  );
}

const Panel: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }> = ({
  title,
  subtitle,
  children,
  action,
}) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-2xs space-y-5">
    <div className="border-b border-slate-100 pb-3 flex items-start justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <h2 className="font-extrabold text-[#1E3A5F] text-base">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const SectionTitles: React.FC<{
  badge: string;
  title: string;
  subtitle: string;
  onChange: (field: 'sectionBadge' | 'sectionTitle' | 'sectionSubtitle', v: string) => void;
}> = ({ badge, title, subtitle, onChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-b border-slate-100 pb-4">
    <Field label="شارة القسم الصغيرة" value={badge} onChange={(v) => onChange('sectionBadge', v)} />
    <Field label="عنوان القسم" value={title} onChange={(v) => onChange('sectionTitle', v)} bold />
    <Field label="الوصف تحت العنوان" value={subtitle} onChange={(v) => onChange('sectionSubtitle', v)} />
  </div>
);

const LegendNote: React.FC = () => (
  <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 leading-relaxed">
    لكل عنصر ثلاث حالات: <strong className="text-emerald-700">ظاهر</strong> يظهر للزوار عادي،{' '}
    <strong className="text-amber-700">قريباً</strong> يظهر مع شارة «قريباً»، و<strong className="text-slate-700">مخفي</strong> لا يظهر
    للزوار لكنه يبقى محفوظاً هنا لترجعه متى بدك.
  </p>
);

// ---------- the screen ----------

export const LandingPageCMS: React.FC<LandingPageCMSProps> = ({ onNavigate }) => {
  const [config, setConfig] = useState<LandingPageConfig>(() => mergeLanding(null));
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('sections');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [focusCustom, setFocusCustom] = useState<string | null>(null);

  useEffect(() => {
    loadLandingConfig()
      .then(setConfig)
      .finally(() => setLoaded(true));
  }, []);

  // Warn before leaving the page with unsaved edits.
  useEffect(() => {
    if (!isDirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [isDirty]);

  useEffect(() => {
    if (!focusCustom || activeTab !== 'custom') return;
    document.getElementById(`custom-${focusCustom}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setFocusCustom(null);
  }, [focusCustom, activeTab]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  /** Every edit goes through here so «unsaved changes» is always right. */
  const edit = (fn: (prev: LandingPageConfig) => LandingPageConfig) => {
    setConfig(fn);
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await storeLandingConfig(config);
      setIsDirty(false);
      showToast('تم حفظ ونشر الصفحة التعريفية.');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'تعذّر الحفظ.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    // Restores the default content in the editor; nothing is published until «حفظ».
    setConfig(mergeLanding(null));
    setIsDirty(true);
    showToast('استُعيد المحتوى الافتراضي. اضغط «حفظ» لنشره.');
  };

  const setHero = (field: keyof LandingPageConfig['hero'], v: string) => edit((p) => ({ ...p, hero: { ...p.hero, [field]: v } }));

  const setSection = <K extends 'whoIsItFor' | 'curricula' | 'howItWorks' | 'features' | 'faqs' | 'ctaBanner' | 'footer'>(
    key: K,
    patch: Partial<LandingPageConfig[K]>,
  ) => edit((p) => ({ ...p, [key]: { ...p[key], ...patch } }));

  const setCustom = (id: string, patch: Partial<LandingCustomSection>) =>
    edit((p) => ({ ...p, customSections: p.customSections.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));

  const addCustomSection = () => {
    const id = newId('sec');
    edit((p) => ({
      ...p,
      customSections: [
        ...p.customSections,
        {
          id,
          sectionBadge: '',
          sectionTitle: 'قسم جديد',
          sectionSubtitle: '',
          items: [{ id: newId(), status: 'visible', title: 'عنصر جديد', desc: 'اكتب الوصف هنا.' }],
        },
      ],
      sectionOrder: [...p.sectionOrder, CUSTOM_PREFIX + id],
      sectionVisibility: { ...p.sectionVisibility, [CUSTOM_PREFIX + id]: true },
    }));
    setActiveTab('custom');
    setFocusCustom(id);
    showToast('أُضيف قسم جديد في آخر الصفحة. عدّل نصوصه هنا.');
  };

  const deleteCustomSection = (id: string) => {
    const key = CUSTOM_PREFIX + id;
    edit((p) => {
      const vis = { ...p.sectionVisibility };
      delete vis[key];
      return {
        ...p,
        customSections: p.customSections.filter((c) => c.id !== id),
        sectionOrder: p.sectionOrder.filter((k) => k !== key),
        sectionVisibility: vis,
      };
    });
  };

  const toggleSection = (key: string) =>
    edit((p) => ({ ...p, sectionVisibility: { ...p.sectionVisibility, [key]: p.sectionVisibility[key] === false } }));

  const sectionName = (key: string) => {
    if (key.startsWith(CUSTOM_PREFIX)) {
      const sec = config.customSections.find((c) => CUSTOM_PREFIX + c.id === key);
      return sec?.sectionTitle || 'قسم إضافي بدون عنوان';
    }
    return BUILTIN_INFO[key as BuiltinSectionKey]?.label ?? key;
  };

  const newCard = (): LandingAudienceCard => ({
    id: newId('card'),
    status: 'visible',
    title: 'فئة جديدة',
    subtitle: '',
    exampleTitle: 'مثال تطبيقي:',
    exampleText: '',
    features: [],
    buttonText: 'ابدأ الآن ←',
    ribbon: '',
  });

  const tabs: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { id: 'sections', label: 'الأقسام وترتيبها', Icon: Layers },
    { id: 'hero', label: 'الواجهة الرئيسية', Icon: Type },
    { id: 'audience', label: 'لمن دقة؟', Icon: Users },
    { id: 'curricula', label: 'المناهج', Icon: BookOpen },
    { id: 'features', label: 'المزايا', Icon: Sparkles },
    { id: 'howItWorks', label: 'خطوات العمل', Icon: Compass },
    { id: 'faqs', label: 'الأسئلة الشائعة', Icon: HelpCircle },
    { id: 'custom', label: `أقسام إضافية (${config.customSections.length})`, Icon: Plus },
    { id: 'footer', label: 'البانر الختامي والتواصل', Icon: PhoneCall },
  ];

  return (
    <div className="space-y-5 pb-36">
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#1E3A5F] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-blue-300 text-xs font-bold max-w-[90vw]">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>إدارة الصفحة التعريفية</span>
            </span>
            {isDirty && (
              <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                توجد تعديلات غير محفوظة
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#1E3A5F] mt-1">محتوى الصفحة التعريفية للمنصة</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            أضف واحذف وعدّل أي عنصر أو قسم، أو اجعله «قريباً» أو مخفياً. لا يتغيّر شيء للزوار قبل «حفظ ونشر».
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('A1')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-200"
          >
            <Eye className="w-4 h-4 text-blue-600" />
            <span>معاينة الصفحة</span>
          </button>
          <button
            onClick={handleReset}
            className="bg-white hover:bg-red-50 text-slate-600 hover:text-red-700 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-200"
          >
            <RotateCcw className="w-4 h-4" />
            <span>استعادة الافتراضي</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-bold scrollbar-none">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-3 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === id ? 'bg-[#1E3A5F] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {!loaded && <p className="text-xs text-slate-400">جارٍ تحميل المحتوى المحفوظ…</p>}

      {/* Sections: order, show/hide, add/delete */}
      {activeTab === 'sections' && (
        <Panel
          title="أقسام الصفحة وترتيبها"
          subtitle="رتّب الأقسام بالأسهم، أظهر أو أخفِ أي قسم، وأضف أقساماً جديدة خاصة بك."
          action={
            <button
              onClick={addCustomSection}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة قسم جديد</span>
            </button>
          }
        >
          <div className="space-y-2 text-xs">
            <SectionRow
              name="الواجهة الرئيسية (أعلى الصفحة)"
              visible={config.sectionVisibility.hero !== false}
              onToggle={() => toggleSection('hero')}
              onEdit={() => setActiveTab('hero')}
              pinned="دائماً في الأعلى"
            />
            {config.sectionOrder.map((key, i) => {
              const isCustom = key.startsWith(CUSTOM_PREFIX);
              const tab = isCustom ? 'custom' : BUILTIN_INFO[key as BuiltinSectionKey]?.tab;
              return (
                <SectionRow
                  key={key}
                  name={sectionName(key)}
                  tag={isCustom ? 'قسم أضفته' : undefined}
                  visible={config.sectionVisibility[key] !== false}
                  onToggle={() => toggleSection(key)}
                  onEdit={
                    tab
                      ? () => {
                          setActiveTab(tab);
                          if (isCustom) setFocusCustom(key.slice(CUSTOM_PREFIX.length));
                        }
                      : undefined
                  }
                  onUp={i > 0 ? () => edit((p) => ({ ...p, sectionOrder: move(p.sectionOrder, i, -1) })) : undefined}
                  onDown={
                    i < config.sectionOrder.length - 1 ? () => edit((p) => ({ ...p, sectionOrder: move(p.sectionOrder, i, 1) })) : undefined
                  }
                  onDelete={isCustom ? () => deleteCustomSection(key.slice(CUSTOM_PREFIX.length)) : undefined}
                />
              );
            })}
            <SectionRow name="الفوتر وبيانات التواصل (أسفل الصفحة)" visible onEdit={() => setActiveTab('footer')} pinned="دائماً في الأسفل" />
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            الأقسام الأصلية في المنصة يمكن إخفاؤها ونقلها، والأقسام التي تضيفها أنت يمكن حذفها نهائياً. الأقسام المعلّمة بـ{' '}
            <Lock className="inline w-3 h-3" /> محتواها ثابت في التصميم (إخفاء ونقل فقط).
          </p>

          <div className="border-t border-slate-100 pt-4 max-w-xs">
            <Field
              label="نص شارة العناصر القادمة"
              value={config.soonLabel}
              onChange={(v) => edit((p) => ({ ...p, soonLabel: v }))}
              hint="يظهر على كل عنصر حالته «قريباً». مثال: قريباً، تتوفر قريباً"
            />
          </div>
        </Panel>
      )}

      {/* Hero */}
      {activeTab === 'hero' && (
        <Panel title="الواجهة الرئيسية (أعلى الصفحة)" subtitle="العنوان الكبير والأزرار ونموذج الورقة المصححة">
          <div className="space-y-4">
            <Field label="شريط الإعلان الصغير" value={config.hero.announcementBadge} onChange={(v) => setHero('announcementBadge', v)} />
            <Field label="العنوان الرئيسي الكبير" value={config.hero.headline} onChange={(v) => setHero('headline', v)} bold />
            <Field label="الوصف تحت العنوان" value={config.hero.subheadline} onChange={(v) => setHero('subheadline', v)} rows={3} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="نص الزر الأساسي" value={config.hero.primaryCtaText} onChange={(v) => setHero('primaryCtaText', v)} />
              <Field label="نص الزر الثانوي" value={config.hero.secondaryCtaText} onChange={(v) => setHero('secondaryCtaText', v)} />
            </div>
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="font-bold text-slate-900 text-xs">بطاقة نموذج الورقة المصححة</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="عنوان الامتحان" value={config.hero.sampleExamTitle} onChange={(v) => setHero('sampleExamTitle', v)} />
                <Field label="اسم الطالب التجريبي" value={config.hero.sampleStudentName} onChange={(v) => setHero('sampleStudentName', v)} />
                <Field label="الدرجة" value={config.hero.sampleExamScore} onChange={(v) => setHero('sampleExamScore', v)} />
              </div>
              <Field label="ملاحظة المعلم على الورقة" value={config.hero.sampleTeacherNote} onChange={(v) => setHero('sampleTeacherNote', v)} />
            </div>
          </div>
        </Panel>
      )}

      {/* Who is it for */}
      {activeTab === 'audience' && (
        <Panel title="قسم «لمن دقة؟»" subtitle="بطاقات الفئات: أضف بطاقة، احذفها، رتّبها، أو اجعلها «قريباً». ولكل بطاقة نقاطها الخاصة.">
          <SectionTitles
            badge={config.whoIsItFor.sectionBadge}
            title={config.whoIsItFor.sectionTitle}
            subtitle={config.whoIsItFor.sectionSubtitle}
            onChange={(f, v) => setSection('whoIsItFor', { [f]: v })}
          />
          <LegendNote />
          <ListEditor
            items={config.whoIsItFor.cards}
            onChange={(cards) => setSection('whoIsItFor', { cards })}
            itemName="بطاقة"
            addLabel="إضافة بطاقة فئة جديدة"
            makeNew={newCard}
            columns={1}
            renderFields={(c, up) => (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="عنوان البطاقة" value={c.title} onChange={(v) => up({ title: v })} bold />
                  <Field label="الوصف القصير" value={c.subtitle} onChange={(v) => up({ subtitle: v })} />
                  <Field label="عنوان المثال" value={c.exampleTitle} onChange={(v) => up({ exampleTitle: v })} />
                  <Field label="نص زر البطاقة" value={c.buttonText} onChange={(v) => up({ buttonText: v })} />
                </div>
                <Field label="نص المثال التطبيقي" value={c.exampleText} onChange={(v) => up({ exampleText: v })} rows={2} />
                <Field
                  label="شريط صغير على زاوية البطاقة (اختياري)"
                  value={c.ribbon ?? ''}
                  onChange={(v) => up({ ribbon: v })}
                  hint="اتركه فارغاً إذا ما بدك شريط."
                />
                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700">نقاط البطاقة (✓)</span>
                  <ListEditor
                    items={c.features}
                    onChange={(features) => up({ features })}
                    itemName="نقطة"
                    addLabel="إضافة نقطة"
                    makeNew={() => ({ id: newId(), status: 'visible', text: '' })}
                    columns={1}
                    compact
                    renderFields={(f, upF) => <Field label="النص" value={f.text} onChange={(v) => upF({ text: v })} />}
                  />
                </div>
              </div>
            )}
          />
        </Panel>
      )}

      {/* Curricula */}
      {activeTab === 'curricula' && (
        <Panel title="قسم المناهج المدعومة" subtitle="بطاقة «ظاهر» تُعرض بشارة «متاح الآن»، وبطاقة «قريباً» بشارة «قريباً».">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-b border-slate-100 pb-4">
            <Field label="شارة القسم" value={config.curricula.badge} onChange={(v) => setSection('curricula', { badge: v })} />
            <Field label="عنوان القسم" value={config.curricula.title} onChange={(v) => setSection('curricula', { title: v })} bold />
            <div className="md:col-span-2">
              <Field label="وصف القسم" value={config.curricula.description} onChange={(v) => setSection('curricula', { description: v })} rows={2} />
            </div>
          </div>
          <LegendNote />
          <ListEditor
            items={config.curricula.items}
            onChange={(items) => setSection('curricula', { items })}
            itemName="منهاج"
            addLabel="إضافة منهاج"
            makeNew={() => ({ id: newId('cur'), status: 'soon', title: 'منهاج جديد', desc: '' })}
            renderFields={(c, up) => (
              <div className="space-y-2">
                <Field label="اسم المنهاج" value={c.title} onChange={(v) => up({ title: v })} bold />
                <Field label="الوصف" value={c.desc} onChange={(v) => up({ desc: v })} rows={2} />
              </div>
            )}
          />
        </Panel>
      )}

      {/* Features */}
      {activeTab === 'features' && (
        <Panel title="قسم المزايا والقدرات" subtitle="أضف ميزة جديدة، أو اجعل ميزة لم تجهز بعد «قريباً»، أو أخفِها.">
          <SectionTitles
            badge={config.features.sectionBadge}
            title={config.features.sectionTitle}
            subtitle={config.features.sectionSubtitle}
            onChange={(f, v) => setSection('features', { [f]: v })}
          />
          <LegendNote />
          <ListEditor
            items={config.features.items}
            onChange={(items) => setSection('features', { items })}
            itemName="ميزة"
            addLabel="إضافة ميزة"
            makeNew={() => ({ id: newId('feat'), status: 'visible', title: 'ميزة جديدة', desc: '' })}
            renderFields={(f, up) => (
              <div className="space-y-2">
                <Field label="عنوان الميزة" value={f.title} onChange={(v) => up({ title: v })} bold />
                <Field label="الوصف" value={f.desc} onChange={(v) => up({ desc: v })} rows={2} />
              </div>
            )}
          />
        </Panel>
      )}

      {/* How it works */}
      {activeTab === 'howItWorks' && (
        <Panel title="قسم «كيف تعمل»" subtitle="أرقام الخطوات تتحدّث تلقائياً حسب ترتيب الخطوات الظاهرة.">
          <SectionTitles
            badge={config.howItWorks.sectionBadge}
            title={config.howItWorks.sectionTitle}
            subtitle={config.howItWorks.sectionSubtitle}
            onChange={(f, v) => setSection('howItWorks', { [f]: v })}
          />
          <LegendNote />
          <ListEditor
            items={config.howItWorks.steps}
            onChange={(steps) => setSection('howItWorks', { steps })}
            itemName="خطوة"
            addLabel="إضافة خطوة"
            makeNew={() => ({ id: newId('step'), status: 'visible', title: 'خطوة جديدة', desc: '' })}
            renderFields={(s, up) => (
              <div className="space-y-2">
                <Field label="عنوان الخطوة" value={s.title} onChange={(v) => up({ title: v })} bold />
                <Field label="شرح الخطوة" value={s.desc} onChange={(v) => up({ desc: v })} rows={2} />
              </div>
            )}
          />
        </Panel>
      )}

      {/* FAQs */}
      {activeTab === 'faqs' && (
        <Panel title="الأسئلة الشائعة">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-b border-slate-100 pb-4">
            <Field label="عنوان القسم" value={config.faqs.sectionTitle} onChange={(v) => setSection('faqs', { sectionTitle: v })} bold />
            <Field label="الوصف" value={config.faqs.sectionSubtitle} onChange={(v) => setSection('faqs', { sectionSubtitle: v })} />
          </div>
          <LegendNote />
          <ListEditor
            items={config.faqs.items}
            onChange={(items) => setSection('faqs', { items })}
            itemName="سؤال"
            addLabel="إضافة سؤال"
            makeNew={() => ({ id: newId('faq'), status: 'visible', q: 'سؤال جديد؟', a: '' })}
            columns={1}
            renderFields={(f, up) => (
              <div className="space-y-2">
                <Field label="السؤال" value={f.q} onChange={(v) => up({ q: v })} bold />
                <Field label="الإجابة" value={f.a} onChange={(v) => up({ a: v })} rows={3} />
              </div>
            )}
          />
        </Panel>
      )}

      {/* Custom sections */}
      {activeTab === 'custom' && (
        <Panel
          title="أقسام إضافية من تصميمك"
          subtitle="كل قسم: عنوان وبطاقات (عنوان + وصف). مكانه في الصفحة تختاره من تبويب «الأقسام وترتيبها»."
          action={
            <button
              onClick={addCustomSection}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة قسم جديد</span>
            </button>
          }
        >
          {config.customSections.length === 0 && (
            <p className="text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
              ما في أقسام إضافية بعد. اضغط «إضافة قسم جديد».
            </p>
          )}
          <div className="space-y-6">
            {config.customSections.map((sec) => {
              const key = CUSTOM_PREFIX + sec.id;
              const visible = config.sectionVisibility[key] !== false;
              return (
                <div key={sec.id} id={`custom-${sec.id}`} className="border-2 border-blue-100 rounded-2xl p-3 sm:p-4 space-y-4 scroll-mt-24">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-extrabold text-[#1E3A5F] text-sm">{sec.sectionTitle || 'قسم بدون عنوان'}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSection(key)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer border ${
                          visible ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                      >
                        {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{visible ? 'القسم ظاهر' : 'القسم مخفي'}</span>
                      </button>
                      <DeleteBtn onConfirm={() => deleteCustomSection(sec.id)} label="حذف القسم كاملاً" />
                    </div>
                  </div>
                  <SectionTitles
                    badge={sec.sectionBadge}
                    title={sec.sectionTitle}
                    subtitle={sec.sectionSubtitle}
                    onChange={(f, v) => setCustom(sec.id, { [f]: v })}
                  />
                  <ListEditor
                    items={sec.items}
                    onChange={(items) => setCustom(sec.id, { items })}
                    itemName="عنصر"
                    addLabel="إضافة عنصر"
                    makeNew={() => ({ id: newId(), status: 'visible', title: 'عنصر جديد', desc: '' })}
                    renderFields={(it, up) => (
                      <div className="space-y-2">
                        <Field label="العنوان" value={it.title} onChange={(v) => up({ title: v })} bold />
                        <Field label="الوصف" value={it.desc} onChange={(v) => up({ desc: v })} rows={2} />
                      </div>
                    )}
                  />
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* CTA banner & footer */}
      {activeTab === 'footer' && (
        <Panel title="البانر الختامي وبيانات التواصل">
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 sm:p-4 space-y-3">
            <h3 className="font-bold text-[#1E3A5F] text-xs">البانر الختامي (قبل الفوتر)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="العنوان" value={config.ctaBanner.title} onChange={(v) => setSection('ctaBanner', { title: v })} bold />
              <Field label="الوصف" value={config.ctaBanner.subtitle} onChange={(v) => setSection('ctaBanner', { subtitle: v })} />
              <Field label="نص الزر" value={config.ctaBanner.buttonText} onChange={(v) => setSection('ctaBanner', { buttonText: v })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="رقم واتساب الدعم" value={config.footer.whatsappNumber} onChange={(v) => setSection('footer', { whatsappNumber: v })} ltr />
            <Field label="رقم الهاتف" value={config.footer.contactPhone} onChange={(v) => setSection('footer', { contactPhone: v })} ltr />
            <Field label="البريد الإلكتروني" value={config.footer.contactEmail} onChange={(v) => setSection('footer', { contactEmail: v })} ltr />
            <Field label="نص حقوق الملكية" value={config.footer.copyright} onChange={(v) => setSection('footer', { copyright: v })} />
          </div>
        </Panel>
      )}

      {/* Sticky save bar: always reachable on the phone */}
      <div className="fixed bottom-[4.5rem] lg:bottom-0 inset-x-0 z-50 pointer-events-none">
        <div className="max-w-5xl mx-auto px-4 pb-4 flex justify-center">
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={`pointer-events-auto px-6 py-3 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2 transition-all ${
              isDirty ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95' : 'bg-slate-200 text-slate-500 cursor-default'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'جارٍ الحفظ…' : isDirty ? 'حفظ ونشر التعديلات' : 'كل التعديلات محفوظة'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const SectionRow: React.FC<{
  name: string;
  tag?: string;
  visible: boolean;
  pinned?: string;
  onToggle?: () => void;
  onEdit?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onDelete?: () => void;
}> = ({ name, tag, visible, pinned, onToggle, onEdit, onUp, onDown, onDelete }) => (
  <div
    className={`flex items-center justify-between gap-2 flex-wrap border rounded-xl px-3 py-2.5 ${
      visible ? 'bg-white border-slate-200' : 'bg-slate-100 border-slate-200'
    }`}
  >
    <div className="flex items-center gap-2 min-w-0 flex-wrap">
      <span className={`font-bold ${visible ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{name}</span>
      {tag && <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{tag}</span>}
      {!onEdit && !pinned && <Lock className="w-3 h-3 text-slate-400" aria-label="محتوى ثابت" />}
      {pinned && <span className="text-[10px] text-slate-400">{pinned}</span>}
    </div>
    <div className="flex items-center gap-1">
      {onToggle && (
        <button
          onClick={onToggle}
          className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer border ${
            visible ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300'
          }`}
        >
          {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{visible ? 'ظاهر' : 'مخفي'}</span>
        </button>
      )}
      {onEdit && (
        <IconBtn title="تعديل المحتوى" onClick={onEdit}>
          <Pencil className="w-4 h-4" />
        </IconBtn>
      )}
      {!pinned && (
        <>
          <IconBtn title="تحريك لأعلى" disabled={!onUp} onClick={() => onUp?.()}>
            <ChevronUp className="w-4 h-4" />
          </IconBtn>
          <IconBtn title="تحريك لأسفل" disabled={!onDown} onClick={() => onDown?.()}>
            <ChevronDown className="w-4 h-4" />
          </IconBtn>
        </>
      )}
      {onDelete && <DeleteBtn onConfirm={onDelete} label="حذف القسم" />}
    </div>
  </div>
);
