import { notify } from '../../lib/notify';
import React from 'react';
import { ScreenId } from '../../types';
import {
  Sparkles,
  FileText,
  BookOpen,
  Layers,
  Calendar,
  AlertTriangle,
  Bot,
  BrainCircuit,
  ArrowRight,
  CheckCircle2,
  ScanLine
} from 'lucide-react';

interface AIToolsHubPageProps {
  onNavigate: (screen: ScreenId) => void;
  onOpenAI: () => void;
}

export const AIToolsHubPage: React.FC<AIToolsHubPageProps> = ({ onNavigate, onOpenAI }) => {
  const tools = [
    {
      id: 'C_FILES' as ScreenId,
      title: 'ملفاتي (المراجع وأوراق العمل)',
      desc: 'ارفع ملخصاتك وأسئلتك الخاصة واربطها بدروس المنهاج ليعتمد عليها الذكاء الاصطناعي في التوليد والتصحيح.',
      phase: 'soon',
      badge: 'قريباً',
      icon: FileText,
    },
    {
      id: 'C1' as ScreenId,
      title: 'توليد امتحان ذكي من المنهاج',
      desc: 'أسئلة من الدروس التي شرحتها فقط، مع نموذج الإجابة ومعايير التصحيح، وفحص ثانٍ أن كل سؤال داخل الدروس.',
      phase: 'available',
      badge: 'متاح الآن',
      icon: Sparkles,
    },
    {
      id: 'C2' as ScreenId,
      title: 'تمارين علاجية وشرح الأخطاء',
      desc: 'نحدد أضعف الدروس من الأوراق المصحّحة، ونولّد تمارين متدرجة مع مفتاح الحل لطالب أو لمجموعة.',
      phase: 'available',
      badge: 'متاح الآن',
      icon: Sparkles,
    },
    {
      id: 'C3' as ScreenId,
      title: 'بنك الأسئلة',
      desc: 'أسئلتك وأسئلة امتحاناتك السابقة والأسئلة المولّدة، مرتبة حسب الدرس، وتنشئ منها امتحاناً بضغطة.',
      phase: 'available',
      badge: 'متاح الآن',
      icon: BookOpen,
    },
    {
      id: 'C4' as ScreenId,
      title: 'المساعد الذكي',
      desc: 'اسأله عن صياغة الأسئلة والمعايير وأفكار الشرح والرسائل وطريقة استخدام المنصة.',
      phase: 'available',
      badge: 'متاح الآن',
      icon: Bot,
      isDrawer: true,
    },
    {
      id: 'C5' as ScreenId,
      title: 'تحويل امتحان ورقي قديم',
      desc: 'صوّر امتحاناً قديماً ليحوّله الذكاء الاصطناعي لأسئلة مع درجات ومعايير، تحفظها في البنك أو تنشئ منها امتحاناً.',
      phase: 'available',
      badge: 'متاح الآن',
      icon: ScanLine,
    },
    {
      id: 'C6' as ScreenId,
      title: 'مراجعة سؤالاً سؤالاً',
      desc: 'نجمع الإجابات التي حققت نفس معايير التصحيح، فتعتمد درجة المجموعة كلها بضغطة.',
      phase: 'available',
      badge: 'متاح الآن',
      icon: Layers,
    },
    {
      id: 'C7' as ScreenId,
      title: 'خطة مذاكرة وبطاقات مراجعة',
      desc: 'جدول يومي حتى موعد الامتحان يبدأ بأضعف دروس الطالب، مع بطاقات مراجعة سريعة.',
      phase: 'available',
      badge: 'متاح الآن',
      icon: Calendar,
    },
    {
      id: 'C8' as ScreenId,
      title: 'الطلاب المعرّضون للخطر',
      desc: 'رصد مبكر من الأوراق المعتمدة: من تراجعت علاماته أو نزلت تحت 50%، مع إجراء مقترح.',
      phase: 'available',
      badge: 'متاح الآن',
      icon: AlertTriangle,
    },
    {
      id: 'C9' as ScreenId,
      title: 'مساعد الرد على أولياء الأمور',
      desc: 'الصق رسالة ولي الأمر، فيكتب مسودة رد من بيانات الطالب التي تسمح بها، وأنت ترسلها على واتساب.',
      phase: 'available',
      badge: 'متاح الآن',
      icon: BrainCircuit,
    },
  ];

  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-[#1E3A5F] to-indigo-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm space-y-3">
        <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-xs text-blue-200">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>منظومة الذكاء الاصطناعي المدمجة لمنصة دِقّـة</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">
          مركز الأدوات الذكية للمعلم
        </h1>
        <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
          أدوات تعتمد على دروس منهجك وأوراق طلابك المصحّحة: توليد الامتحانات، التمارين العلاجية، تحويل الامتحانات الورقية، ومتابعة الطلاب.
        </p>
      </div>

      {/* Grid of Tools with Phase Badges (PDF requirement) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              onClick={() => {
                if (tool.phase === 'soon') {
                  notify('هذه الأداة قيد التجهيز وستتوفر قريباً.');
                } else if (tool.isDrawer) {
                  onOpenAI();
                } else {
                  onNavigate(tool.id);
                }
              }}
              className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#E8F0F8] text-[#1E3A5F] group-hover:bg-[#1E3A5F] group-hover:text-white transition-colors flex items-center justify-center font-bold">
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Phase Badge */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    tool.phase === 'available'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : tool.phase === 'soon'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-purple-50 text-purple-800 border border-purple-200'
                  }`}>
                    {tool.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-[#1E3A5F] transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{tool.desc}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#1E3A5F]">
                <span>فتح الأداة</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
