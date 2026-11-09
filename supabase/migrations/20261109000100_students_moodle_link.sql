-- ربط الطالب بحسابه على Moodle (لتصدير العلامات إلى دفتر علامات Moodle).
-- نخزّن معرّفاً واحداً فقط من الثلاثة التي يقبلها استيراد Moodle: البريد،
-- أو اسم المستخدم، أو رقم الهوية. أقل قدر من البيانات، وكلاهما معاً أو لا شيء.
alter table public.students
  add column moodle_identifier      text check (char_length(moodle_identifier) between 1 and 200),
  add column moodle_identifier_kind text check (moodle_identifier_kind in ('email', 'username', 'idnumber')),
  add constraint students_moodle_link_pair
    check ((moodle_identifier is null) = (moodle_identifier_kind is null));
