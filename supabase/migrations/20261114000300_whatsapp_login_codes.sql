-- رمز الدخول عبر واتساب بدون قالب من ميتا:
-- الشخص يطلب الرمز من الموقع، فيُحفظ هنا 10 دقائق، ثم يرسل «رمز» لرقم دقة
-- على واتساب فيصله الرمز ردّاً على رسالته (لا يحتاج قالباً ولا توثيق ميتا).
-- الجداول للخادم فقط (Edge Functions بمفتاح service_role). لا سياسات = لا وصول من المتصفح.

create table public.whatsapp_login_codes (
  phone       text primary key,            -- أرقام فقط بالصيغة الدولية، مثل 970599123456
  code        text not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create table public.whatsapp_contacts (
  phone            text primary key,       -- آخر رسالة وصلتنا من هذا الرقم (نافذة الـ 24 ساعة)
  last_inbound_at  timestamptz not null default now()
);

alter table public.whatsapp_login_codes enable row level security;
alter table public.whatsapp_contacts enable row level security;
revoke all on public.whatsapp_login_codes from anon, authenticated;
revoke all on public.whatsapp_contacts from anon, authenticated;
