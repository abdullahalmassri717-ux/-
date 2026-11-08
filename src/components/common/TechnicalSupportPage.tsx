import React, { useCallback, useEffect, useState } from 'react';
import { ScreenId, SupportTicket, Entity } from '../../types';
import { supportApi } from '../../data/support';
import { usePublicSetting } from '../../lib/settings';
import { errorMessage } from '../../data/DataContext';
import {
  Headphones,
  MessageCircle,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Send,
  HelpCircle,
  ChevronDown,
  Sparkles,
  Paperclip,
  PhoneCall,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { notify } from '../../lib/notify';

interface TechnicalSupportPageProps {
  onNavigate: (screen: ScreenId) => void;
  activeEntity?: Entity;
}

export const TechnicalSupportPage: React.FC<TechnicalSupportPageProps> = ({ 
  onNavigate, 
  activeEntity 
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [busy, setBusy] = useState(false);
  const supportContact = usePublicSetting<{ whatsapp?: string }>('support', { whatsapp: '970599123456' });

  const loadTickets = useCallback(async (selectId?: string) => {
    try {
      const list = await supportApi().listTickets();
      setTickets(list);
      if (selectId) setSelectedTicket(list.find((t) => t.id === selectId) ?? null);
    } catch (e) {
      notify(errorMessage(e, 'تعذّر تحميل التذاكر.'));
    }
  }, []);
  useEffect(() => {
    loadTickets();
  }, [loadTickets]);
  const [activeTab, setActiveTab] = useState<'tickets' | 'faq' | 'contact'>('tickets');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);

  // New Ticket Form State
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<SupportTicket['category']>('ai_grading');
  const [newPriority, setNewPriority] = useState<SupportTicket['priority']>('normal');
  const [newDescription, setNewDescription] = useState('');
  const [newAttachedPaper, setNewAttachedPaper] = useState('');

  // Reply in selected ticket
  const [replyText, setReplyText] = useState('');

  // Search in FAQ
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<Record<number, boolean>>({ 0: true });

  const faqs = [
    {
      q: 'ماذا أفعل إذا كان خط يد الطالب باهتاً جداً أو بالقلم الرصاص؟',
      a: 'محرك الذكاء الاصطناعي في دقة مزود بمرشح تباين رقمي فائق. إذا لاحظت أي خط غير مقروء، اضغط على زر "رفع التباين" داخل شاشة المراجعة، أو استخدم ميزة التعديل اليدوي السريع بنقرة واحدة.',
    },
    {
      q: 'هل يشترط طباعة أوراق الإجابة بطابعات ليزر ملونة خاصة؟',
      a: 'لا على الإطلاق. أوراق إجابة دقة مصممة للطباعة على أي طابعة عادية (أبيض وأسود) بدقة 300DPI أو على ماكينات تصوير المدارس العادية، مع الحفاظ على وضوح مربعات الـ QR الأربعة في الزوايا.',
    },
    {
      q: 'كيف تضمن المنصة وصول تقارير النتائج عبر واتساب دون حظر الرقم؟',
      a: 'تستخدم المنصة قنوات واتساب الرسمية للأعمال (WhatsApp Cloud API المعتمدة)، وتتم جدولة الرسائل بشكل متدرج مع روابط مشفرة وآمنة لولي الأمر.',
    },
    {
      q: 'كيف يمكن لمديرة المدرسة إضافة معلمين أو تغيير الشعب المخصصة لهم؟',
      a: 'من شاشة «المعلمون والصفوف» يضيف المدير رقم واتساب المعلم ويرسل له الدعوة. عندما يدخل المعلم برقمه (برمز تحقق على واتساب، بدون كلمة مرور) يرى الصفوف المسندة إليه فقط، ولا يرى أي بيانات مالية.',
    },
    {
      q: 'ما هي سرعة استجابة فريق الدعم الفني لحالات الامتحانات المباشرة؟',
      a: 'لدينا خط دعم طارئ عبر واتساب متاح يومياً من 7:00 صباحاً حتى 11:00 مساءً، بمتوسط زمن استجابة أقل من 8 دقائق للمعلمين والمدارس.',
    },
  ];

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) return;
    setBusy(true);
    try {
      const body = newAttachedPaper.trim() ? `${newDescription}\n\nمرتبط بـ: ${newAttachedPaper.trim()}` : newDescription;
      const id = await supportApi().createTicket({
        organizationId: activeEntity?.id ?? null,
        subject: newSubject,
        category: newCategory,
        priority: newPriority,
        body,
      });
      setShowNewTicketModal(false);
      setNewSubject('');
      setNewDescription('');
      setNewAttachedPaper('');
      await loadTickets(id);
      notify('تم إرسال التذكرة. سيرد عليك فريق الدعم هنا.');
    } catch (err) {
      notify(errorMessage(err, 'تعذّر إنشاء التذكرة.'));
    } finally {
      setBusy(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setBusy(true);
    try {
      await supportApi().reply(selectedTicket.id, replyText);
      setReplyText('');
      await loadTickets(selectedTicket.id);
    } catch (err) {
      notify(errorMessage(err, 'تعذّر إرسال الرد.'));
    } finally {
      setBusy(false);
    }
  };

  const openWhatsAppSupport = () => {
    const msg = encodeURIComponent(
      `مرحباً فريق دعم منصة دقة،\nأنا ${activeEntity?.principalOrOwnerName || 'معلم بالمنصة'} من جهة (${activeEntity?.name || 'حساب تعليمي'}).\nأحتاج مساعدة فنية في المنصة.`
    );
    const number = (supportContact.whatsapp ?? '').replace(/\D/g, '');
    if (!number) return notify('رقم واتساب الدعم غير مضاف بعد. افتح تذكرة وسنرد عليك هنا.');
    window.open(`https://wa.me/${number}?text=${msg}`, '_blank');
  };

  const filteredFaqs = faqs.filter(f => 
    f.q.includes(faqSearch) || f.a.includes(faqSearch)
  );

  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              فريق الدعم الفني متصل الآن (غزة - فلسطين)
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#1E3A5F] flex items-center gap-2">
            <Headphones className="w-6 h-6 text-[#1E3A5F]" />
            <span>مركز الدعم الفني ومساندة المعلمين</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            نحن هنا لضمان سير امتحاناتك وتصحيح أوراق طلابك بسلاسة تامة. تواصل معنا عبر التذاكر المباشرة أو محادثة واتساب الفورية مع مهندسي النظام.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={openWhatsAppSupport}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>محادثة واتساب الفورية</span>
          </button>

          <button
            onClick={() => setShowNewTicketModal(true)}
            className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>فتح تذكرة جديدة</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'tickets'
              ? 'bg-[#1E3A5F] text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>تذاكري واستفساراتي ({tickets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('faq')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'faq'
              ? 'bg-[#1E3A5F] text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>الأسئلة الشائعة ودليل الحلول السريعة</span>
        </button>

        <button
          onClick={() => setActiveTab('contact')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'contact'
              ? 'bg-[#1E3A5F] text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          <span>قنوات الاتصال المباشرة</span>
        </button>
      </div>

      {/* TAB 1: TICKETS LIST & DETAILS */}
      {activeTab === 'tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
              <span>سجل التذاكر</span>
              <span className="text-slate-400 font-mono">{tickets.length} تذكرة</span>
            </div>

            {tickets.map(ticket => {
              const isSelected = selectedTicket?.id === ticket.id;

              const statusBadge = {
                open: { label: 'جديدة بانتظار الرد', color: 'bg-amber-50 text-amber-800 border-amber-200' },
                in_progress: { label: 'قيد المعالجة', color: 'bg-blue-50 text-blue-800 border-blue-200' },
                resolved: { label: 'تم الحل بنجاح', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                closed: { label: 'مغلقة', color: 'bg-slate-100 text-slate-600 border-slate-200' },
              }[ticket.status];

              const categoryLabel = {
                ai_grading: 'التصحيح التلقائي',
                qr_printing: 'طباعة أوراق الـ QR',
                whatsapp_reports: 'تقارير واتساب',
                financial: 'الاشتراك والفوترة',
                curriculum: 'المنهاج والأسئلة',
                other: 'استفسار عام',
              }[ticket.category];

              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'bg-blue-50/50 border-[#1E3A5F] ring-1 ring-[#1E3A5F]/20 shadow-xs'
                      : 'bg-white border-slate-200/90 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-400 font-bold">{ticket.ticketNumber}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-relaxed">
                    {ticket.subject}
                  </h3>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                      {categoryLabel}
                    </span>
                    <span>{ticket.createdAt}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ticket Conversation View */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-6">
                {/* Header */}
                <div className="border-b border-slate-100 pb-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                        {selectedTicket.ticketNumber}
                      </span>
                      <span className="text-xs text-slate-400">{selectedTicket.createdAt}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        selectedTicket.status === 'resolved' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {selectedTicket.status === 'resolved' ? 'تم الحل بنجاح ✓' : 'قيد المتابعة مع فريق الدعم'}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-base font-black text-slate-900 leading-snug">
                    {selectedTicket.subject}
                  </h2>
                </div>

                {/* Original Description */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-700">
                    <span>وصف المشكلة من الأستاذ:</span>
                    <span className="text-slate-400 font-normal">{selectedTicket.senderName}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                    {selectedTicket.description}
                  </p>
                  {selectedTicket.attachedExamOrPaper && (
                    <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2 text-[#1E3A5F] font-bold">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>مرفق مرتبط: {selectedTicket.attachedExamOrPaper}</span>
                    </div>
                  )}
                </div>

                {/* Replies Thread */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-slate-700">سجل الردود والمتابعة:</div>

                  {selectedTicket.replies && selectedTicket.replies.length > 0 ? (
                    selectedTicket.replies.map(rep => {
                      const isSupport = rep.sender === 'support_agent';

                      return (
                        <div
                          key={rep.id}
                          className={`p-4 rounded-2xl text-xs space-y-1.5 ${
                            isSupport
                              ? 'bg-emerald-50/70 border border-emerald-200/80 mr-4'
                              : 'bg-slate-100/80 border border-slate-200 ml-4'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className={isSupport ? 'text-emerald-900' : 'text-slate-800'}>
                              {rep.senderName} {isSupport && '(فريق الدعم الفني)'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{rep.time}</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed">{rep.message}</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      التذكرة قيد المراجعة، سيقوم مهندس الدعم بالرد عليك خلال دقائق.
                    </div>
                  )}
                </div>

                {/* Reply Form */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <label className="block text-xs font-bold text-slate-700">إضافة رد أو توضيح إضافي:</label>
                  <div className="flex items-start gap-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="اكتب ردك هنا..."
                      className="flex-1 p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 text-slate-900 min-h-[70px]"
                    />
                    <button
                      onClick={handleSendReply}
                      className="bg-[#1E3A5F] hover:bg-[#152a45] text-white p-3 rounded-xl transition-colors cursor-pointer self-end"
                      title="إرسال الرد"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-3 text-slate-400">
                <Headphones className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">اختر تذكرة لمعاينة التفاصيل والردود</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  يمكنك النقر على أي تذكرة من القائمة الجانبية أو إنشاء تذكرة دعم فني جديدة بضغطة زر.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FAQ ACCORDION */}
      {activeTab === 'faq' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
            <input
              type="text"
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              placeholder="ابحث في المشاكل الشائعة، أوراق الـ QR، والتصحيح..."
              className="w-full pr-10 pl-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 text-slate-900"
            />
          </div>

          <div className="space-y-3">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = expandedFaq[idx] || false;

              return (
                <div key={idx} className="border border-slate-200/80 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq({ ...expandedFaq, [idx]: !isOpen })}
                    className="w-full p-4 text-right bg-slate-50 hover:bg-slate-100/60 flex items-center justify-between text-xs font-bold text-slate-800 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="p-4 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CONTACT CHANNELS */}
      {activeTab === 'contact' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-3 text-right">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">خط الواتساب السريع</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              تواصل مباشرة مع المهندس المشرف في غزة لإرسال صور المشاكل وتلقي الحلول فورياً.
            </p>
            <div className="pt-2">
              <button
                onClick={openWhatsAppSupport}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                فتح واتساب (0599-123456)
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-3 text-right">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">نظام التذاكر المعتمد</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              سجل تذاكر موثق داخل حسابك مع متابعة الحلول وتاريخ المراجعة وتأكيد الإصلاحات.
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  setActiveTab('tickets');
                  setShowNewTicketModal(true);
                }}
                className="w-full bg-[#1E3A5F] hover:bg-[#152a45] text-white py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إنشاء تذكرة جديدة
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-3 text-right">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">التجهيز الفني والتدريب للمدارس</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              جلسة فيديو مخصصة لكادر المعلمين لشرح كيفية تصوير الأوراق وضبط طابعات المدرسة.
            </p>
            <div className="pt-2">
              <button
                onClick={() => notify('تم حجز موعد جلسة تدريبية لكادر المدرسة وسيتواصل معك منسق التدريب.')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                حجز جلسة تدريب الكادر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 text-right space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-[#1E3A5F] flex items-center gap-2">
                <Plus className="w-5 h-5" />
                <span>فتح تذكرة دعم فني جديدة</span>
              </h3>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">عنوان المشكلة أو الاستفسار</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="مثال: صعوبة في مسح الورقة رقم 14 في امتحان التفاضل"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تصنيف المشكلة</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-800"
                  >
                    <option value="ai_grading">التصحيح التلقائي للذكاء الاصطناعي</option>
                    <option value="qr_printing">طباعة أوراق الإجابة وكود QR</option>
                    <option value="whatsapp_reports">إرسال تقارير واتساب</option>
                    <option value="financial">الاشتراك والفوترة وسندات الطلاب</option>
                    <option value="curriculum">المنهاج وبنك الأسئلة</option>
                    <option value="other">استفسار عام</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">درجة الأهمية</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-bold"
                  >
                    <option value="normal">عادية (خلال ساعات)</option>
                    <option value="high">مرتفعة (مستعجلة)</option>
                    <option value="urgent">طارئة (امتحان مباشر الآن)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">وصف مفصل للمشكلة</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="يرجى كتابة التفاصيل واسم الطالب أو كود الورقة للمساعدة السريعة..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 min-h-[90px]"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم الورقة أو الطالب المرتبط (اختياري)</label>
                <input
                  type="text"
                  value={newAttachedPaper}
                  onChange={(e) => setNewAttachedPaper(e.target.value)}
                  placeholder="مثال: ورقة الطالب محمود العشي (رمز 5012)"
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 bg-[#1E3A5F] hover:bg-[#152a45] text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-colors cursor-pointer"
                >
                  إرسال التذكرة لفريق الدعم
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-xl font-medium text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
