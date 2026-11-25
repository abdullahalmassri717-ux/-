import React, { useState } from 'react';
import { ScreenId, LandingItemStatus } from '../../types';
import {
  CheckCircle2,
  Send,
  Sparkles,
  BarChart3,
  Users,
  Wallet,
  FileText,
  Smartphone,
  ChevronDown,
  ArrowRight,
  Building,
  GraduationCap,
  MessageCircle,
} from 'lucide-react';
import { useLandingConfig } from '../../lib/landing';
import { CUSTOM_PREFIX, shown } from '../../lib/landingConfig';
import { InstallAppSection, INSTALL_SECTION_ID } from '../common/InstallAppSection';

interface LandingPageProps {
  onNavigate: (screen: ScreenId) => void;
  onOpenAI: () => void;
}

/** The amber «قريباً» pill on a coming-soon item. */
const SoonBadge: React.FC<{ label: string; className?: string }> = ({ label, className = '' }) => (
  <span className={`inline-block bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${className}`}>
    {label}
  </span>
);

const soonCls = (s: LandingItemStatus) => (s === 'soon' ? 'opacity-85' : '');

const featureIcons = [CheckCircle2, Send, BarChart3, Wallet, FileText, Sparkles];

// Audience card looks, by position (first three match the original design).
const cardLooks = [
  { icon: GraduationCap, iconBox: 'bg-blue-50 text-blue-700', box: 'border border-slate-200 hover:border-blue-300 shadow-xs hover:shadow-md', example: 'bg-slate-50 border-slate-100', exampleTitle: 'text-slate-700', exampleText: 'text-slate-600', button: 'bg-[#1E3A5F] hover:bg-[#152a45]' },
  { icon: Building, iconBox: 'bg-emerald-50 text-emerald-700', box: 'border-2 border-[#1E3A5F] shadow-md', example: 'bg-emerald-50/60 border-emerald-100', exampleTitle: 'text-emerald-900', exampleText: 'text-emerald-800', button: 'bg-emerald-700 hover:bg-emerald-800' },
  { icon: Users, iconBox: 'bg-purple-50 text-purple-700', box: 'border border-slate-200 hover:border-purple-300 shadow-xs hover:shadow-md', example: 'bg-slate-50 border-slate-100', exampleTitle: 'text-slate-700', exampleText: 'text-slate-600', button: 'bg-[#1E3A5F] hover:bg-[#152a45]' },
];

const gridCols = (n: number) =>
  n <= 1 ? 'grid-cols-1 max-w-md mx-auto' : n === 2 ? 'grid-cols-1 md:grid-cols-2' : n === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [activeSubjectTab, setActiveSubjectTab] = useState<string>('');
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const cfg = useLandingConfig();
  const soon = cfg.soonLabel;
  const isOn = (key: string) => cfg.sectionVisibility[key] !== false;

  const sectionHeader = (badge: string, title: string, subtitle: string) => (
    <div className="text-center space-y-2 mb-10">
      {badge && (
        <div className="inline-block bg-blue-100 text-[#1E3A5F] text-xs font-bold px-3 py-1 rounded-full">{badge}</div>
      )}
      {title && <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E3A5F]">{title}</h2>}
      {subtitle && <p className="text-sm text-slate-600 max-w-2xl mx-auto">{subtitle}</p>}
    </div>
  );

  const renderCards = (items: { id: string; status: LandingItemStatus; title: string; desc: string }[], withIcons: boolean) => {
    const list = shown(items);
    return (
      <div className={`grid gap-6 ${gridCols(list.length)}`}>
        {list.map((feat, idx) => {
          const Icon = featureIcons[idx % featureIcons.length];
          return (
            <div key={feat.id} className={`bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-xs transition-all space-y-3 ${soonCls(feat.status)}`}>
              <div className="flex items-start justify-between gap-2">
                {withIcons ? (
                  <div className="w-10 h-10 rounded-lg bg-[#E8F0F8] text-[#1E3A5F] flex items-center justify-center font-bold">
                    <Icon className="w-5 h-5" />
                  </div>
                ) : <span />}
                {feat.status === 'soon' && <SoonBadge label={soon} />}
              </div>
              <h3 className="font-bold text-slate-900 text-base">{feat.title}</h3>
              {feat.desc && <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{feat.desc}</p>}
            </div>
          );
        })}
      </div>
    );
  };

  const sections: Record<string, () => React.ReactNode> = {
    whoIsItFor: () => {
      const cards = shown(cfg.whoIsItFor.cards);
      if (!cards.length) return null;
      return (
        <section id="who-is-it-for" className="max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-24">
          {sectionHeader(cfg.whoIsItFor.sectionBadge, cfg.whoIsItFor.sectionTitle, cfg.whoIsItFor.sectionSubtitle)}
          <div className={`grid gap-6 ${gridCols(cards.length)}`}>
            {cards.map((c, idx) => {
              const look = cardLooks[idx % cardLooks.length];
              const Icon = look.icon;
              const isSoon = c.status === 'soon';
              return (
                <div key={c.id} className={`bg-white rounded-2xl p-6 transition-all space-y-4 flex flex-col justify-between relative overflow-hidden ${look.box} ${soonCls(c.status)}`}>
                  {c.ribbon && (
                    <div className="absolute top-0 left-0 bg-[#1E3A5F] text-white text-[10px] font-bold px-3 py-1 rounded-br-xl">{c.ribbon}</div>
                  )}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${look.iconBox}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      {isSoon && <SoonBadge label={soon} className={c.ribbon ? 'mt-6' : ''} />}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{c.title}</h3>
                      {c.subtitle && <p className="text-xs text-slate-500 mt-1">{c.subtitle}</p>}
                    </div>
                    {(c.exampleTitle || c.exampleText) && (
                      <div className={`p-3 border rounded-xl text-xs space-y-1 ${look.example}`}>
                        {c.exampleTitle && <span className={`font-bold block ${look.exampleTitle}`}>{c.exampleTitle}</span>}
                        {c.exampleText && <p className={`text-[11px] leading-relaxed ${look.exampleText}`}>{c.exampleText}</p>}
                      </div>
                    )}
                    <ul className="space-y-2 text-xs text-slate-600 pt-1">
                      {shown(c.features).map((f) => (
                        <li key={f.id} className="flex items-center gap-2">
                          <CheckCircle2 className={`w-4 h-4 shrink-0 ${f.status === 'soon' ? 'text-amber-500' : 'text-emerald-600'}`} />
                          <span>{f.text}</span>
                          {f.status === 'soon' && <SoonBadge label={soon} />}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {c.buttonText && (
                    <button
                      onClick={() => !isSoon && onNavigate('A3')}
                      disabled={isSoon}
                      className={`w-full text-white py-2.5 rounded-xl font-bold text-xs transition-colors text-center ${isSoon ? 'bg-slate-400 cursor-not-allowed' : `${look.button} cursor-pointer`}`}
                    >
                      {isSoon ? soon : c.buttonText}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      );
    },

    curricula: () => {
      const items = shown(cfg.curricula.items);
      return (
        <section id="curricula-section" className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                {cfg.curricula.badge && (
                  <span className="text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">{cfg.curricula.badge}</span>
                )}
                <h2 className="text-2xl font-black text-[#1E3A5F] mt-2">{cfg.curricula.title}</h2>
                <p className="text-xs text-slate-600 mt-1 max-w-xl">{cfg.curricula.description}</p>
              </div>
              <button
                onClick={() => onNavigate('A3')}
                className="bg-[#1E3A5F] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer whitespace-nowrap self-start md:self-auto shadow-xs"
              >
                اختر منهجك وابدأ الآن ←
              </button>
            </div>
            {items.length > 0 && (
              <div className={`grid gap-4 text-xs ${items.length >= 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : gridCols(items.length)}`}>
                {items.map((c) => {
                  const isSoon = c.status === 'soon';
                  return (
                    <div key={c.id} className={`rounded-xl p-4 shadow-2xs space-y-2 ${isSoon ? 'bg-white/80 border border-slate-200 opacity-85' : 'bg-white border-2 border-emerald-500'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-bold text-sm ${isSoon ? 'text-slate-800' : 'text-slate-900'}`}>{c.title}</span>
                        {isSoon ? (
                          <SoonBadge label={soon} />
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">متاح الآن</span>
                        )}
                      </div>
                      {c.desc && <p className="text-[11px] text-slate-500">{c.desc}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      );
    },

    features: () =>
      shown(cfg.features.items).length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6">
          {sectionHeader(cfg.features.sectionBadge, cfg.features.sectionTitle, cfg.features.sectionSubtitle)}
          {renderCards(cfg.features.items, true)}
        </section>
      ),

    howItWorks: () => {
      const steps = shown(cfg.howItWorks.steps);
      if (!steps.length) return null;
      return (
        <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-24">
          {sectionHeader(cfg.howItWorks.sectionBadge, cfg.howItWorks.sectionTitle, '')}
          <div className={`grid gap-5 ${gridCols(steps.length)}`}>
            {steps.map((st, idx) => {
              const num = String(idx + 1).padStart(2, '0');
              return (
                <div key={st.id} className={`bg-white border border-slate-200 rounded-xl p-5 relative overflow-hidden group hover:border-[#1E3A5F] transition-colors ${soonCls(st.status)}`}>
                  <div className="text-3xl font-black text-slate-200 group-hover:text-blue-100 transition-colors tabular-nums absolute top-3 left-4">{num}</div>
                  <div className="space-y-2 pr-1 pt-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">خطوة {num}</span>
                      {st.status === 'soon' && <SoonBadge label={soon} />}
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">{st.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{st.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      );
    },

    install: () => <InstallAppSection title={cfg.install.title} subtitle={cfg.install.subtitle} points={shown(cfg.install.points)} soonLabel={soon} />,

    comparison: () => {
      const c = cfg.comparison;
      const tabs = shown(c.subjectTabs);
      const activeTab = tabs.find((t) => t.id === activeSubjectTab)?.id ?? tabs[0]?.id;
      return (
        <section className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#1E3A5F]">{c.title}</h2>
              {c.subtitle && <p className="text-xs text-slate-500">{c.subtitle}</p>}
            </div>

            {tabs.length > 0 && (
              <div className="flex items-center justify-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubjectTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                      activeTab === tab.id ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{tab.text}</span>
                    {tab.status === 'soon' && <SoonBadge label={soon} />}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-slate-200 rounded-xl p-4 bg-[#FFFDF9] space-y-3 min-w-0">
                <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600 border-b border-slate-200 pb-2">
                  <span>{c.beforeTitle}</span>
                  {c.beforeFileName && <span className="text-[11px] text-slate-400 font-mono truncate">{c.beforeFileName}</span>}
                </div>
                <div className="p-4 bg-white border border-dashed border-slate-300 rounded-lg min-h-[220px] font-mono text-xs text-slate-700 space-y-3">
                  {c.beforeStudentLine && <div className="border-b border-slate-100 pb-2">{c.beforeStudentLine}</div>}
                  <div className="leading-relaxed opacity-85 whitespace-pre-line break-words">{c.beforeText}</div>
                  {c.beforeNote && <div className="text-[11px] text-slate-400 italic">{c.beforeNote}</div>}
                </div>
              </div>

              <div className="border border-blue-200 rounded-xl p-4 bg-[#F8FAFC] space-y-3 min-w-0">
                <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#1E3A5F] border-b border-blue-100 pb-2">
                  <span>{c.afterTitle}</span>
                  {c.afterScore && (
                    <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5 rounded font-bold whitespace-nowrap">{c.afterScore}</span>
                  )}
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-lg min-h-[220px] text-xs space-y-3 relative">
                  {(c.criterionLabel || c.criterionStatus) && (
                    <div className="flex justify-between items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
                      <span className="font-bold">{c.criterionLabel}</span>
                      <span className="text-red-600 font-bold">{c.criterionStatus}</span>
                    </div>
                  )}
                  <div className="space-y-1.5 text-[11px]">
                    {shown(c.rows).map((r) => (
                      <div key={r.id} className={`flex items-center justify-between gap-2 ${r.correct ? 'text-emerald-700' : 'text-red-600 font-medium'}`}>
                        <span className="flex items-center gap-1 flex-wrap">
                          <span>
                            {r.correct ? '✓' : '✗'} {r.text}
                          </span>
                          {r.status === 'soon' && <SoonBadge label={soon} />}
                        </span>
                        <span className="font-bold font-mono shrink-0">{r.score}</span>
                      </div>
                    ))}
                  </div>
                  {c.afterNote && (
                    <div className="p-2 bg-red-50 text-red-800 rounded border border-red-200 text-[11px] font-sans">{c.afterNote}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    },

    plans: () => {
      const cards = shown(cfg.plans.cards);
      if (!cards.length) return null;
      const looks = [
        { Icon: GraduationCap, iconBox: 'bg-blue-50 text-[#1E3A5F]', tag: 'text-blue-600', button: 'bg-[#1E3A5F] hover:bg-[#152a45]' },
        { Icon: Building, iconBox: 'bg-emerald-50 text-emerald-700', tag: 'text-emerald-600', button: 'bg-slate-900 hover:bg-black' },
      ];
      return (
        <section className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className={`grid gap-8 ${cards.length === 1 ? 'grid-cols-1 max-w-xl mx-auto' : cards.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {cards.map((card, idx) => {
              const look = looks[idx % looks.length];
              const isSoon = card.status === 'soon';
              return (
                <div key={card.id} className={`bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs ${soonCls(card.status)}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${look.iconBox}`}>
                      <look.Icon className="w-6 h-6" />
                    </div>
                    {isSoon && <SoonBadge label={soon} />}
                  </div>
                  <div>
                    {card.tag && <span className={`text-xs font-bold uppercase tracking-wider ${look.tag}`}>{card.tag}</span>}
                    <h3 className="text-xl font-extrabold text-[#1E3A5F] mt-1">{card.title}</h3>
                  </div>
                  {card.desc && <p className="text-xs text-slate-600">{card.desc}</p>}
                  <ul className="space-y-2.5 text-xs text-slate-700">
                    {shown(card.points).map((pt) => (
                      <li key={pt.id} className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${pt.status === 'soon' ? 'text-amber-500' : 'text-emerald-600'}`} />
                        <span>
                          {pt.title && <strong>{pt.title}</strong>} {pt.desc}
                          {pt.status === 'soon' && <SoonBadge label={soon} className="mr-1" />}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {card.buttonText && (
                    <button
                      onClick={() => !isSoon && onNavigate('A2')}
                      disabled={isSoon}
                      className={`w-full text-white py-2.5 rounded-lg text-xs font-bold transition-colors ${isSoon ? 'bg-slate-400 cursor-not-allowed' : `${look.button} cursor-pointer`}`}
                    >
                      {isSoon ? soon : card.buttonText}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      );
    },

    whatsapp: () => {
      const w = cfg.whatsapp;
      return (
        <section className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-emerald-800 text-white rounded-2xl p-6 sm:p-8 space-y-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-700/60 pb-5">
              <div>
                {w.badge && (
                  <div className="inline-flex items-center gap-1.5 bg-emerald-700/80 text-emerald-200 text-xs px-2.5 py-0.5 rounded-full mb-1">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{w.badge}</span>
                  </div>
                )}
                <h3 className="text-xl font-bold">{w.title}</h3>
              </div>
              {w.buttonText && (
                <button
                  onClick={() => onNavigate('B10')}
                  className="bg-white text-emerald-900 hover:bg-emerald-50 px-4 py-2 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer"
                >
                  {w.buttonText}
                </button>
              )}
            </div>
            <div className="bg-[#EFEAE2] text-slate-800 rounded-xl p-4 max-w-lg mx-auto shadow-inner text-right space-y-2 text-xs">
              <div className="bg-white rounded-lg p-3 shadow-xs space-y-2 border border-slate-200">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 text-[11px] text-slate-500">
                  <span className="font-bold text-[#1E3A5F]">{w.senderName}</span>
                  <span className="tabular-nums">{w.time}</span>
                </div>
                {w.greeting && <p className="font-semibold text-slate-800">{w.greeting}</p>}
                {w.body && <p className="text-slate-600 leading-relaxed text-[11px] whitespace-pre-line">{w.body}</p>}
                {w.attachmentName && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 flex items-center justify-between gap-2 text-[11px]">
                    <span className="break-all">{w.attachmentName}</span>
                    <span className="font-bold text-emerald-700 shrink-0">تحميل</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      );
    },

    testimonials: () => {
      const t = cfg.testimonials;
      const items = shown(t.items);
      if (!items.length) {
        return (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <div className="border border-dashed border-slate-300 rounded-xl p-8 bg-white/50 space-y-2">
              <h3 className="font-bold text-slate-800 text-sm">{t.title}</h3>
              {t.placeholder && <p className="text-xs text-slate-500">{t.placeholder}</p>}
            </div>
          </section>
        );
      }
      return (
        <section className="max-w-6xl mx-auto px-4 sm:px-6">
          {sectionHeader('', t.title, '')}
          <div className={`grid gap-6 ${gridCols(items.length)}`}>
            {items.map((it) => (
              <figure key={it.id} className={`bg-white border border-slate-200 rounded-xl p-5 space-y-3 ${soonCls(it.status)}`}>
                <blockquote className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">«{it.desc}»</blockquote>
                <figcaption className="flex items-center justify-between gap-2 text-xs font-bold text-[#1E3A5F]">
                  <span>{it.title}</span>
                  {it.status === 'soon' && <SoonBadge label={soon} />}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      );
    },

    faqs: () => {
      const faqs = shown(cfg.faqs.items);
      if (!faqs.length) return null;
      const open = openFaq ?? faqs[0].id;
      return (
        <section id="faq-section" className="max-w-4xl mx-auto px-4 sm:px-6 scroll-mt-24 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-extrabold text-[#1E3A5F]">{cfg.faqs.sectionTitle}</h2>
            <p className="text-xs text-slate-500">{cfg.faqs.sectionSubtitle}</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div key={faq.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-colors">
                <button
                  onClick={() => setOpenFaq(open === faq.id ? '' : faq.id)}
                  className="w-full text-right p-4 font-bold text-xs sm:text-sm text-slate-800 hover:text-[#1E3A5F] flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="flex items-center gap-2 flex-wrap">
                    <span>{faq.q}</span>
                    {faq.status === 'soon' && <SoonBadge label={soon} />}
                  </span>
                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform text-slate-400 ${open === faq.id ? 'rotate-180 text-[#1E3A5F]' : ''}`} />
                </button>
                {open === faq.id && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      );
    },

    ctaBanner: () =>
      (cfg.ctaBanner.title || cfg.ctaBanner.buttonText) && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="bg-[#1E3A5F] text-white rounded-2xl p-6 sm:p-10 text-center space-y-4 shadow-lg">
            {cfg.ctaBanner.title && <h2 className="text-xl sm:text-3xl font-black">{cfg.ctaBanner.title}</h2>}
            {cfg.ctaBanner.subtitle && <p className="text-sm text-blue-100 max-w-2xl mx-auto">{cfg.ctaBanner.subtitle}</p>}
            {cfg.ctaBanner.buttonText && (
              <button
                onClick={() => onNavigate('A3')}
                className="bg-white text-[#1E3A5F] hover:bg-blue-50 px-6 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                {cfg.ctaBanner.buttonText}
              </button>
            )}
          </div>
        </section>
      ),
  };

  const renderSection = (key: string): React.ReactNode => {
    if (key.startsWith(CUSTOM_PREFIX)) {
      const sec = cfg.customSections.find((c) => CUSTOM_PREFIX + c.id === key);
      if (!sec || (!sec.sectionTitle && !shown(sec.items).length)) return null;
      return (
        <section className="max-w-6xl mx-auto px-4 sm:px-6">
          {sectionHeader(sec.sectionBadge, sec.sectionTitle, sec.sectionSubtitle)}
          {renderCards(sec.items, false)}
        </section>
      );
    }
    return sections[key]?.() ?? null;
  };

  return (
    <div className="space-y-16 pb-16">
      {isOn('hero') && (
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
              <button
                onClick={() => document.getElementById(INSTALL_SECTION_ID)?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-white hover:bg-slate-50 text-[#1E3A5F] border border-slate-300 px-5 py-3.5 rounded-xl font-semibold text-sm transition-colors cursor-pointer flex items-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                <span>نزّل التطبيق</span>
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
      )}

      {cfg.sectionOrder.filter(isOn).map((key) => (
        <React.Fragment key={key}>{renderSection(key)}</React.Fragment>
      ))}

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
