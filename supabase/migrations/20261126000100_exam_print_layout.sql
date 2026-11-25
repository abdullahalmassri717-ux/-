-- تنسيق ورقة الامتحان المطبوعة: عدد أسطر الإجابة لكل سؤال (حسب رقم السؤال)،
-- شكل مساحة الإجابة (أسطر أو مربع)، وعدد الصفحات الذي اختاره المدرّس.
-- مثال: {"pages": 2, "style": "lines", "lines": {"1": 2, "2": 6}}
-- يعدّله من يملك تعديل الامتحان نفسه (نفس سياسة assessments_update).
alter table public.assessments
  add column if not exists print_layout jsonb not null default '{}'::jsonb;

alter table public.assessments
  drop constraint if exists assessments_print_layout_check;
alter table public.assessments
  add constraint assessments_print_layout_check
  check (jsonb_typeof(print_layout) = 'object' and pg_column_size(print_layout) < 20000);
