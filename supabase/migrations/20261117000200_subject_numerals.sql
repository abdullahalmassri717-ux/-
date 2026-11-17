-- How each subject's textbook writes numbers, so the AI writes questions,
-- answers and feedback the same way:
--   arabic = Arabic-Indic digits (٠١٢٣) and Arabic symbols (س، ص)
--   latin  = Western digits (0123) and Latin symbols (x, m/s, H2O)
-- It is curriculum data: the platform admin can change it per subject in the
-- curriculum screen.
alter table public.subjects
  add column if not exists numerals text not null default 'arabic'
  check (numerals in ('arabic', 'latin'));

comment on column public.subjects.numerals is
  'arabic: Arabic-Indic digits and Arabic symbols; latin: Western digits and Latin symbols. Used by the AI tools and grading.';

-- Palestinian curriculum, checked against the ministry textbooks (Nov 2026):
-- grades 1–9 use Arabic digits in every subject; mathematics keeps Arabic
-- digits and symbols up to Tawjihi; grade 10 physics is still Arabic. Western
-- digits and Latin symbols: English; grade 10 chemistry and biology; grades
-- 11–12 physics, chemistry, biology and technology; grade 12 general science.
update public.subjects s
set numerals = 'latin'
from public.grades g
join public.curricula c on c.id = g.curriculum_id
where s.grade_id = g.id
  and c.slug = 'palestinian'
  and (
    s.name like 'اللغة الإنجليزية%'
    or (g.name = 'الصف العاشر' and s.name in ('الكيمياء', 'العلوم الحياتية'))
    or (g.name like 'الصف الحادي عشر%' and s.name in ('الفيزياء', 'الكيمياء', 'العلوم الحياتية', 'التكنولوجيا'))
    or (g.name like 'الصف الثاني عشر%' and s.name in ('الفيزياء', 'الكيمياء', 'العلوم الحياتية', 'التكنولوجيا', 'العلوم العامة'))
  );
