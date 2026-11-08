import React, { useEffect, useState } from 'react';
import { ShieldCheck, Sparkles, RotateCcw } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { toInternationalPhone } from '../../lib/phone';
import { EntityType } from '../../types';

// Last step of sign-up when a real Supabase project is connected:
// 1) send a 6-digit code to the WhatsApp number, 2) check it, 3) create the
// organization with this person as its owner. If the person is already signed
// in (e.g. a school teacher opening their own tutoring account) we skip 1 and 2.

const CODE_LENGTH = 6;
const RESEND_WAIT_SECONDS = 60;

interface Props {
  phone: string;
  fullName: string;
  orgName: string;
  kind: EntityType;
  region?: string;
  invites?: { name: string; phone: string }[];
  buttonLabel: string;
  onBack: () => void;
  onCreated: (organizationId: string, kind: EntityType) => void;
}

export const FinishSignupWithWhatsApp: React.FC<Props> = ({ phone, fullName, orgName, kind, region, invites, buttonLabel, onBack, onCreated }) => {
  const auth = useAuth();
  const signedIn = auth.status === 'signed_in';
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  // If the number changes after a code was sent, start again.
  useEffect(() => {
    setCodeSent(false);
    setCode('');
  }, [phone]);

  const create = async () => {
    const { id, error: createError } = await auth.createOrganization({ name: orgName, kind, fullName, region, invites });
    if (createError || !id) {
      setError(createError ?? 'تعذّر إنشاء الحساب. حاول مرة أخرى.');
      return;
    }
    onCreated(id, kind);
  };

  const sendCode = async () => {
    setBusy(true);
    const message = await auth.sendCode(phone);
    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    setCodeSent(true);
    setCode('');
    setResendIn(RESEND_WAIT_SECONDS);
  };

  const start = async () => {
    setError(null);
    if (!fullName.trim()) return setError('اكتب الاسم الكامل.');
    if (!orgName.trim()) return setError('اكتب اسم الجهة.');
    if (signedIn) {
      setBusy(true);
      await create();
      setBusy(false);
      return;
    }
    if (!toInternationalPhone(phone)) return setError('اكتب رقم واتساب صحيحاً، مثال: 0599123456');
    await sendCode();
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.length !== CODE_LENGTH) {
      setError(`اكتب الرمز المكوّن من ${CODE_LENGTH} أرقام كما وصلك على واتساب.`);
      return;
    }
    setBusy(true);
    const message = await auth.verifyCode(phone, code);
    if (message) {
      setBusy(false);
      setError(message);
      return;
    }
    await create();
    setBusy(false);
  };

  return (
    <div className="space-y-4 pt-2">
      {error && <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs">{error}</div>}

      {codeSent && !signedIn ? (
        <form onSubmit={confirm} className="space-y-3 text-xs">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#1E3A5F] shrink-0" />
            <span>
              أرسلنا رمز التحقق على واتساب إلى{' '}
              <span dir="ltr" className="font-bold tabular-nums">{toInternationalPhone(phone)}</span>
            </span>
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
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Sparkles className="w-4 h-4" />
            <span>{busy ? 'جاري التحقق وإنشاء الحساب...' : 'تأكيد الرمز وإنشاء الحساب'}</span>
          </button>
          <div className="flex items-center justify-between text-[11px]">
            <button type="button" onClick={() => setCodeSent(false)} className="text-[#1E3A5F] font-bold hover:underline cursor-pointer">
              تغيير الرقم
            </button>
            <button
              type="button"
              disabled={busy || resendIn > 0}
              onClick={sendCode}
              className="text-slate-500 hover:text-[#1E3A5F] disabled:opacity-60 flex items-center gap-1 cursor-pointer disabled:cursor-default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                {resendIn > 0 ? (
                  <>
                    إعادة الإرسال بعد <span className="tabular-nums">{resendIn}</span> ثانية
                  </>
                ) : (
                  'لم يصلك الرمز؟ أعد الإرسال'
                )}
              </span>
            </button>
          </div>
        </form>
      ) : (
        <div className="pt-2 flex items-center justify-between gap-3">
          <button onClick={onBack} className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer shrink-0">
            ← السابق
          </button>
          <button
            onClick={start}
            disabled={busy}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 sm:px-7 py-3 rounded-xl font-black text-sm flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{busy ? 'لحظة...' : signedIn ? buttonLabel : 'أرسل رمز التحقق على واتساب'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
