// The public intro page (A1) is data the platform admin edits in E6. This file holds
// the default content and `mergeLanding`, which turns whatever is saved (including
// configs saved before items had ids and statuses) into a complete, current config.
// It has no browser or Supabase imports so unit tests can load it.
import type {
  LandingAudienceCard,
  LandingBullet,
  LandingCurriculumCard,
  LandingCustomSection,
  LandingFaqItem,
  LandingFeatureItem,
  LandingHowItWorksStep,
  LandingItemStatus,
  LandingPageConfig,
} from '../types';

/** Sections between the hero and the footer, in their default order. */
export const BUILTIN_SECTIONS = [
  'whoIsItFor',
  'curricula',
  'features',
  'howItWorks',
  'install',
  'comparison',
  'plans',
  'whatsapp',
  'testimonials',
  'faqs',
  'ctaBanner',
] as const;
export type BuiltinSectionKey = (typeof BUILTIN_SECTIONS)[number];

export const CUSTOM_PREFIX = 'custom:';

export function newId(prefix = 'i'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const STATUSES: LandingItemStatus[] = ['visible', 'soon', 'hidden'];

export const DEFAULT_LANDING_CONFIG: LandingPageConfig = {
  hero: {
    announcementBadge: 'المنصة التعليمية العامة لكل مدرّس ومدرسة ومركز تعليمي · لأي صف وأي مادة',
    headline: 'صحّح واجبات وامتحانات طلابك في دقائق',
    subheadline:
      'منظومة تصحيح وتقييم ذكية مصممة لكافة المراحل الدراسية والمناهج. تصحيح فوري لخط اليد، رصد دقيق للفاقد التعليمي، ومتابعة درجات الطلاب مع إرسال تقارير واتساب احترافية للأهالي بنقرة واحدة.',
    primaryCtaText: 'ابدأ الآن مجاناً',
    secondaryCtaText: 'لمن دِقّـة؟',
    sampleExamTitle: 'امتحان الرياضيات - سؤال 1 (الاشتقاق الضمني)',
    sampleStudentName: 'أحمد محمود المصري',
    sampleExamScore: '20 / 20',
    sampleTeacherNote: 'تطبيق متقن لمعايير الاشتقاق والتعويض الدقيق',
  },
  whoIsItFor: {
    sectionBadge: 'الفئات المستهدفة والشراكات',
    sectionTitle: 'لمن صُممت منصة دِقّـة؟',
    sectionSubtitle: 'دقة منصة مرنة مصممة لتخدم ثلاثة مستويات تعليمية بأعلى كفاءة',
    cards: [
      {
        id: 'tutor',
        status: 'visible',
        title: 'المدرّس الخصوصي والمستقل',
        subtitle: 'للمعلمين أصحاب المجموعات الخاصة والدورات ودروس التقوية.',
        exampleTitle: 'مثال تطبيقي:',
        exampleText:
          'مدرّسو الثانوية العامة (التوجيهي) الذين يصححون أسبوعياً مئات الأوراق ويحتاجون متابعة دقيقة لدرجات كل طالب وتحصيل رسوم الجلسات الشهرية.',
        features: [
          { id: 'tutor_1', status: 'visible', text: 'مجموعات وصفوف غير محدودة' },
          { id: 'tutor_2', status: 'visible', text: 'فوترة مرنة: تدفع فقط عن الطلاب النشطين' },
          { id: 'tutor_3', status: 'visible', text: 'إرسال تقارير واتساب فردية للأهالي' },
        ],
        buttonText: 'ابدأ كمعلم مستقل ←',
      },
      {
        id: 'school',
        status: 'visible',
        ribbon: 'حل مؤسسي متكامل',
        title: 'المدرسة (الخاصة والحكومية)',
        subtitle: 'لإدارات المدارس والمشرفين التربويين ورؤساء الأقسام لمراقبة الجودة.',
        exampleTitle: 'مثال تطبيقي:',
        exampleText:
          'المدارس الخاصة للمرحلة الأساسية (الصفوف 1 - 9) لمتابعة الفاقد التعليمي واختبارات الشعب في كافة المواد، وجدول حراري يكشف أضعف المهارات فوراً.',
        features: [
          { id: 'school_1', status: 'visible', text: 'إدارة طاقم المعلمين وربط الشعب الدراسية' },
          { id: 'school_2', status: 'visible', text: 'اشتراك سنوي لكل طالب' },
          { id: 'school_3', status: 'visible', text: 'الأوراق والتقارير تحمل اسم المدرسة وشعارها «بدعم دقة»' },
        ],
        buttonText: 'سجّل مدرستك واحجز مكالمة تجهيز ←',
      },
      {
        id: 'center',
        status: 'visible',
        title: 'المركز التعليمي والمعهد',
        subtitle: 'للمعاهد الأكاديمية والمراكز الثقافية التي تضم معلمين متعددين ومئات الطلاب.',
        exampleTitle: 'مثال تطبيقي:',
        exampleText:
          'مراكز التقوية والدورات المسائية للمناهج المتنوعة مع فرز الطلاب حسب المستويات وشعب المواد المختلفة.',
        features: [
          { id: 'center_1', status: 'visible', text: 'لوحة تحكم موحدة لإدارة الشعب والمعلمين' },
          { id: 'center_2', status: 'visible', text: 'صلاحيات منفصلة للإدارة والمعلمين' },
          { id: 'center_3', status: 'visible', text: 'توليد تقارير أداء مركزية مطبوعة ورقمية' },
        ],
        buttonText: 'ابدأ لمركزك التعليمي ←',
      },
    ],
  },
  curricula: {
    badge: 'المناهج والصفوف الدراسية',
    title: 'نظام عالمي يتكيف مع أي منهاج ومبحث',
    description:
      '«دقة» منصة عامة ومفتوحة لكافة المناهج الدراسية العربية والدولية، مع توفير كامل لمفردات ومخرجات التعلم.',
    palestineNotice: 'المنهاج الفلسطيني متاح بالكامل الآن (الصفوف 1 - 12 لكافة المواد العلمية والأدبية).',
    upcomingNotice: 'مناهج أخرى قادمة قريباً: المنهاج الأردني، السعودي، والمصري.',
    items: [
      { id: 'cur_ps', status: 'visible', title: '🇵🇸 المنهاج الفلسطيني', desc: 'الصفوف 1 - 12 (الأساسي والثانوي والتوجيهي) لكافة المواد العلمية والأدبية.' },
      { id: 'cur_jo', status: 'soon', title: '🇯🇴 المنهاج الأردني', desc: 'مرحلة التوجيهي والمرحلة الأساسية - قيد المراجعة وإدخال بنوك الأسئلة.' },
      { id: 'cur_sa', status: 'soon', title: '🇸🇦 المنهاج السعودي', desc: 'نظام المسارات والمرحلة المتوسطة والابتدائية.' },
      { id: 'cur_eg', status: 'soon', title: '🇪🇬 المنهاج المصري', desc: 'الثانوية العامة ونظام التعليم الجديد والمرحلة الإعدادية.' },
    ],
  },
  howItWorks: {
    sectionBadge: 'آلية العمل البسيطة',
    sectionTitle: 'كيف تعمل «دقة» في دقائق؟',
    sectionSubtitle: 'دورة عمل متكاملة تبدأ من وضع الامتحان وحتى عودة الورقة المصححة ليد الطالب',
    steps: [
      { id: 'step_1', status: 'visible', title: 'أنشئ الواجب أو الامتحان', desc: 'حدد المادة ومعايير توزيع الدرجات (قانون، تعويض، ناتج) أو ارفع نموذج الامتحان.' },
      { id: 'step_2', status: 'visible', title: 'تسليم الأوراق بسهولة', desc: 'يرفع الطلاب صور حلولهم برابط واتساب مباشر بدون تسجيل، أو يصورها المعلم بكاميرا الهاتف.' },
      { id: 'step_3', status: 'visible', title: 'تصحيح ذكي مع ملاحظات', desc: 'يقرأ الذكاء الاصطناعي الخطوات اليدوية ويضع علامات ✓ و ✗ وملاحظات توجيهية.' },
      { id: 'step_4', status: 'visible', title: 'أوراق مصححة تعود للطالب', desc: 'ترجع الورقة الأصلية محبرة بالقلم الأحمر والدرجة المستحقة مع نقاط التطوير.' },
      { id: 'step_5', status: 'visible', title: 'إرسال تقارير واتساب', desc: 'تقارير فورية لولي الأمر والمدرسة بضغطة زر مع رسالة صوتية مقروءة.' },
      { id: 'step_6', status: 'visible', title: 'اسأل مساعدك الذكي', desc: 'حلل أداء الطلاب وولد تمارين علاجية فورية لمن أخفق في أي مفهوم.' },
    ],
  },
  features: {
    sectionBadge: 'قدرات المنصة',
    sectionTitle: 'كل ما تحتاجه لإدارة التقييمات',
    sectionSubtitle: 'أدوات صممت خصيصاً لتوفير 80% من وقت تصحيح الأوراق الورقية وتجهيز الاختبارات',
    items: [
      { id: 'feat_1', status: 'visible', title: 'تصحيح فوري فائق الدقة', desc: 'يصحح الخطوات والمعادلات والقوانين والناتج النهائي بدقة تنافس لجان التوجيهي.' },
      { id: 'feat_2', status: 'visible', title: 'تقارير واتساب تلقائية', desc: 'تصل تقارير مفصلة لكل طالب وولي أمر ومدرسة فور اعتماد المعلم للدرجات.' },
      { id: 'feat_3', status: 'visible', title: 'لوحات أداء ومتابعة', desc: 'تحليل دقيق لأضعف 3 دروس في كل مجموعة ونسب إتقان المهارات والفاقد التعليمي.' },
      { id: 'feat_4', status: 'visible', title: 'متابعة رسوم الطلاب', desc: 'سجّل من دفع ومن تأخر، وأصدر سندات القبض، واعرف نسبة التحصيل الشهرية في مكان واحد.' },
      { id: 'feat_5', status: 'visible', title: 'إنشاء واجبات وامتحانات', desc: 'أنشئ امتحاناتك بنماذج وزارية متعددة ومعايير تفصيلية أو ولّدها بالذكاء الاصطناعي.' },
      { id: 'feat_6', status: 'visible', title: 'مساعد ذكي خاص بمعلمك', desc: 'اطرح أي سؤال صوتياً أو نصياً ليرفع الدرجات، يعطيك إحصائيات، أو يقترح تدريبات.' },
    ],
  },
  faqs: {
    sectionBadge: 'الأسئلة الشائعة',
    sectionTitle: 'كل ما تود معرفته عن منصة دِقّـة',
    sectionSubtitle: 'إجابات على أكثر الأسئلة شيوعاً من المعلمين ومديري المدارس',
    items: [
      {
        id: 'faq_1',
        status: 'visible',
        q: 'هل تصحيح الذكاء الاصطناعي دقيق ومعتمد لمناهج التوجيهي؟',
        a: '«دقة» يصحّح حسب معايير توزيع العلامات التي يضعها المدرّس لكل سؤال (مثل: علامتان للقانون، علامة للتعويض، علامة للناتج). وأي إجابة منخفضة الثقة تذهب لمراجعة المدرّس، ولا تصل أي درجة للطالب أو ولي الأمر قبل اعتماد المدرّس.',
      },
      {
        id: 'faq_2',
        status: 'visible',
        q: 'هل أحتاج إلى إنترنت قوي وسريع لاستخدام المنصة؟',
        a: 'إطلاقاً! المنصة مصممة خصيصاً لظروف قطاع غزة وفلسطين. الصفحات خفيفة للغاية، وعند رفع الأوراق أو تسليمها تعمل ميزة الحفظ المحلي؛ وفي حال انقطاع الإنترنت تُحفظ الأوراق وترفع تلقائياً فور عودة الاتصال.',
      },
      {
        id: 'faq_3',
        status: 'visible',
        q: 'هل يحتاج الطالب إلى تحميل تطبيق أو فتح حساب؟',
        a: 'كلا، الطالب لا يحتاج أي حساب أو كلمة مرور أو ربط بجوجل كلاسروم. يصله رابط تسليم مباشر في مجموعة واتساب، يكتب رمزه الخاص المكوّن من 4 أرقام ويلتقط صورة ورقته ويرسلها.',
      },
      {
        id: 'faq_4',
        status: 'visible',
        q: 'ما هي المواد التي تدعمها منصة دقة حالياً؟',
        a: 'تدعم المنصة حالياً المواد العلمية والأدبية الأهم: الرياضيات (العلمي والأدبي والصناعي)، الفيزياء، الكيمياء، واللغة الإنجليزية (بما فيها تصحيح مواضيع التعبير Writing وتصنيف الأخطاء لقواعد وإملاء ومفردات).',
      },
    ],
  },
  ctaBanner: {
    title: 'جاهز لتوفير 15 ساعة تصحيح أسبوعياً؟',
    subtitle: 'انضم لمئات المعلمين والمدارس الذين وثقوا بـ «دقة» لتصحيح امتحاناتهم',
    buttonText: 'ابدأ تجربتك المجانية الآن ←',
  },
  footer: {
    copyright: '© 2026 منصة دقة (DEQUA). جميع الحقوق محفوظة.',
    contactPhone: '+970 599 123 456',
    contactEmail: 'support@dequa.edu.ps',
    whatsappNumber: '+970 599 123 456',
  },
  customSections: [],
  sectionOrder: [...BUILTIN_SECTIONS],
  sectionVisibility: Object.fromEntries([['hero', true], ...BUILTIN_SECTIONS.map((k) => [k, true])]),
  soonLabel: 'قريباً',
};

// ---- normalising saved data ----

type Loose = Record<string, unknown>;
const obj = (v: unknown): Loose => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Loose) : {});
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const status = (v: unknown, fallback: LandingItemStatus = 'visible'): LandingItemStatus =>
  STATUSES.includes(v as LandingItemStatus) ? (v as LandingItemStatus) : fallback;

/** Gives every item a unique id (keeping saved ones), so edits and React keys stay stable. */
function withIds<T extends { id: string }>(items: T[], prefix: string): T[] {
  const seen = new Set<string>();
  return items.map((it, i) => {
    let id = it.id && !seen.has(it.id) ? it.id : `${prefix}_${i + 1}`;
    while (seen.has(id)) id = `${id}x`;
    seen.add(id);
    return { ...it, id };
  });
}

/** A saved list, or the default list when nothing (valid) was saved. */
function list<T extends { id: string }>(saved: unknown, fallback: T[], map: (v: Loose, i: number) => T, prefix: string): T[] {
  if (!Array.isArray(saved)) return fallback.map((x) => ({ ...x }));
  return withIds(saved.map((v, i) => map(obj(v), i)), prefix);
}

function bullets(saved: unknown, fallback: LandingBullet[], prefix: string): LandingBullet[] {
  if (!Array.isArray(saved)) return fallback.map((x) => ({ ...x }));
  return withIds(
    saved.map((v) =>
      typeof v === 'string'
        ? { id: '', text: v, status: 'visible' as const }
        : { id: str(obj(v).id), text: str(obj(v).text), status: status(obj(v).status) },
    ),
    prefix,
  );
}

function card(v: Loose, base: LandingAudienceCard | undefined, id: string): LandingAudienceCard {
  const b = base ?? {
    id, status: 'visible' as const, title: '', subtitle: '', exampleTitle: '', exampleText: '', features: [], buttonText: '',
  };
  return {
    id: str(v.id, id) || id,
    status: status(v.status, b.status),
    title: str(v.title, b.title),
    subtitle: str(v.subtitle, b.subtitle),
    exampleTitle: str(v.exampleTitle, b.exampleTitle),
    exampleText: str(v.exampleText, b.exampleText),
    features: bullets(v.features, b.features, `${id}_f`),
    buttonText: str(v.buttonText, b.buttonText),
    ribbon: str(v.ribbon, b.ribbon ?? ''),
  };
}

function audienceCards(w: Loose): LandingAudienceCard[] {
  const defaults = DEFAULT_LANDING_CONFIG.whoIsItFor.cards;
  if (Array.isArray(w.cards)) {
    return withIds(
      w.cards.map((c, i) => {
        const o = obj(c);
        const id = str(o.id) || `card_${i + 1}`;
        return card(o, defaults.find((d) => d.id === id), id);
      }),
      'card',
    );
  }
  // Configs saved before cards were a list had three fixed keys.
  return defaults.map((d) => card(obj(w[d.id]), d, d.id));
}

function textItem(v: Loose, prefix: string, i: number): LandingFeatureItem {
  return { id: str(v.id) || `${prefix}_${i + 1}`, status: status(v.status), title: str(v.title), desc: str(v.desc) };
}

export function mergeLanding(saved: unknown): LandingPageConfig {
  const d = DEFAULT_LANDING_CONFIG;
  const s = obj(saved);
  const who = obj(s.whoIsItFor);
  const cur = obj(s.curricula);
  const how = obj(s.howItWorks);
  const feat = obj(s.features);
  const faq = obj(s.faqs);

  const customSections: LandingCustomSection[] = withIds(
    (Array.isArray(s.customSections) ? s.customSections : []).map((v, i) => {
      const o = obj(v);
      return {
        id: str(o.id) || `sec_${i + 1}`,
        sectionBadge: str(o.sectionBadge),
        sectionTitle: str(o.sectionTitle),
        sectionSubtitle: str(o.sectionSubtitle),
        items: list<LandingFeatureItem>(o.items, [], (x, j) => textItem(x, 'ci', j), `${str(o.id) || `sec_${i + 1}`}_i`),
      };
    }),
    'sec',
  );

  // Order: saved keys that still exist, then any section missing from it.
  const known = [...BUILTIN_SECTIONS, ...customSections.map((c) => CUSTOM_PREFIX + c.id)] as string[];
  const savedOrder = Array.isArray(s.sectionOrder) ? s.sectionOrder.filter((k): k is string => typeof k === 'string') : [];
  const sectionOrder = [...new Set(savedOrder.filter((k) => known.includes(k)))];
  for (const k of known) {
    if (sectionOrder.includes(k)) continue;
    // A built-in section new to this saved config goes back next to its default neighbour.
    const di = (BUILTIN_SECTIONS as readonly string[]).indexOf(k);
    const before = di > 0 ? sectionOrder.indexOf(BUILTIN_SECTIONS[di - 1]) : -1;
    if (di >= 0 && (before >= 0 || di === 0)) sectionOrder.splice(before + 1, 0, k);
    else sectionOrder.push(k);
  }

  const savedVis = obj(s.sectionVisibility);
  const sectionVisibility: Record<string, boolean> = { hero: true };
  for (const k of ['hero', ...known]) sectionVisibility[k] = typeof savedVis[k] === 'boolean' ? (savedVis[k] as boolean) : true;

  return {
    hero: { ...d.hero, ...(obj(s.hero) as Partial<LandingPageConfig['hero']>) },
    whoIsItFor: {
      sectionBadge: str(who.sectionBadge, d.whoIsItFor.sectionBadge),
      sectionTitle: str(who.sectionTitle, d.whoIsItFor.sectionTitle),
      sectionSubtitle: str(who.sectionSubtitle, d.whoIsItFor.sectionSubtitle),
      cards: audienceCards(who),
    },
    curricula: {
      badge: str(cur.badge, d.curricula.badge),
      title: str(cur.title, d.curricula.title),
      description: str(cur.description, d.curricula.description),
      palestineNotice: str(cur.palestineNotice, d.curricula.palestineNotice),
      upcomingNotice: str(cur.upcomingNotice, d.curricula.upcomingNotice),
      items: list<LandingCurriculumCard>(cur.items, d.curricula.items, (x, i) => textItem(x, 'cur', i), 'cur'),
    },
    howItWorks: {
      sectionBadge: str(how.sectionBadge, d.howItWorks.sectionBadge),
      sectionTitle: str(how.sectionTitle, d.howItWorks.sectionTitle),
      sectionSubtitle: str(how.sectionSubtitle, d.howItWorks.sectionSubtitle),
      steps: list<LandingHowItWorksStep>(how.steps, d.howItWorks.steps, (x, i) => textItem(x, 'step', i), 'step'),
    },
    features: {
      sectionBadge: str(feat.sectionBadge, d.features.sectionBadge),
      sectionTitle: str(feat.sectionTitle, d.features.sectionTitle),
      sectionSubtitle: str(feat.sectionSubtitle, d.features.sectionSubtitle),
      items: list<LandingFeatureItem>(feat.items, d.features.items, (x, i) => textItem(x, 'feat', i), 'feat'),
    },
    faqs: {
      sectionBadge: str(faq.sectionBadge, d.faqs.sectionBadge),
      sectionTitle: str(faq.sectionTitle, d.faqs.sectionTitle),
      sectionSubtitle: str(faq.sectionSubtitle, d.faqs.sectionSubtitle),
      items: list<LandingFaqItem>(
        faq.items,
        d.faqs.items,
        (x, i) => ({ id: str(x.id) || `faq_${i + 1}`, status: status(x.status), q: str(x.q), a: str(x.a) }),
        'faq',
      ),
    },
    ctaBanner: { ...d.ctaBanner, ...(obj(s.ctaBanner) as Partial<LandingPageConfig['ctaBanner']>) },
    footer: { ...d.footer, ...(obj(s.footer) as Partial<LandingPageConfig['footer']>) },
    customSections,
    sectionOrder,
    sectionVisibility,
    soonLabel: str(s.soonLabel) || d.soonLabel,
  };
}

/** Items the public page shows (hidden ones dropped). */
export function shown<T extends { status: LandingItemStatus }>(items: T[]): T[] {
  return items.filter((i) => i.status !== 'hidden');
}
