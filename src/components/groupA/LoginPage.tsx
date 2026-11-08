import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { toInternationalPhone } from '../../lib/phone';
import { ScreenId, UserRole } from '../../types';
import { ArrowRight, MessageCircle, ShieldCheck, Check, Sparkles, Phone, RotateCcw } from 'lucide-react';

interface LoginPageProps {
  onNavigate: (screen: ScreenId) => void;
  onRoleChange: (role: UserRole) => void;
}

// Login is by WhatsApp number + a one-time code sent on WhatsApp (no passwords).
// With a real Supabase project the code is really sent and checked. Without one
// (demo mode) the code is not sent and any 6 digits work with the demo accounts.

const CODE_LENGTH = 6;
const RESEND_WAIT_SECONDS = 60;

type DemoAccount = {
  label: string;
  phone: string;
  role: UserRole;
  roleName: string;
  targetScreen: ScreenId;
  welcome: string;
};

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'أ. محمد المصري',
    phone: '0599123456',
    role: 'teacher',
    roleName: 'مدرّس خصوصي',
    targetScreen: 'B1',
    welcome: 'أهلاً بك أ. محمد المصري!',
  },
  {
    label: 'مدرسة الأمل الخاصة',
    phone: '0599000111',
    role: 'school_principal',
    roleName: 'مدير مدرسة',
    targetScreen: 'D1',
    welcome: 'أهلاً بك أ. سميرة عكيلة (مدرسة الأمل الخاصة)!',
  },
  {
    label: 'إدارة المنصة',
    phone: '0599999999',
    role: 'platform_admin',
    roleName: 'مدير المنصة',
    targetScreen: 'E1',
    welcome: 'أهلاً بك في لوحة إدارة منصة دقة.',
  },
];

const normalizePhone = (value: string) => value.replace(/[^0-9+]/g, '');
const isValidPhone = (value: string) => normalizePhone(value).replace('+', '').length >= 9;

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onRoleChange }) => {
  const auth = useAuth();
  const isReal = auth.mode === 'real';
  const [phone, setPhone] = useState(isReal ? '' : DEMO_ACCOUNTS[0].phone);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const account = DEMO_ACCOUNTS.find((a) => a.phone === normalizePhone(phone)) || DEMO_ACCOUNTS[0];

  const requestRealCode = async () => {
    setIsLoading(true);
    const message = await auth.sendCode(phone);
    setIsLoading(false);
    if (message) {
      setError(message);
      return false;
    }
    setResendIn(RESEND_WAIT_SECONDS);
    return true;
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isReal ? !toInternationalPhone(phone) : !isValidPhone(phone)) {
      setError('اكتب رقم واتساب صحيحاً، مثال: 0599123456');
      return;
    }
    if (isReal) {
      if (await requestRealCode()) {
        setStep('code');
        setCode('');
      }
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('code');
      setCode('');
    }, 600);
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.length !== CODE_LENGTH) {
      setError(`اكتب الرمز المكوّن من ${CODE_LENGTH} أرقام كما وصلك على واتساب.`);
      return;
    }
    if (isReal) {
      setIsLoading(true);
      const message = await auth.verifyCode(phone, code);
      setIsLoading(false);
      if (message) {
        setError(message);
        return;
      }
      // The app moves on to the right dashboard by itself once the account is loaded.
      setLoginSuccess('تم التحقق بنجاح. جاري فتح حسابك...');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setLoginSuccess(account.welcome);
      setTimeout(() => {
        onRoleChange(account.role);
        onNavigate(account.targetScreen);
      }, 600);
    }, 600);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md space-y-6 text-right">
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
            {step === 'phone'
              ? 'ادخل برقم واتساب، وسيصلك رمز تحقق. لا حاجة لكلمة مرور.'
              : 'أرسلنا رمز التحقق إلى واتساب. اكتبه هنا.'}
          </p>
        </div>

        {step === 'phone' && !isReal && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold">
              <span className="flex items-center gap-1 text-[#1E3A5F]">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>حسابات تجريبية:</span>
              </span>
              <span className="text-[10px] text-slate-400">انقر للتعبئة</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => {
                const isActive = normalizePhone(phone) === acc.phone;
                return (
                  <button
                    key={acc.phone}
                    type="button"
                    onClick={() => setPhone(acc.phone)}
                    className={`p-2 rounded-xl text-right text-xs transition-all border cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 border-blue-400 text-[#1E3A5F] font-bold'
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
        )}

        {loginSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{loginSuccess}</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs">{error}</div>
        )}

        {step === 'phone' ? (
          <form onSubmit={sendCode} className="space-y-4 text-xs">
            <label className="block">
              <span className="block text-slate-700 font-bold mb-1.5">رقم الواتساب</span>
              <div className="relative">
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3 bg-[#F7F8FA] border border-slate-300 rounded-xl pl-9 text-left text-sm tabular-nums text-slate-800 focus:bg-white focus:border-[#1E3A5F] focus:outline-none transition-colors"
                  placeholder="0599123456"
                  required
                />
                <Phone className="w-4 h-4 text-slate-400 absolute top-3.5 left-3" />
              </div>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#1E3A5F] hover:bg-[#152a45] disabled:opacity-50 text-white py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              {isLoading ? (
                <span>جاري الإرسال...</span>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4" />
                  <span>أرسل رمز التحقق على واتساب</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4 text-xs">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#1E3A5F]" />
                <span>
                  أُرسل الرمز إلى <span dir="ltr" className="font-bold tabular-nums">{isReal ? toInternationalPhone(phone) : normalizePhone(phone)}</span>
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setError(null);
                }}
                className="text-[11px] text-[#1E3A5F] font-bold hover:underline cursor-pointer shrink-0"
              >
                تغيير الرقم
              </button>
            </div>

            <label className="block">
              <span className="block text-slate-700 font-bold mb-1.5">رمز التحقق ({CODE_LENGTH} أرقام)</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                maxLength={CODE_LENGTH}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH))}
                className="w-full p-3 bg-[#F7F8FA] border border-slate-300 rounded-xl text-center text-xl font-bold tracking-[0.4em] tabular-nums focus:bg-white focus:border-[#1E3A5F] focus:outline-none"
                placeholder="••••••"
                autoFocus
              />
              {!isReal && (
                <span className="block text-[10px] text-slate-400 mt-1">في النسخة التجريبية يكفي أي {CODE_LENGTH} أرقام.</span>
              )}
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#1E3A5F] hover:bg-[#152a45] disabled:opacity-50 text-white py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              {isLoading ? (
                <span>جاري التحقق...</span>
              ) : (
                <>
                  <span>تسجيل الدخول</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isLoading || resendIn > 0}
              onClick={async () => {
                setCode('');
                setError(null);
                if (isReal) await requestRealCode();
              }}
              className="w-full text-[11px] text-slate-500 hover:text-[#1E3A5F] disabled:opacity-60 disabled:hover:text-slate-500 flex items-center justify-center gap-1 cursor-pointer disabled:cursor-default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                {resendIn > 0 ? (
                  <>
                    يمكنك طلب رمز جديد بعد <span className="tabular-nums">{resendIn}</span> ثانية
                  </>
                ) : (
                  'لم يصلك الرمز؟ أعد الإرسال'
                )}
              </span>
            </button>
          </form>
        )}

        <div className="border-t border-slate-100 pt-4 text-center space-y-2.5">
          <p className="text-xs text-slate-600">
            ليس لديك حساب؟{' '}
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
