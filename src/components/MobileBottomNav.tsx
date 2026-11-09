import React from 'react';
import { UserRole, ScreenId } from '../types';
import {
  LayoutDashboard,
  Users,
  UploadCloud,
  CheckSquare,
  Sparkles,
  Building2,
  GraduationCap,
  Menu,
  ShieldCheck,
  CreditCard
} from 'lucide-react';

interface MobileBottomNavProps {
  currentRole: UserRole;
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onOpenAI: () => void;
  onOpenDrawer?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentRole,
  currentScreen,
  onNavigate,
  onOpenAI,
  onOpenDrawer,
}) => {
  // If visitor or student, no persistent bottom bar needed
  if (currentRole === 'visitor' || currentRole === 'student') {
    return null;
  }

  interface TabDef {
    id?: ScreenId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    primary?: boolean;
    badge?: string;
    isMenuToggle?: boolean;
  }

  const getTabs = (): TabDef[] => {
    if (currentRole === 'teacher') {
      return [
        { id: 'B1' as ScreenId, label: 'الرئيسية', icon: LayoutDashboard },
        { id: 'B2' as ScreenId, label: 'الطلاب', icon: Users },
        { id: 'B7' as ScreenId, label: 'رفع أوراق', icon: UploadCloud, primary: true },
        { id: 'B8' as ScreenId, label: 'التصحيح', icon: CheckSquare },
        { label: 'القائمة', icon: Menu, isMenuToggle: true },
      ];
    }

    if (currentRole === 'school_principal' || currentRole === 'school_admin') {
      return [
        { id: 'D1' as ScreenId, label: 'لوحة المدرسة', icon: Building2 },
        { id: 'D2' as ScreenId, label: 'المعلمون', icon: GraduationCap },
        { id: 'D3' as ScreenId, label: 'التقرير', icon: CheckSquare },
        { label: 'القائمة', icon: Menu, isMenuToggle: true },
      ];
    }

    return [
      { id: 'E1' as ScreenId, label: 'الإشراف', icon: ShieldCheck },
      { id: 'E2' as ScreenId, label: 'العملاء والخطط', icon: CreditCard },
      { label: 'القائمة', icon: Menu, isMenuToggle: true },
    ];
  };

  const tabs = getTabs();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 px-2 py-1 shadow-lg">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = tab.id && currentScreen === tab.id;

          if (tab.primary && tab.id) {
            return (
              <button
                key={idx}
                onClick={() => onNavigate(tab.id!)}
                className="flex flex-col items-center justify-center -mt-5 bg-[#1E3A5F] hover:bg-[#152a45] text-white w-12 h-12 rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer border-4 border-white"
                title={tab.label}
              >
                <Icon className="w-5 h-5 text-emerald-400" />
              </button>
            );
          }

          if (tab.isMenuToggle) {
            return (
              <button
                key={idx}
                onClick={onOpenDrawer}
                className="flex flex-col items-center justify-center py-1.5 px-3 rounded-lg text-slate-600 hover:text-[#1E3A5F] cursor-pointer transition-colors"
                title="فتح كامل السايد بار"
              >
                <Icon className="w-5 h-5 text-slate-700" />
                <span className="text-[10px] font-bold mt-0.5">{tab.label}</span>
              </button>
            );
          }

          return (
            <button
              key={idx}
              onClick={() => tab.id && onNavigate(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-lg relative cursor-pointer transition-colors ${
                isActive ? 'text-[#1E3A5F] font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#1E3A5F]' : 'text-slate-400'}`} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 bg-amber-500 text-white text-[9px] font-bold px-1 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
