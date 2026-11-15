import { MessageCircle } from 'lucide-react';
import { useCodeChannel, usePublicSetting } from '../lib/settings';

/**
 * "Open WhatsApp and ask for the code": the person sends «رمز» to the platform's
 * WhatsApp number and the code comes back as a reply. Shown only when the
 * platform admin has set the number (platform_settings.whatsapp_login).
 */
export default function WhatsAppCodeButton() {
  const setting = usePublicSetting<{ number?: string }>('whatsapp_login', {});
  const channel = useCodeChannel();
  const number = String(setting?.number ?? '').replace(/\D/g, '');
  // When codes go by SMS the WhatsApp request button is not needed.
  if (!number || channel === 'sms') return null;
  return (
    <div className="space-y-1.5">
      <a
        href={`https://wa.me/${number}?text=${encodeURIComponent('رمز')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-[#25D366] hover:bg-[#1ebe5a] text-white py-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
      >
        <MessageCircle className="w-4 h-4" />
        <span>افتح واتساب واطلب الرمز</span>
      </a>
      <span className="block text-[10px] text-slate-500 text-center">
        أرسل الرسالة كما هي من نفس الرقم، ويصلك الرمز على واتساب خلال ثوانٍ.
      </span>
    </div>
  );
}
