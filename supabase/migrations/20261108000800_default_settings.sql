-- ============================================================================
-- دقة — القيم الافتراضية للإعدادات والباقات (يعدّلها مدير المنصة لاحقاً من لوحته)
-- الأسعار هنا بيانات، والشاشات تقرؤها ولا تكتبها بنفسها.
-- ============================================================================

insert into public.platform_settings (key, value, is_public) values
  ('currency', '{"code": "ILS", "symbol": "₪", "name": "شيكل"}', true),
  ('pricing', '{
     "teacher_monthly_per_student": 5,
     "teacher_monthly_minimum": 250,
     "school_yearly_per_student": 50,
     "school_installments": 2
   }', true),
  ('grading', '{"low_confidence_threshold": 0.7}', false)
on conflict (key) do nothing;

insert into public.subscription_plans
  (slug, name, target, billing_cycle, price_per_student, minimum_charge, installments, features, is_popular, notes, sort_order)
values
  ('teacher_monthly', 'باقة المدرّس', 'teachers', 'monthly', 5, 250, 1,
   '["تصحيح الواجبات والامتحانات بالذكاء الاصطناعي", "تقارير واتساب لأولياء الأمور", "نظام رسوم الطلاب"]',
   true, 'لكل طالب نشط شهرياً، بحد أدنى 250', 1),
  ('school_yearly', 'باقة المدارس', 'schools', 'yearly', 50, 0, 2,
   '["حسابات لمعلمي المدرسة", "لوحة مدير المدرسة وتقاريرها", "دفعتان فصليتان"]',
   true, 'لكل طالب سنوياً على دفعتين فصليتين', 2)
on conflict (slug) do nothing;
