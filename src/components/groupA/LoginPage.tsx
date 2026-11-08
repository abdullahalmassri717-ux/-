import React, { useState } from 'react';
import { ScreenId, UserRole } from '../../types';
import { Mail, Lock, ArrowRight, ShieldCheck, UserCheck, Eye, EyeOff, Check, Sparkles } from 'lucide-react';

interface LoginPageProps {
  onNavigate: (screen: ScreenId) => void;
  onRoleChange: (role: UserRole) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onRoleChange }) => {
  const [emailOrUser, setEmailOrUser] = useState('teacher@daqqa.ps');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);

  // Quick preset accounts for demonstration (Tutors, Private Schools, Platform Admin)
  const quickAccounts: { label: string; email: string; role: UserRole; roleName: string; targetScreen: ScreenId }[] = [
    { label: 'أ. محمد المصري', email: 'teacher@daqqa.ps', role: 'teacher', roleName: 'معلم خصوصي (توجيهي)', targetScreen: 'B1' },
    { label: 'مدرسة الأمل الخاصة', email: 'school@daqqa.ps', role: 'school_principal', roleName: 'مدير مدرسة (صفوف 1-9)', targetScreen: 'D1' },
    { label: 'إدارة المنصة المركزية', email: 'admin@daqqa.ps', role: 'platform_admin', roleName: 'مدير المنصة', targetScreen: 'E1' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const emailLower = emailOrUser.toLowerCase().trim();

      let targetRole: UserRole = 'teacher';
      let targetScreen: ScreenId = 'B1';
      let welcomeMsg = 'أهلاً بك أ. محمد المصري! تم تسجيل دخولك بنجاح.';

      if (emailLower.includes('school')) {
        targetRole = 'school_principal';
        targetScreen = 'D1';
        welcomeMsg = 'أهلاً بك أ. سميرة عكيلة (مدرسة الأمل الخاصة)! تم تسجيل الدخول بنجاح.';
      } else if (emailLower.includes('admin')) {
        targetRole = 'platform_admin';
        targetScreen = 'E1';
        welcomeMsg = 'تم تسجيل الدخول إلى لوحة إدارة منصة دقة المركزية.';
      }

      setLoginSuccess(welcomeMsg);
      setTimeout(() => {
        onRoleChange(targetRole);
        onNavigate(targetScreen);
      }, 700);
    }, 600);
  };

  const handleSelectQuickAccount = (acc: typeof quickAccounts[0]) => {
    setEmailOrUser(acc.email);
    setPassword('123456');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md space-y-6 text-right">
        {/* Brand / Header with official logo */}
        <div className="text-center space-y-2">
          <div 
            onClick={() => onNavigate('A1')}
            className="cursor-pointer inline-block mx-auto hover:opacity-90 transition-opacity"
            title="العودة إلى الصفحة الرئيسية"
          >
            <img src="/dequa-logo.png" alt="منصة دقة" className="h-12 w-auto mx-auto object-contain" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#1E3A5F]">تسجيل الدخول إلى دِقّـة</h1>
          <p className="text-xs text-slate-500">
            أدخل البريد الإلكتروني (الإيميل) أو اسم المستخدم وكلمة المرور
          </p>
        </div>

        {/* Quick Demo Credentials Preset Bar */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold">
            <span className="flex items-center gap-1 text-[#1E3A5F]">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>حسابات تجريبية سريعة:</span>
            </span>
            <span className="text-[10px] text-slate-400">انقر للتعبئة الفورية</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {quickAccounts.map((acc) => {
              const isActive = emailOrUser === acc.email;
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectQuickAccount(acc)}
                  className={`p-2 rounded-xl text-right text-xs transition-all border cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 border-blue-400 text-[#1E3A5F] font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="text-[11px] font-bold truncate">{acc.label}</div>
                  <div className="text-[9px] text-slate-400 truncate">{acc.roleName}</div>
                </button>
              );
            })}
          </div>
        </div>

        {loginSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{loginSuccess}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              البريد الإلكتروني (الإيميل) أو اسم المستخدم
            </label>
            <div className="relative">
              <input
                type="text"
                value={emailOrUser}
                onChange={(e) => setEmailOrUser(e.target.value)}
                className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-xl pr-9 font-mono text-slate-800 text-xs focus:bg-white focus:border-[#1E3A5F] focus:outline-none transition-colors"
                placeholder="teacher@daqqa.ps أو اسم المستخدم"
                required
              />
              <Mail className="w-4 h-4 text-slate-400 absolute top-3 right-3" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-700 font-bold">كلمة المرور (الباسورد)</label>
              <button
                type="button"
                onClick={() => alert('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني المسجل.')}
                className="text-[11px] text-[#1E3A5F] hover:underline cursor-pointer"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 bg-[#F7F8FA] border border-slate-300 rounded-xl pr-9 pl-9 font-mono text-slate-800 text-xs focus:bg-white focus:border-[#1E3A5F] focus:outline-none transition-colors"
                placeholder="••••••••"
                required
              />
              <Lock className="w-4 h-4 text-slate-400 absolute top-3 right-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-2.5 left-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded text-[#1E3A5F] focus:ring-0 w-3.5 h-3.5"
              />
              <span>تذكر بيانات الدخول على هذا الجهاز</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#1E3A5F] hover:bg-[#152a45] disabled:opacity-50 text-white py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            {isLoading ? (
              <span>جاري التحقق وتسجيل الدخول...</span>
            ) : (
              <>
                <span>تسجيل الدخول</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </>
            )}
          </button>
        </form>

        <div className="border-t border-slate-100 pt-4 text-center space-y-2.5">
          <p className="text-xs text-slate-600">
            ليس لديك حساب معتمد حتى الآن؟{' '}
            <button
              onClick={() => onNavigate('A3')}
              className="font-bold text-[#1E3A5F] hover:underline cursor-pointer"
            >
              إنشاء حساب جديد (تجربة مجانية)
            </button>
          </p>

          <div className="pt-2 flex items-center justify-center gap-4 text-[11px]">
            <button
              onClick={() => onNavigate('A1')}
              className="text-slate-500 hover:text-[#1E3A5F] transition-colors cursor-pointer font-medium"
            >
              ← العودة إلى الصفحة الرئيسية
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => {
                onRoleChange('student');
                onNavigate('A5');
              }}
              className="text-blue-600 hover:underline font-medium cursor-pointer"
            >
              بوابة تسليم الطالب للأوراق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
