// A printable invoice the platform sends to a teacher or school, with a
// WhatsApp share. Used by the platform admin and in the owner's subscription page.
import React from 'react';
import { MessageCircle, Printer } from 'lucide-react';
import { whatsappLink, type PaymentAccount } from '../../data/billing';

export interface InvoiceSheetData {
  number: string;
  orgName: string;
  periodStart: string;
  periodEnd: string;
  pricingModel: 'per_student' | 'per_paper' | null;
  units: number;
  unitPrice: number;
  amount: number;
  paidAmount: number;
  status: 'issued' | 'pending_confirmation' | 'paid' | 'overdue' | 'void';
  dueOn: string | null;
  notes: string;
}

const STATUS_TEXT: Record<InvoiceSheetData['status'], string> = {
  issued: 'مستحقة الدفع',
  pending_confirmation: 'إيصال بانتظار التأكيد',
  paid: 'مدفوعة',
  overdue: 'متأخرة',
  void: 'ملغاة',
};
const UNIT: Record<'per_student' | 'per_paper', string> = { per_student: 'طالب مسجّل', per_paper: 'ورقة مصحّحة' };

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
const day = (d: string | null) => {
  if (!d) return '—';
  try {
    return new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return d;
  }
};

/** Text of the invoice for WhatsApp. */
export function invoiceMessage(inv: InvoiceSheetData, sym: string, accounts: PaymentAccount[]): string {
  const remaining = Math.max(0, inv.amount - inv.paidAmount);
  const lines = [
    `فاتورة منصة دقة رقم ${inv.number}`,
    `الجهة: ${inv.orgName}`,
    inv.periodStart !== inv.periodEnd ? `الفترة: ${day(inv.periodStart)} – ${day(inv.periodEnd)}` : `التاريخ: ${day(inv.periodStart)}`,
    inv.pricingModel && inv.units ? `الاستخدام: ${inv.units} ${UNIT[inv.pricingModel]} × ${fmt(inv.unitPrice)} ${sym}` : '',
    inv.notes ? `البيان: ${inv.notes}` : '',
    `المبلغ: ${fmt(inv.amount)} ${sym}`,
    inv.paidAmount > 0 ? `المدفوع: ${fmt(inv.paidAmount)} ${sym} · المتبقي: ${fmt(remaining)} ${sym}` : '',
    inv.dueOn && inv.status !== 'paid' ? `آخر موعد للدفع: ${day(inv.dueOn)}` : '',
    inv.status === 'paid' ? 'الحالة: مدفوعة، شكراً لك.' : '',
    inv.status !== 'paid' && accounts.length ? '\nطرق الدفع:' : '',
    ...(inv.status !== 'paid' ? accounts.map((a) => `• ${a.title}${a.holder ? ` (${a.holder})` : ''}: ${a.number}`) : []),
    inv.status !== 'paid' ? '\nبعد التحويل ارفع صورة الإيصال من صفحة «الاشتراك والفواتير» في المنصة.' : '',
  ];
  return lines.filter(Boolean).join('\n');
}

export const InvoiceSheet: React.FC<{
  invoice: InvoiceSheetData;
  sym: string;
  accounts: PaymentAccount[];
  /** Owner's phone: shows the WhatsApp button. */
  phone?: string;
  onClose: () => void;
}> = ({ invoice: inv, sym, accounts, phone, onClose }) => {
  const remaining = Math.max(0, inv.amount - inv.paidAmount);
  const wa = phone ? whatsappLink(phone, invoiceMessage(inv, sym, accounts)) : null;
  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="print-area bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 my-auto text-right">
        <div className="bg-[#1E3A5F] text-white p-5 flex items-center justify-between border-b-4 border-emerald-500">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/dequa-logo.png" alt="" className="w-9 h-9 rounded-lg bg-white p-1 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base">فاتورة اشتراك منصة دقة</h3>
              <p className="text-[11px] text-blue-200 font-mono">{inv.number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="print:hidden w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold shrink-0"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>
        <div className="p-5 sm:p-6 space-y-3 text-xs">
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">إلى:</span>
            <strong className="text-sm text-slate-900 text-left">{inv.orgName}</strong>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">{inv.periodStart !== inv.periodEnd ? 'الفترة:' : 'التاريخ:'}</span>
            <span className="font-medium">
              {inv.periodStart !== inv.periodEnd ? `${day(inv.periodStart)} – ${day(inv.periodEnd)}` : day(inv.periodStart)}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">الحالة:</span>
            <span className="font-bold">{STATUS_TEXT[inv.status]}</span>
          </div>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-right">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-2.5">البيان</th>
                  <th className="p-2.5 text-left">المبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inv.pricingModel && inv.units > 0 && (
                  <tr>
                    <td className="p-2.5">
                      {inv.units} {UNIT[inv.pricingModel]} × {fmt(inv.unitPrice)} {sym}
                    </td>
                    <td className="p-2.5 text-left font-mono">{fmt(inv.units * inv.unitPrice)}</td>
                  </tr>
                )}
                {inv.notes && (
                  <tr>
                    <td className="p-2.5" colSpan={2}>
                      {inv.notes}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-blue-900">المجموع:</span>
              <strong className="text-lg font-mono font-black text-[#1E3A5F]">
                {fmt(inv.amount)} {sym}
              </strong>
            </div>
            {inv.paidAmount > 0 && (
              <>
                <div className="flex justify-between text-emerald-700">
                  <span>المدفوع:</span>
                  <span className="font-mono font-bold">
                    {fmt(inv.paidAmount)} {sym}
                  </span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>المتبقي:</span>
                  <span className="font-mono font-bold">
                    {fmt(remaining)} {sym}
                  </span>
                </div>
              </>
            )}
          </div>
          {inv.dueOn && inv.status !== 'paid' && inv.status !== 'void' && (
            <p className="text-slate-600">آخر موعد للدفع: {day(inv.dueOn)}</p>
          )}
          {inv.status !== 'paid' && inv.status !== 'void' && accounts.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="font-bold text-slate-800">طرق الدفع:</span>
              {accounts.map((a, i) => (
                <div key={i} className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <strong>{a.title}</strong>
                  {a.holder ? ` · ${a.holder}` : ''}
                  <span className="block font-mono break-all" dir="ltr">
                    {a.number}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="print:hidden p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" /> إرسال على واتساب
            </a>
          )}
          <button
            onClick={() => window.print()}
            className={`${wa ? '' : 'flex-1 justify-center'} bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5`}
          >
            <Printer className="w-4 h-4" /> طباعة / PDF
          </button>
        </div>
      </div>
    </div>
  );
};
