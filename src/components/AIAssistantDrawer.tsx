import React, { useState } from 'react';
import { ScreenId } from '../types';
import { useData, errorMessage } from '../data/DataContext';
import {
  Sparkles,
  X,
  Send,
  Mic,
  MicOff,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Bot,
  User,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  actionCard?: {
    title: string;
    description: string;
    changeDetails: string;
    confirmed: boolean;
    cancelled: boolean;
  };
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
  };
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  currentScreen,
  onNavigate,
}) => {
  const store = useData();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: 'أهلاً بك! أنا مساعد دقة. اسألني عن صياغة الأسئلة ومعايير التصحيح، أفكار لشرح درس، رسالة لأولياء الأمور، أو طريقة استخدام المنصة.',
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Suggested prompts from PDF page 10
  const suggestions = [
    'اقترح معايير تصحيح لمسألة من 10 درجات',
    'اكتب رسالة لأولياء الأمور عن موعد امتحان',
    'كيف أرسل رابط التسليم للطلاب؟',
    'فكرة بسيطة لشرح درس صعب',
  ];

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || isLoading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text };
    const history = [...messages.filter((m) => m.id !== 'm1'), userMsg];
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    try {
      const reply = await store.aiAssistant(history.map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', text: m.text })));
      setMessages((prev) => [...prev, { id: `${Date.now()}a`, sender: 'ai', text: reply || 'لم أفهم الطلب، جرّب صياغة أخرى.' }]);
    } catch (e) {
      setMessages((prev) => [...prev, { id: `${Date.now()}e`, sender: 'ai', text: errorMessage(e) }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.actionCard) {
          return {
            ...m,
            actionCard: { ...m.actionCard, confirmed: true, cancelled: false },
          };
        }
        return m;
      })
    );
  };

  const handleCancelAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.actionCard) {
          return {
            ...m,
            actionCard: { ...m.actionCard, confirmed: false, cancelled: true },
          };
        }
        return m;
      })
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 left-0 max-w-full flex">
        <aside className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-r border-slate-200">
          {/* Header */}
          <div className="px-4 py-3.5 bg-[#1E3A5F] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm">المساعد التربوي الذكي لمنصة دقة</h3>
                <p className="text-[11px] text-blue-200">
                  متصل ومدرك للسياق التعليمي الحالي
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Suggestion Pills */}
          <div className="p-3 bg-[#E8F0F8]/50 border-b border-blue-100 overflow-x-auto no-scrollbar flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#1E3A5F] shrink-0">مقترحات:</span>
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s)}
                className="text-[11px] bg-white border border-blue-200 hover:border-blue-400 text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer hover:bg-blue-50/50 shadow-2xs"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#1E3A5F] text-emerald-400'
                  }`}
                >
                  {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed space-y-2 ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tl-none'
                      : 'bg-[#F7F8FA] text-slate-800 border border-slate-200 rounded-tr-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Table response if present */}
                  {msg.tableData && (
                    <div className="mt-2 overflow-x-auto border border-slate-200 rounded-lg bg-white">
                      <table className="w-full text-right text-[11px]">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            {msg.tableData.headers.map((h, i) => (
                              <th key={i} className="p-1.5">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {msg.tableData.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-1.5 tabular-nums">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Action Confirmation Card (PDF requirement: لا يُنفَّذ أي تعديل بدون تأكيد) */}
                  {msg.actionCard && (
                    <div className="mt-3 p-3 bg-white border border-amber-300 rounded-lg shadow-xs space-y-2 text-slate-800">
                      <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>{msg.actionCard.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-600">{msg.actionCard.description}</p>
                      <div className="p-2 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-900 font-medium">
                        {msg.actionCard.changeDetails}
                      </div>

                      {msg.actionCard.confirmed ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px] pt-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تم اعتماد وتنفيذ التعديل بنجاح في قاعدة البيانات!</span>
                        </div>
                      ) : msg.actionCard.cancelled ? (
                        <div className="text-slate-500 font-medium text-[11px] pt-1">
                          تم إلغاء الإجراء ولم يتغير شيء.
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleConfirmAction(msg.id)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-3 rounded text-xs font-bold transition-colors cursor-pointer"
                          >
                            تأكيد التعديل
                          </button>
                          <button
                            onClick={() => handleCancelAction(msg.id)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 py-1.5 px-3 rounded text-xs font-medium transition-colors cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-slate-500 text-xs py-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#1E3A5F]" />
                <span>الذكاء الاصطناعي يحلل بيانات الامتحان والمعايير...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب سؤالك للمساعد..."
                className="flex-1 px-3 py-2 bg-[#F7F8FA] border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:border-[#1E3A5F] transition-colors"
                disabled={isLoading}
              />

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-[#1E3A5F] hover:bg-[#152a45] disabled:opacity-50 text-white p-2 rounded-lg cursor-pointer transition-colors"
              >
                <Send className="w-4 h-4 rtl:rotate-180" />
              </button>
            </form>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              قد يخطئ المساعد أحياناً. راجع ما يقترحه قبل استخدامه.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
