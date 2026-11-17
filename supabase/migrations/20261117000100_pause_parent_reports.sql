-- إيقاف مؤقت لإرسال تقارير أولياء الأمور أثناء تجربة المنصة ببيانات وهمية.
-- التقارير تبقى في قائمة الانتظار ولا يُرسل شيء. رموز الدخول تعمل كالمعتاد.
-- للتشغيل من جديد: workflow «Set SMS» بالعملية reports_resume (يحذف هذا الإعداد).
insert into public.platform_settings (key, value, is_public)
values ('reports_paused', '{"paused": true}'::jsonb, false)
on conflict (key) do nothing;
