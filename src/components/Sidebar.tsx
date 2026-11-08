import React from 'react';
import { usePublicSetting } from '../lib/settings';
import { UserRole, ScreenId } from '../types';
import {
  LayoutDashboard,
  Users,
  FileText,
  UploadCloud,
  CheckSquare,
  BarChart3,
  Send,
  Sparkles,
  CreditCard,
  Building2,
  GraduationCap,
  ShieldCheck,
  FileCheck2,
  BrainCircuit,
  Wallet,
  X,
  Phone,
  LayoutTemplate
} from 'lucide-react';

export interface NavItem {
  id: ScreenId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  alertBadge?: string;
  tag?: string;
  highlight?: boolean;
}

import { Entity } from '../types';
import { BookOpen, Target, Headphones } from 'lucide-react';

interface SidebarProps {
  currentRole: UserRole;
  currentScreen: ScreenId;
  activeEntity?: Entity;
  onNavigate: (screen: ScreenId) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const getRoleNavItems = (currentRole: UserRole, activeEntity?: Entity): NavItem[] => {
  if (currentRole === 'teacher') {
    const isSchoolTeacher = activeEntity?.type === 'school' && activeEntity.role === 'teacher';

    const items: NavItem[] = [
      { id: 'B1' as ScreenId, label: 'لوحة المتابعة الرئيسية', icon: LayoutDashboard },
      { id: 'B2' as ScreenId, label: 'الطلاب والمجموعات', icon: Users },
      { id: 'B14' as ScreenId, label: 'وين وصلنا في المنهاج', icon: BookOpen, badge: 'جديد' },
      { id: 'B15' as ScreenId, label: 'تشخيص طلابي (افهم طلابك)', icon: Target, badge: 'تحليل ذكي', highlight: true },
      { id: 'B4' as ScreenId, label: 'الامتحانات والواجبات', icon: FileText },
      { id: 'B7' as ScreenId, label: 'رفع وتصوير الأوراق', icon: UploadCloud },
      { id: 'B8' as ScreenId, label: 'مراجعة التصحيح', icon: CheckSquare },
      { id: 'B9' as ScreenId, label: 'نتائج الامتحان والتحليل', icon: BarChart3 },
      { id: 'B10' as ScreenId, label: 'تقارير واتساب للأهالي', icon: Send },
      { id: 'B12' as ScreenId, label: 'معاينة الورقة المصححة', icon: FileCheck2 },
      { id: 'C_HUB' as ScreenId, label: 'أدوات الذكاء الاصطناعي', icon: Sparkles },
    ];

    // معلمو المدرسة لا يرون إطلاقاً الاشتراك والفواتير (لا في القائمة ولا في أي مكان)
    if (!isSchoolTeacher) {
      items.push({
        id: 'B11' as ScreenId,
        label: 'رسوم الطلاب والمالية',
        icon: Wallet,
      });
    }

    // الدعم الفني للمعلم
    items.push({
      id: 'SUPPORT' as ScreenId,
      label: 'الدعم الفني والمساعدة',
      icon: Headphones,
    });

    return items;
  }

  if (currentRole === 'school_principal' || currentRole === 'school_admin') {
    return [
      { id: 'D1' as ScreenId, label: 'لوحة إدارة المدرسة', icon: Building2 },
      { id: 'D2' as ScreenId, label: 'المعلمون والصفوف', icon: GraduationCap },
      { id: 'D3' as ScreenId, label: 'تقرير المدرسة', icon: BarChart3 },
      { id: 'D4' as ScreenId, label: 'مقارنة المعلمين والصفوف', icon: Users },
      { id: 'B8' as ScreenId, label: 'مراقبة جودة التصحيح', icon: CheckSquare },
      { id: 'B11' as ScreenId, label: 'عقد واشتراك المدرسة', icon: Wallet },
      { id: 'SUPPORT' as ScreenId, label: 'الدعم الفني للمدرسة', icon: Headphones },
    ];
  }

  if (currentRole === 'platform_admin') {
    return [
      { id: 'E1' as ScreenId, label: 'لوحة الإشراف العام', icon: ShieldCheck },
      { id: 'E6' as ScreenId, label: 'إعدادات الصفحة التعريفية (CMS)', icon: LayoutTemplate, badge: 'تحكم' },
      { id: 'E2' as ScreenId, label: 'العملاء والفواتير والتحويلات', icon: CreditCard },
      { id: 'E3' as ScreenId, label: 'جودة التصحيح وتكلفة AI', icon: BrainCircuit },
      { id: 'E4' as ScreenId, label: 'إدارة المناهج والكتب', icon: BookOpen, badge: 'جديد' },
      { id: 'E5' as ScreenId, label: 'إدارة الدعم الفني والتذاكر', icon: Headphones },
    ];
  }

  return [];
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  currentScreen,
  activeEntity,
  onNavigate,
  isMobileOpen = false,
  onMobileClose,
}) => {
  const supportPhone = usePublicSetting<{ whatsapp?: string }>('support', { whatsapp: '+970599123456' }).whatsapp;
  // If visitor or student, no persistent sidebar needed
  if (currentRole === 'visitor' || currentRole === 'student') {
    return null;
  }

  const navItems = getRoleNavItems(currentRole, activeEntity);

  const getRoleTitle = () => {
    if (currentRole === 'teacher') {
      return activeEntity ? activeEntity.name : 'قائمة المعلم';
    }
    if (currentRole === 'school_principal') return 'إدارة المدرسة (مدرسة الأمل الخاصة)';
    if (currentRole === 'platform_admin') return 'إدارة منصة دقة العامة';
    return '';
  };

  const renderNavList = () => (
    <div className="p-4 flex-1 space-y-1 overflow-y-auto">
      <div className="text-[11px] font-bold text-slate-400 px-3 py-1 mb-2 tracking-wider uppercase">
        {getRoleTitle()}
      </div>

      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentScreen === item.id || (item.id === 'C_HUB' && currentScreen.startsWith('C'));

        return (
          <button
            key={item.id}
            onClick={() => {
              onNavigate(item.id);
              if (onMobileClose) onMobileClose();
            }}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all text-right cursor-pointer ${
              isActive
                ? 'bg-[#1E3A5F] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Icon className={`w-4 h-4 shrink-0 ${
                isActive ? 'text-emerald-400' : item.highlight ? 'text-blue-500' : 'text-slate-400'
              }`} />
              <span className="truncate">{item.label}</span>
            </div>

            {item.badge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums shrink-0 ${
                isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                {item.badge}
              </span>
            )}

            {item.alertBadge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
              }`}>
                {item.alertBadge}
              </span>
            )}

            {item.tag && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal shrink-0 ${
                isActive ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-700'
              }`}>
                {item.tag}
              </span>
            )}
          </button>
        );
      })}

      {/* Support note */}
      <div className="mt-6 p-3 bg-[#F7F8FA] border border-slate-200 rounded-xl text-xs space-y-1.5">
        <div className="font-bold text-slate-800">الدعم الفني</div>
        <p className="text-[11px] text-slate-500 leading-relaxed">افتح تذكرة من «الدعم الفني» أو راسلنا على واتساب.</p>
        {supportPhone && (
          <div className="pt-1 text-[11px] font-mono text-[#1E3A5F] font-bold flex items-center gap-1.5" dir="ltr">
            <Phone className="w-3 h-3 text-emerald-600" />
            <span>{supportPhone}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside className="w-64 bg-white border-l border-slate-200 hidden lg:flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
        {renderNavList()}
      </aside>

      {/* 2. Mobile Full Drawer (Visible when user taps hamburger menu on mobile) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
          />

          {/* Drawer Content */}
          <div className="relative mr-auto w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <img src="/dequa-logo.png" alt="دقة" className="h-8 w-auto object-contain" />
              </div>
              <button
                onClick={onMobileClose}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nav list */}
            {renderNavList()}
          </div>
        </div>
      )}
    </>
  );
};
