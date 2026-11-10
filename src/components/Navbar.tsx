import React, { useState } from 'react';
import { UserRole, ScreenId, Entity } from '../types';
import {
  Sparkles,
  ArrowRight,
  UserCheck,
  LogOut,
  Menu,
  ChevronDown,
  Building2,
  GraduationCap,
  Briefcase,
  Layers,
  Check,
  Headphones
} from 'lucide-react';
import { PLATFORM_CONFIG, MOCK_ENTITIES } from '../mockData';
import { useAuth } from '../lib/auth';

interface NavbarProps {
  currentRole: UserRole;
  currentScreen: ScreenId;
  activeEntity?: Entity;
  availableEntities?: Entity[];
  onSwitchEntity?: (entityId: string) => void;
  onRoleChange?: (role: UserRole) => void;
  onNavigate: (screen: ScreenId) => void;
  onOpenAI: () => void;
  onLogout?: () => void;
  onOpenMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  currentScreen,
  activeEntity = MOCK_ENTITIES[0],
  availableEntities = MOCK_ENTITIES,
  onSwitchEntity,
  onRoleChange,
  onNavigate,
  onOpenAI,
  onLogout,
  onOpenMobileMenu,
}) => {
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);
  const auth = useAuth();
  // A platform admin who also teaches reaches both areas from the header.
  const canOpenAdmin = auth.mode === 'real' && auth.status === 'signed_in' && !!auth.profile?.isPlatformAdmin;
  const hasOwnAccount = auth.mode === 'real' && auth.entities.length > 0;

  // If visitor: show clean landing nav links
  if (currentRole === 'visitor') {
    return (
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 md:gap-6">
          {/* Brand Logo with the official logo */}
          <div 
            onClick={() => onNavigate('A1')}
            className="flex items-center gap-2 cursor-pointer shrink-0"
          >
            <img
              src="/dequa-logo.png"
              alt="منصة دقة - DEQUA"
              className="h-9 sm:h-12 w-auto object-contain"
            />
          </div>

          {/* Clean nav links */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-6 text-xs lg:text-sm font-medium text-slate-600">
            <button 
              onClick={() => onNavigate('A1')}
              className={`hover:text-[#1E3A5F] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentScreen === 'A1' ? 'text-[#1E3A5F] font-bold' : ''
              }`}
            >
              الرئيسية
            </button>
            <button 
              onClick={() => {
                onNavigate('A1');
                setTimeout(() => {
                  document.getElementById('who-is-it-for')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="hover:text-[#1E3A5F] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              لمن دقة؟
            </button>
            <button 
              onClick={() => {
                onNavigate('A1');
                setTimeout(() => {
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="hover:text-[#1E3A5F] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              كيف تعمل
            </button>
            <button 
              onClick={() => onNavigate('A2')}
              className={`hover:text-[#1E3A5F] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentScreen === 'A2' ? 'text-[#1E3A5F] font-bold' : ''
              }`}
            >
              الأسعار
            </button>
            <button 
              onClick={() => {
                onNavigate('A1');
                setTimeout(() => {
                  document.getElementById('curricula-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="hover:text-[#1E3A5F] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              المناهج المدعومة
            </button>
            <button 
              onClick={() => {
                onNavigate('A1');
                setTimeout(() => {
                  document.getElementById('install-app')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="hidden lg:inline-block hover:text-[#1E3A5F] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              حمّل التطبيق
            </button>
            <button 
              onClick={() => onNavigate('SUPPORT')}
              className={`hover:text-[#1E3A5F] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentScreen === 'SUPPORT' ? 'text-[#1E3A5F] font-bold' : ''
              }`}
            >
              الدعم الفني
            </button>
          </nav>

          {/* Primary Action Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('A4')}
              className={`border px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95 ${
                currentScreen === 'A4'
                  ? 'bg-[#E8F0F8] border-blue-300 text-[#1E3A5F]'
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-[#1E3A5F]'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => onNavigate('A3')}
              className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 active:scale-95"
            >
              <span>جرّب مجاناً الآن</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </header>
    );
  }

  // If student submission: clean minimal header
  if (currentRole === 'student') {
    return (
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/dequa-logo.png" alt="دقة" className="h-8 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full font-medium">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>بوابة تسليم الطالب المباشر لأوراق الامتحان</span>
          </div>
        </div>
      </header>
    );
  }

  // Dashboard Header for Teacher, School Principal, Platform Admin
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Mobile Hamburger Button + Brand Logo + Entity Switcher Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-95 border border-slate-200"
              title="فتح القائمة والسايد بار"
            >
              <Menu className="w-5 h-5 text-[#1E3A5F]" />
            </button>
          )}

          <div 
            onClick={() => onNavigate(currentRole === 'school_principal' ? 'D1' : currentRole === 'platform_admin' ? 'E1' : 'B1')}
            className="flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <img
              src="/dequa-logo.png"
              alt="منصة دقة"
              className="h-7 sm:h-11 w-auto object-contain"
            />
          </div>

          {/* Entity Switcher (مبدّل الحسابات والجهات) */}
          {currentRole !== 'platform_admin' && (
            <div className="relative border-r border-slate-200 pr-1.5 sm:pr-2 mr-0.5 sm:mr-1 min-w-0">
              <button
                onClick={() => setShowEntityDropdown(!showEntityDropdown)}
                className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2.5 py-1.5 rounded-xl hover:bg-slate-100 border border-slate-200/80 transition-all cursor-pointer text-right group min-w-0 max-w-full"
                title="التبديل بين الحسابات والجهات المسجلة"
              >
                <div className="hidden sm:flex w-7 h-7 rounded-lg bg-blue-50 text-[#1E3A5F] items-center justify-center font-bold text-xs shrink-0">
                  {activeEntity.type === 'school' ? (
                    <Building2 className="w-4 h-4 text-emerald-600" />
                  ) : activeEntity.type === 'learning_center' ? (
                    <Briefcase className="w-4 h-4 text-purple-600" />
                  ) : (
                    <GraduationCap className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div className="text-right min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-[#1E3A5F] max-w-[110px] sm:max-w-[200px] truncate">
                      {activeEntity.name}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span className={`px-1 rounded font-semibold ${
                      activeEntity.role === 'owner' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {activeEntity.role === 'owner' ? 'مالك / مدير' : 'معلم معتمد'}
                    </span>
                    <span>·</span>
                    <span>{activeEntity.activeStudentsCount} طالباً</span>
                  </div>
                </div>
              </button>

              {/* Entity Dropdown Menu */}
              {showEntityDropdown && (
                <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 text-right text-xs space-y-1">
                  <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-xs">حساباتك وجهاتك التعليمية</span>
                    <span className="text-[10px] text-slate-400">بيانات منفصلة بالكامل</span>
                  </div>

                  <div className="space-y-1 py-1">
                    {availableEntities.map((ent) => {
                      const isSelected = ent.id === activeEntity.id;
                      return (
                        <div
                          key={ent.id}
                          onClick={() => {
                            // The app opens the right area for this organization
                            // (school dashboard for owners of a school or centre).
                            onSwitchEntity?.(ent.id);
                            setShowEntityDropdown(false);
                          }}
                          className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#E8F0F8] border border-blue-200' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center shrink-0">
                              {ent.type === 'school' ? (
                                <Building2 className="w-4 h-4 text-emerald-600" />
                              ) : ent.type === 'learning_center' ? (
                                <Briefcase className="w-4 h-4 text-purple-600" />
                              ) : (
                                <GraduationCap className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{ent.name}</div>
                              <div className="text-[10px] text-slate-500">
                                {ent.type === 'individual_teacher' ? 'مدرّس خصوصي مستقل' : 'مدرسة خاصة'} · الدور: {ent.role === 'owner' ? 'مالك' : 'معلم'}
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>

                  {canOpenAdmin && (
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setShowEntityDropdown(false);
                          onNavigate('E1');
                        }}
                        className="w-full text-center py-2 text-purple-800 hover:bg-purple-50 rounded-xl font-bold transition-colors cursor-pointer text-xs"
                      >
                        لوحة إدارة المنصة
                      </button>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setShowEntityDropdown(false);
                        onNavigate('A3');
                      }}
                      className="w-full text-center py-2 text-blue-700 hover:bg-blue-50 rounded-xl font-bold transition-colors cursor-pointer text-xs"
                    >
                      + إضافة جهة أو مدرسة جديدة
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentRole === 'platform_admin' && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 border-r border-slate-200 pr-3 mr-1">
              <span className="font-bold text-purple-900 bg-purple-50 px-2.5 py-0.5 rounded-full">
                الإدارة المركزية العامة للمنصة
              </span>
            </div>
          )}

          {currentRole === 'platform_admin' && hasOwnAccount && (
            <button
              onClick={() => onNavigate('B1')}
              className="text-xs font-bold text-[#1E3A5F] border border-slate-200 hover:bg-slate-100 rounded-xl px-2.5 py-1.5 cursor-pointer whitespace-nowrap"
              title="العودة إلى حسابك كمدرّس أو جهة"
            >
              حسابي
            </button>
          )}
        </div>

        {/* Right side: Technical Support + AI Quick Assistant trigger + Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => onNavigate(currentRole === 'platform_admin' ? 'E5' : 'SUPPORT')}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shadow-2xs ${
              currentScreen === 'SUPPORT' || currentScreen === 'E5'
                ? 'bg-blue-50 text-blue-900 border-blue-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
            title="الدعم الفني والمساعدة"
          >
            <Headphones className="w-3.5 h-3.5 text-blue-600" />
            <span>الدعم الفني</span>
          </button>

          <button
            onClick={onOpenAI}
            className="hidden sm:flex items-center gap-1.5 bg-[#E8F0F8] hover:bg-[#d8e6f4] text-[#1E3A5F] px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-blue-200 cursor-pointer shadow-2xs"
            title="المساعد الذكي لمنصة دقة"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">المساعد الذكي</span>
          </button>

          {currentRole === 'teacher' && (
            <button
              onClick={() => onNavigate('B7')}
              className="hidden sm:flex bg-[#1E3A5F] hover:bg-[#152a45] text-white px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer items-center gap-1.5"
            >
              <span>رفع أوراق</span>
            </button>
          )}

          {currentRole === 'school_principal' && (
            <button
              onClick={() => onNavigate('D3')}
              className="hidden sm:block bg-[#1E3A5F] hover:bg-[#152a45] text-white px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            >
              <span>التقرير الشامل</span>
            </button>
          )}

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-slate-200"
              title="تسجيل الخروج والعودة للصفحة الرئيسية"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
