// The WhatsApp login code message, shared by send-sms-hook and whatsapp-inbound.
export const CODE_MINUTES = 10;

export function codeText(code: string): string {
  return `رمز الدخول إلى دقة: ${code}\nصالح لمدة ${CODE_MINUTES} دقائق. لا تشاركه مع أحد.`;
}
