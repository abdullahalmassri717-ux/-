-- ============================================================================
-- دقة — بيانات تجريبية للتطوير فقط (مأخوذة من src/mockData.ts)
-- تُحمَّل تلقائياً مع «supabase db reset» على القاعدة المحلية. لا تُشغَّل على الإنتاج.
-- كل الأرقام وهمية (+97059000xxxx / +97059900xxxx).
-- هذا الملف مولَّد آلياً؛ المعرّفات ثابتة حتى تبقى الروابط بين الجداول صحيحة.
-- ============================================================================

-- المستخدمون (ملفاتهم الشخصية تُنشأ تلقائياً من auth.users)
insert into auth.users (id, instance_id, aud, role, phone, phone_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('d45dfdfe-111f-4a8d-8871-0d0ab1784d3e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '970590000001', '2026-09-01T08:00:00Z', '{"full_name":"أ. محمد المصري"}'::jsonb, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
  ('485c9183-1afc-47bd-82ce-b1a0f51c64b6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '970590000002', '2026-09-01T08:00:00Z', '{"full_name":"أ. سميرة عكيلة"}'::jsonb, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
  ('7bdee99e-852d-49c6-8ace-30866c1d2b8b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '970590000003', '2026-09-01T08:00:00Z', '{"full_name":"د. خالد التميمي"}'::jsonb, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
  ('f118abc0-6877-4745-8d29-bb9429abeaee', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '970590000099', '2026-09-01T08:00:00Z', '{"full_name":"مدير منصة دقة"}'::jsonb, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
  ('0f00b8f6-b32c-4cc6-82d6-8f7fbc3d201d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '970590000011', '2026-09-01T08:00:00Z', '{"full_name":"أ. أحمد حلس"}'::jsonb, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
  ('09487d0a-96dc-421b-85c7-80cf154f4a84', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '970590000012', '2026-09-01T08:00:00Z', '{"full_name":"أ. ريم شملخ"}'::jsonb, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
  ('7b276505-fafe-41c5-83af-6cc7944c3234', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '970590000013', '2026-09-01T08:00:00Z', '{"full_name":"أ. تامر السراج"}'::jsonb, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
  ('4c26843b-d6f7-4d0f-89a8-b5f2f3551744', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '970590000014', '2026-09-01T08:00:00Z', '{"full_name":"أ. خلود دلول"}'::jsonb, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z');

update public.profiles p set full_name = u.raw_user_meta_data ->> 'full_name'
from auth.users u where u.id = p.id and p.full_name is null;

insert into public.platform_admins (user_id) values
  ('f118abc0-6877-4745-8d29-bb9429abeaee');

-- الجهات والعضويات
insert into public.organizations (id, name, kind, region, created_by) values
  ('2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'أكاديمية أ. محمد المصري (مدرّس خصوصي)', 'individual_teacher', 'غزة، فلسطين', 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e'),
  ('b10663fc-a4b4-4181-86f3-0f9799331018', 'مدرسة الأمل الخاصة (الصفوف 1 - 9)', 'school', 'غزة، الرمال الجنوبي', '485c9183-1afc-47bd-82ce-b1a0f51c64b6'),
  ('51b38bc2-9779-44e1-8ae7-4c51e697f45f', 'مركز الروّاد التعليمي', 'learning_center', 'رام الله، فلسطين', '7bdee99e-852d-49c6-8ace-30866c1d2b8b');

insert into public.memberships (organization_id, user_id, role, status) values
  ('2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e', 'owner', 'active'),
  ('b10663fc-a4b4-4181-86f3-0f9799331018', '485c9183-1afc-47bd-82ce-b1a0f51c64b6', 'owner', 'active'),
  ('51b38bc2-9779-44e1-8ae7-4c51e697f45f', '7bdee99e-852d-49c6-8ace-30866c1d2b8b', 'owner', 'active'),
  ('b10663fc-a4b4-4181-86f3-0f9799331018', 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e', 'teacher', 'active'),
  ('b10663fc-a4b4-4181-86f3-0f9799331018', '0f00b8f6-b32c-4cc6-82d6-8f7fbc3d201d', 'teacher', 'active'),
  ('b10663fc-a4b4-4181-86f3-0f9799331018', '09487d0a-96dc-421b-85c7-80cf154f4a84', 'teacher', 'active'),
  ('b10663fc-a4b4-4181-86f3-0f9799331018', '7b276505-fafe-41c5-83af-6cc7944c3234', 'teacher', 'active'),
  ('b10663fc-a4b4-4181-86f3-0f9799331018', '4c26843b-d6f7-4d0f-89a8-b5f2f3551744', 'teacher', 'disabled');

insert into public.invitations (organization_id, phone, role, invited_by) values
  ('b10663fc-a4b4-4181-86f3-0f9799331018', '+970590000020', 'teacher', '485c9183-1afc-47bd-82ce-b1a0f51c64b6');

-- شجرة المنهج
insert into public.curricula (id, slug, name, country, currency_code, is_available, sort_order) values
  ('2963da64-62d2-4453-8fd0-96a471292123', 'palestinian', 'المنهاج الفلسطيني المعتمد', 'فلسطين', 'ILS', true, 1),
  ('65146807-95c9-47c6-81ce-fad038b39666', 'jordanian', 'المنهاج الأردني (قريباً)', 'الأردن', 'JOD', false, 2),
  ('ce7bb358-ecd3-44af-8269-9a8de06de06b', 'saudi', 'المنهاج السعودي (قريباً)', 'المملكة العربية السعودية', 'SAR', false, 3);

insert into public.grades (id, curriculum_id, name, stage, sort_order) values
  ('008f353e-0464-41f1-8140-e7b95a0ce7f7', '2963da64-62d2-4453-8fd0-96a471292123', 'الصف الثاني عشر (التوجيهي)', 'secondary', 1),
  ('8b61e5b7-86be-4916-8396-cefb73b6e3e7', '2963da64-62d2-4453-8fd0-96a471292123', 'الصف السادس الأساسي', 'middle', 2),
  ('2a1705e0-5bf2-43c0-8794-14a6092689b5', '2963da64-62d2-4453-8fd0-96a471292123', 'الصف التاسع الأساسي', 'middle', 3);

insert into public.subjects (id, grade_id, name, code, status, sort_order) values
  ('9017601a-f326-4012-8d18-f54a2b7e1f6e', '008f353e-0464-41f1-8140-e7b95a0ce7f7', 'الرياضيات (الفرع العلمي والصناعي)', 'MATH-12-SCI', 'published', 1),
  ('4626ce13-bef4-4029-8031-8b0e4ce457b4', '008f353e-0464-41f1-8140-e7b95a0ce7f7', 'اللغة الإنجليزية (English for Palestine)', 'ENG-12', 'published', 2),
  ('e9a287a7-55c1-4934-8ac0-fa50df10c3bb', '8b61e5b7-86be-4916-8396-cefb73b6e3e7', 'الرياضيات (التعليم الأساسي)', 'MATH-6', 'published', 1),
  ('51043427-9b73-4e1e-8195-5d4bc7a92a70', '2a1705e0-5bf2-43c0-8794-14a6092689b5', 'التكنولوجيا والبرمجة (مسوّدة قيد المراجعة والاعتماد)', 'TECH-9', 'draft', 1);

insert into public.units (id, subject_id, title, sort_order) values
  ('b01db858-f8ef-4b5c-8745-26f7deb0b9be', '9017601a-f326-4012-8d18-f54a2b7e1f6e', 'الوحدة الأولى: حساب التفاضل والتطبيقات', 1),
  ('6b1e13b1-c4a5-4144-81da-2b7a1c5bfa47', '9017601a-f326-4012-8d18-f54a2b7e1f6e', 'الوحدة الثانية: حساب التكامل وتطبيقاته', 2),
  ('37264c31-07ed-491f-8366-ad8f87a262e2', '4626ce13-bef4-4029-8031-8b0e4ce457b4', 'Unit 1: A Fly on the Wall (Communication)', 1),
  ('9a5e8b74-bf82-47bc-8542-743ed8dff7bc', '4626ce13-bef4-4029-8031-8b0e4ce457b4', 'Unit 2: Writing & Rhetoric (Essays & Reports)', 2),
  ('eb6b107b-ab61-4540-8fa9-1ec910e770c1', 'e9a287a7-55c1-4934-8ac0-fa50df10c3bb', 'الوحدة الأولى: الأعداد الصحيحة والعمليات عليها', 1),
  ('048f973b-7a67-4306-8628-6f3ac0a3cb24', 'e9a287a7-55c1-4934-8ac0-fa50df10c3bb', 'الوحدة الثانية: الهندسة والقياس', 2),
  ('fc70303f-4b9c-4a6d-89a2-17966672c1c0', '51043427-9b73-4e1e-8195-5d4bc7a92a70', 'الوحدة الأولى: قواعد البيانات ولغة SQL', 1);

insert into public.lessons (id, unit_id, title, sort_order) values
  ('fa5a48fa-ada8-4d8a-86c8-45ebc6a6edd8', 'b01db858-f8ef-4b5c-8745-26f7deb0b9be', 'قواعد الاشتقاق والاشتقاق الضمني', 1),
  ('dbe27192-8ca7-42ba-8c39-3510ad95f421', 'b01db858-f8ef-4b5c-8745-26f7deb0b9be', 'تطبيقات هندسية وفيزيائية للمشتقة', 2),
  ('7d33c8c4-f48b-4316-81c1-1f38a8fd5af7', 'b01db858-f8ef-4b5c-8745-26f7deb0b9be', 'المعدلات المرتبطة بالزمن', 3),
  ('e7df4849-0cfd-4160-885d-5340085542bd', 'b01db858-f8ef-4b5c-8745-26f7deb0b9be', 'نظريتا رول والقيمة المتوسطة', 4),
  ('11e0c0e5-a8c2-4b13-8c00-3e2937385bd3', 'b01db858-f8ef-4b5c-8745-26f7deb0b9be', 'تطبيقات القيم القصوى والمثلى', 5),
  ('0f8728e0-ea8f-44b0-8d05-03aac7cd2ff8', '6b1e13b1-c4a5-4144-81da-2b7a1c5bfa47', 'التكامل غير المحدود وقواعده الأساسية', 1),
  ('b19cd7d2-10da-4ff7-8a5e-fa0a1107b553', '6b1e13b1-c4a5-4144-81da-2b7a1c5bfa47', 'التكامل المحدود وخصائصه', 2),
  ('1011a984-bbc2-4785-8b9a-a1648bb8ea77', '6b1e13b1-c4a5-4144-81da-2b7a1c5bfa47', 'طرق التكامل: التعويض والأجزاء والكسور الجزئية', 3),
  ('6327feb1-30f4-431d-86cd-d796ad420ec8', '37264c31-07ed-491f-8366-ad8f87a262e2', 'Reading & Vocabulary: Interpersonal Skills', 1),
  ('a91dcc89-b2b5-4105-8ac1-2b06bdadfe8f', '37264c31-07ed-491f-8366-ad8f87a262e2', 'Grammar: Present Perfect vs Past Simple in Context', 2),
  ('83f20e9b-9abd-4b60-8c97-d4dd626e8f32', '9a5e8b74-bf82-47bc-8542-743ed8dff7bc', 'Essay Writing: Argumentative & Opinion Essay', 1),
  ('36bee63b-096d-44e8-8fed-543c37a6649f', 'eb6b107b-ab61-4540-8fa9-1ec910e770c1', 'مفهوم العدد الصحيح وتمثيله على خط الأعداد', 1),
  ('544498c6-274f-4532-8424-dadc2b96dbb1', 'eb6b107b-ab61-4540-8fa9-1ec910e770c1', 'مقارنة الأعداد الصحيحة وترتيبها والقيمة المطلقة', 2),
  ('c71ea7a7-b08e-40cf-88e3-2324da49adce', 'eb6b107b-ab61-4540-8fa9-1ec910e770c1', 'جمع الأعداد الصحيحة وطرحها', 3),
  ('19fb1f5b-67e8-4dee-8117-2e26a7c90d6e', '048f973b-7a67-4306-8628-6f3ac0a3cb24', 'محيط الدائرة ومساحتها', 1),
  ('b1415ba0-f6de-402f-83a8-77a29c5ebf91', '048f973b-7a67-4306-8628-6f3ac0a3cb24', 'مساحة متوازي الأضلاع والمثلث', 2),
  ('7b09ddaf-558f-4d1d-8567-62dd3c4adbbe', 'fc70303f-4b9c-4a6d-89a2-17966672c1c0', 'مفاهيم قواعد البيانات والجداول والعلاقات', 1);

insert into public.learning_outcomes (id, lesson_id, text, sort_order) values
  ('3593220d-b195-484f-8312-d2cff0b4df72', 'fa5a48fa-ada8-4d8a-86c8-45ebc6a6edd8', 'إيجاد مشتقة الاقترانات المركبة بقاعدة السلسلة', 1),
  ('960d9c85-78c6-403c-8a35-a3786be59b2e', 'fa5a48fa-ada8-4d8a-86c8-45ebc6a6edd8', 'تطبيق الاشتقاق الضمني على معادلات المنحنيات والعلاقات الصريحة', 2),
  ('df748021-ce3d-4931-85b2-485f9bea0b66', 'fa5a48fa-ada8-4d8a-86c8-45ebc6a6edd8', 'إيجاد المشتقات ذات الرتب العليا للمنحنيات الضمنية', 3),
  ('8c290969-faab-4ce5-8115-a59a8861798a', 'dbe27192-8ca7-42ba-8c39-3510ad95f421', 'إيجاد ميل المماس والناظم لمنحنى الاقتران عند نقطة التماس', 1),
  ('9734acc7-4e7a-40bf-8cc1-61d5c92c1045', 'dbe27192-8ca7-42ba-8c39-3510ad95f421', 'كتابة معادلة المماس والعمودي على المماس', 2),
  ('0fad4512-a474-47de-8913-1a1060b45d28', 'dbe27192-8ca7-42ba-8c39-3510ad95f421', 'حساب السرعة اللحظية والتسارع اللحظي لحركة جسيم', 3),
  ('c9459c06-3367-4fea-8389-44e20c7d5ce1', '7d33c8c4-f48b-4316-81c1-1f38a8fd5af7', 'نمذجة المسائل الهندسية والفيزيائية بعلاقة رابطة مع الزمن ن', 1),
  ('646120da-8c77-4437-8eca-7170c2fbdc0f', '7d33c8c4-f48b-4316-81c1-1f38a8fd5af7', 'اشتقاق العلاقات الضمنية بالنسبة للزمن وإيجاد معدل التغير المطلوب', 2),
  ('110dd64e-6694-4f34-8300-e2cfce5babb8', 'e7df4849-0cfd-4160-885d-5340085542bd', 'التحقق من شروط نظرية رول على فترة مغلقة', 1),
  ('65426786-2e02-4a35-8a65-b541298daf56', 'e7df4849-0cfd-4160-885d-5340085542bd', 'إيجاد قيمة جـ التي تحقق نظرية القيمة المتوسطة وتفسيرها هندسياً', 2),
  ('4c8e15ad-6c79-4e8f-840f-8afad71b2e4d', '11e0c0e5-a8c2-4b13-8c00-3e2937385bd3', 'تحديد النقاط الحرجة وفترات التزايد والتناقص باستخدام المشتقة الأولى', 1),
  ('56c0d897-a69c-4712-8759-12940a65e3ee', '11e0c0e5-a8c2-4b13-8c00-3e2937385bd3', 'اختبار المشتقة الثانية لتحديد نوع النقطة الحرجة ونقاط الانعطاف', 2),
  ('dfe51eb2-dd3d-40a6-8d76-d0cee5c09a5a', '11e0c0e5-a8c2-4b13-8c00-3e2937385bd3', 'حل مسائل التطبيقات الحياتية الهندسية والاقتصادية للقيم القصوى', 3),
  ('139775d9-4449-469e-858f-7e2655d31286', '0f8728e0-ea8f-44b0-8d05-03aac7cd2ff8', 'إيجاد الاقتران البديل لقوى المتغير س والاقترانات المثلثية والأسية', 1),
  ('1dc73771-18e7-4095-8256-5b06652e7248', '0f8728e0-ea8f-44b0-8d05-03aac7cd2ff8', 'تطبيق الخصائص الخطية للتكامل غير المحدود وحساب ثابت التكامل جـ', 2),
  ('99c1e4f3-ce6a-4848-8189-497f863ab6b7', 'b19cd7d2-10da-4ff7-8a5e-fa0a1107b553', 'حساب قيمة التكامل المحدود بالتعويض بحدود التكامل', 1),
  ('a3d81b81-790f-4247-8637-e7a200f24ffd', 'b19cd7d2-10da-4ff7-8a5e-fa0a1107b553', 'تطبيق خاصية الإضافة والمقارنة والتماثل للاقتران الزوجي والفردي', 2),
  ('eaf067aa-cd91-4ebd-8316-b090b4c51275', '1011a984-bbc2-4785-8b9a-a1648bb8ea77', 'اختيار الفرض المناسب للتكامل بالتعويض في الاقترانات المركبة', 1),
  ('e4ab9e57-6fad-4dcd-816e-5ad2c1489590', '1011a984-bbc2-4785-8b9a-a1648bb8ea77', 'تطبيق قانون التكامل بالأجزاء على حاصل ضرب اقترانين من نوعين مختلفين', 2),
  ('0fb8139e-d7c2-44a2-8ce9-4743c07d16e9', '1011a984-bbc2-4785-8b9a-a1648bb8ea77', 'تحليل المقام إلى عوامل خطية واستخدام الكسور الجزئية', 3),
  ('9cd43afb-0a7a-4ada-8909-132f26a148c6', '6327feb1-30f4-431d-86cd-d796ad420ec8', 'Analyze academic passages about non-verbal communication', 1),
  ('7e4efcbe-7a82-4383-8b51-8208dee3d122', '6327feb1-30f4-431d-86cd-d796ad420ec8', 'Master high-frequency collocations and prefixes', 2),
  ('df58d44d-251e-4603-80d4-8585326a928f', 'a91dcc89-b2b5-4105-8ac1-2b06bdadfe8f', 'Distinguish between finished past actions and actions connected to the present', 1),
  ('fe663252-9a4e-45bc-881e-fdc56fefda87', 'a91dcc89-b2b5-4105-8ac1-2b06bdadfe8f', 'Use present perfect continuous for duration and evidence', 2),
  ('1b209a5f-d5ef-4feb-833d-8af42b1a6d4b', '83f20e9b-9abd-4b60-8c97-d4dd626e8f32', 'Construct a coherent 4-paragraph argumentative essay with counterarguments', 1),
  ('87bd25be-6ac9-4318-8a37-16a3ff473a12', '83f20e9b-9abd-4b60-8c97-d4dd626e8f32', 'Use cohesive devices and advanced transitional phrases', 2),
  ('ac28146e-91da-44a0-8631-d6c3d16514e6', '36bee63b-096d-44e8-8fed-543c37a6649f', 'التعرف على مفهوم الصفر والأعداد الموجبة والسالبة في المواقف الحياتية', 1),
  ('be3a2022-e95e-45ca-8e17-969579624197', '36bee63b-096d-44e8-8fed-543c37a6649f', 'تمثيل الأعداد الصحيحة على خط الأعداد بدقة وتحديد النظير الجمعي', 2),
  ('dcf17821-ed50-4b9b-8c53-5a936c96ee8c', '544498c6-274f-4532-8424-dadc2b96dbb1', 'المقارنة بين عددين صحيحين باستخدام الرموز > و < و =', 1),
  ('afde036c-7fcf-498d-802f-8c54c4f6cc82', '544498c6-274f-4532-8424-dadc2b96dbb1', 'ترتيب مجموعة من الأعداد الصحيحة تصاعدياً وتنازلياً', 2),
  ('2051795e-a3d2-4e94-8fd9-23b38464b1c8', '544498c6-274f-4532-8424-dadc2b96dbb1', 'تعريف وحساب القيمة المطلقة لعدد صحيح', 3),
  ('785b1985-b5ca-4882-8fd9-91dc646ec753', 'c71ea7a7-b08e-40cf-88e3-2324da49adce', 'إجراء جمع عددين صحيحين لهما نفس الإشارة أو إشارات مختلفة', 1),
  ('80ad7f27-d061-4c1a-8382-98d366e875ba', 'c71ea7a7-b08e-40cf-88e3-2324da49adce', 'تحويل عملية الطرح إلى جمع النظير الجمعي وتطبيق قواعد الإشارات', 2),
  ('bc7a7d4c-9dac-4e20-8fdf-3e27ef5b27e7', '19fb1f5b-67e8-4dee-8117-2e26a7c90d6e', 'استنتاج النسبة التقريبية ط (باي) عملياً', 1),
  ('6b13bd12-35e6-4ff0-800e-55ff1332ff65', '19fb1f5b-67e8-4dee-8117-2e26a7c90d6e', 'حساب محيط الدائرة بمعلومية نصف القطر أو القطر', 2),
  ('36b900f4-f041-4a59-83a2-1517bcd0f447', '19fb1f5b-67e8-4dee-8117-2e26a7c90d6e', 'حساب مساحة سطح الدائرة وتطبيقاتها الحياتية', 3),
  ('7d025669-781b-4a91-80bb-2f6361fdf3e9', 'b1415ba0-f6de-402f-83a8-77a29c5ebf91', 'حساب مساحة متوازي الأضلاع بمعلومية طول القاعدة والارتفاع المناظر', 1),
  ('51aa0033-af45-4818-8d4b-4c46821b6680', 'b1415ba0-f6de-402f-83a8-77a29c5ebf91', 'إيجاد مساحة المثلث كشبه نصف متوازي أضلاع', 2),
  ('cb6e42e4-86f1-41b5-82db-46ef91302a4d', '7b09ddaf-558f-4d1d-8567-62dd3c4adbbe', 'تصميم جدول قاعدة بيانات سليم', 1);

insert into public.lesson_terms (lesson_id, kind, text, sort_order) values
  ('fa5a48fa-ada8-4d8a-86c8-45ebc6a6edd8', 'term', 'الاشتقاق الضمني', 1),
  ('fa5a48fa-ada8-4d8a-86c8-45ebc6a6edd8', 'term', 'قاعدة السلسلة', 2),
  ('fa5a48fa-ada8-4d8a-86c8-45ebc6a6edd8', 'term', 'مشتقات الرتب العليا', 3),
  ('fa5a48fa-ada8-4d8a-86c8-45ebc6a6edd8', 'symbol', 'ص''', 1),
  ('fa5a48fa-ada8-4d8a-86c8-45ebc6a6edd8', 'symbol', 'دص/دس', 2),
  ('fa5a48fa-ada8-4d8a-86c8-45ebc6a6edd8', 'symbol', 'د²ص/دس²', 3),
  ('fa5a48fa-ada8-4d8a-86c8-45ebc6a6edd8', 'symbol', 'س² + ص² = ر²', 4),
  ('dbe27192-8ca7-42ba-8c39-3510ad95f421', 'term', 'ميل المماس', 1),
  ('dbe27192-8ca7-42ba-8c39-3510ad95f421', 'term', 'المستقيم العمودي', 2),
  ('dbe27192-8ca7-42ba-8c39-3510ad95f421', 'term', 'السرعة اللحظية', 3),
  ('dbe27192-8ca7-42ba-8c39-3510ad95f421', 'term', 'التسارع', 4),
  ('dbe27192-8ca7-42ba-8c39-3510ad95f421', 'symbol', 'م = ص''(س₁)', 1),
  ('dbe27192-8ca7-42ba-8c39-3510ad95f421', 'symbol', 'ص - ص₁ = م(س - س₁)', 2),
  ('dbe27192-8ca7-42ba-8c39-3510ad95f421', 'symbol', 'ع(ن) = ف''(ن)', 3),
  ('dbe27192-8ca7-42ba-8c39-3510ad95f421', 'symbol', 'ت(ن) = ع''(ن)', 4),
  ('7d33c8c4-f48b-4316-81c1-1f38a8fd5af7', 'term', 'معدل التغير الزمني', 1),
  ('7d33c8c4-f48b-4316-81c1-1f38a8fd5af7', 'term', 'العلاقة المساعدة', 2),
  ('7d33c8c4-f48b-4316-81c1-1f38a8fd5af7', 'term', 'تشابه المثلثات', 3),
  ('7d33c8c4-f48b-4316-81c1-1f38a8fd5af7', 'term', 'مبرهنة فيثاغورس', 4),
  ('7d33c8c4-f48b-4316-81c1-1f38a8fd5af7', 'symbol', 'دس/دن', 1),
  ('7d33c8c4-f48b-4316-81c1-1f38a8fd5af7', 'symbol', 'دص/دن', 2),
  ('7d33c8c4-f48b-4316-81c1-1f38a8fd5af7', 'symbol', 'دح/دن', 3),
  ('7d33c8c4-f48b-4316-81c1-1f38a8fd5af7', 'symbol', 'د نق/دن', 4),
  ('e7df4849-0cfd-4160-885d-5340085542bd', 'term', 'فترة مغلقة ومفتوحة', 1),
  ('e7df4849-0cfd-4160-885d-5340085542bd', 'term', 'الاتصال وقابلية الاشتقاق', 2),
  ('e7df4849-0cfd-4160-885d-5340085542bd', 'term', 'مماس أفقي', 3),
  ('e7df4849-0cfd-4160-885d-5340085542bd', 'symbol', 'ق''(جـ) = 0', 1),
  ('e7df4849-0cfd-4160-885d-5340085542bd', 'symbol', '[أ، ب]', 2),
  ('e7df4849-0cfd-4160-885d-5340085542bd', 'symbol', '(أ، ب)', 3),
  ('e7df4849-0cfd-4160-885d-5340085542bd', 'symbol', 'ق(ب) - ق(أ) / ب - أ', 4),
  ('11e0c0e5-a8c2-4b13-8c00-3e2937385bd3', 'term', 'القيم القصوى المحلية والمطلقة', 1),
  ('11e0c0e5-a8c2-4b13-8c00-3e2937385bd3', 'term', 'نقطة الانعطاف', 2),
  ('11e0c0e5-a8c2-4b13-8c00-3e2937385bd3', 'term', 'التقعر للأعلى والأسفل', 3),
  ('11e0c0e5-a8c2-4b13-8c00-3e2937385bd3', 'term', 'النقاط الحرجة', 4),
  ('11e0c0e5-a8c2-4b13-8c00-3e2937385bd3', 'symbol', 'ق''(س) = 0', 1),
  ('11e0c0e5-a8c2-4b13-8c00-3e2937385bd3', 'symbol', 'ق''''(س) > 0', 2),
  ('11e0c0e5-a8c2-4b13-8c00-3e2937385bd3', 'symbol', 'ق''''(س) < 0', 3),
  ('0f8728e0-ea8f-44b0-8d05-03aac7cd2ff8', 'term', 'التكامل غير المحدود', 1),
  ('0f8728e0-ea8f-44b0-8d05-03aac7cd2ff8', 'term', 'ثابت التكامل جـ', 2),
  ('0f8728e0-ea8f-44b0-8d05-03aac7cd2ff8', 'term', 'الاقتران البديل', 3),
  ('0f8728e0-ea8f-44b0-8d05-03aac7cd2ff8', 'symbol', '∫ ق(س) دس', 1),
  ('0f8728e0-ea8f-44b0-8d05-03aac7cd2ff8', 'symbol', 'س^(ن+1)/(ن+1) + جـ', 2),
  ('0f8728e0-ea8f-44b0-8d05-03aac7cd2ff8', 'symbol', 'هـ^(أس)', 3),
  ('0f8728e0-ea8f-44b0-8d05-03aac7cd2ff8', 'symbol', 'لو_هـ |س|', 4),
  ('b19cd7d2-10da-4ff7-8a5e-fa0a1107b553', 'term', 'حدود التكامل', 1),
  ('b19cd7d2-10da-4ff7-8a5e-fa0a1107b553', 'term', 'خاصية الإضافة', 2),
  ('b19cd7d2-10da-4ff7-8a5e-fa0a1107b553', 'term', 'مبرهنة الأساس في التفاضل والتكامل', 3),
  ('b19cd7d2-10da-4ff7-8a5e-fa0a1107b553', 'symbol', '[أ, ب]∫ ق(س) دس', 1),
  ('b19cd7d2-10da-4ff7-8a5e-fa0a1107b553', 'symbol', 'ت(ب) - ت(أ)', 2),
  ('1011a984-bbc2-4785-8b9a-a1648bb8ea77', 'term', 'التكامل بالتعويض', 1),
  ('1011a984-bbc2-4785-8b9a-a1648bb8ea77', 'term', 'التكامل بالأجزاء', 2),
  ('1011a984-bbc2-4785-8b9a-a1648bb8ea77', 'term', 'الكسور الجزئية', 3),
  ('1011a984-bbc2-4785-8b9a-a1648bb8ea77', 'symbol', '∫ هـ دك = هـ ك - ∫ ك دهـ', 1),
  ('1011a984-bbc2-4785-8b9a-a1648bb8ea77', 'symbol', 'ص = ع(س)', 2),
  ('1011a984-bbc2-4785-8b9a-a1648bb8ea77', 'symbol', 'دص = ع''(س) دس', 3),
  ('6327feb1-30f4-431d-86cd-d796ad420ec8', 'term', 'interpersonal', 1),
  ('6327feb1-30f4-431d-86cd-d796ad420ec8', 'term', 'non-verbal communication', 2),
  ('6327feb1-30f4-431d-86cd-d796ad420ec8', 'term', 'collocation', 3),
  ('6327feb1-30f4-431d-86cd-d796ad420ec8', 'term', 'rapport', 4),
  ('a91dcc89-b2b5-4105-8ac1-2b06bdadfe8f', 'term', 'tense consistency', 1),
  ('a91dcc89-b2b5-4105-8ac1-2b06bdadfe8f', 'term', 'aspect', 2),
  ('a91dcc89-b2b5-4105-8ac1-2b06bdadfe8f', 'term', 'since vs for', 3),
  ('a91dcc89-b2b5-4105-8ac1-2b06bdadfe8f', 'term', 'state verbs', 4),
  ('a91dcc89-b2b5-4105-8ac1-2b06bdadfe8f', 'symbol', 'has/have + P.P', 1),
  ('a91dcc89-b2b5-4105-8ac1-2b06bdadfe8f', 'symbol', 'has/have + been + V-ing', 2),
  ('83f20e9b-9abd-4b60-8c97-d4dd626e8f32', 'term', 'thesis statement', 1),
  ('83f20e9b-9abd-4b60-8c97-d4dd626e8f32', 'term', 'topic sentence', 2),
  ('83f20e9b-9abd-4b60-8c97-d4dd626e8f32', 'term', 'cohesive devices', 3),
  ('83f20e9b-9abd-4b60-8c97-d4dd626e8f32', 'term', 'counter-argument', 4),
  ('83f20e9b-9abd-4b60-8c97-d4dd626e8f32', 'symbol', '¶1 Intro, ¶2 Pro, ¶3 Con, ¶4 Conclusion', 1),
  ('36bee63b-096d-44e8-8fed-543c37a6649f', 'term', 'العدد الصحيح الموجب', 1),
  ('36bee63b-096d-44e8-8fed-543c37a6649f', 'term', 'العدد الصحيح السالب', 2),
  ('36bee63b-096d-44e8-8fed-543c37a6649f', 'term', 'الصفر', 3),
  ('36bee63b-096d-44e8-8fed-543c37a6649f', 'term', 'النظير الجمعي', 4),
  ('36bee63b-096d-44e8-8fed-543c37a6649f', 'symbol', '+', 1),
  ('36bee63b-096d-44e8-8fed-543c37a6649f', 'symbol', '-', 2),
  ('36bee63b-096d-44e8-8fed-543c37a6649f', 'symbol', 'ص⁺', 3),
  ('36bee63b-096d-44e8-8fed-543c37a6649f', 'symbol', 'ص⁻', 4),
  ('36bee63b-096d-44e8-8fed-543c37a6649f', 'symbol', 'خط الأعداد', 5),
  ('544498c6-274f-4532-8424-dadc2b96dbb1', 'term', 'القيمة المطلقة', 1),
  ('544498c6-274f-4532-8424-dadc2b96dbb1', 'term', 'الترتيب التصاعدي', 2),
  ('544498c6-274f-4532-8424-dadc2b96dbb1', 'term', 'الترتيب التنازلي', 3),
  ('544498c6-274f-4532-8424-dadc2b96dbb1', 'symbol', '|س|', 1),
  ('544498c6-274f-4532-8424-dadc2b96dbb1', 'symbol', '>', 2),
  ('544498c6-274f-4532-8424-dadc2b96dbb1', 'symbol', '<', 3),
  ('544498c6-274f-4532-8424-dadc2b96dbb1', 'symbol', '=', 4),
  ('c71ea7a7-b08e-40cf-88e3-2324da49adce', 'term', 'قاعدة الإشارات', 1),
  ('c71ea7a7-b08e-40cf-88e3-2324da49adce', 'term', 'المحايد الجمعي', 2),
  ('c71ea7a7-b08e-40cf-88e3-2324da49adce', 'term', 'النظير الجمعي', 3),
  ('c71ea7a7-b08e-40cf-88e3-2324da49adce', 'symbol', 'أ + (-ب)', 1),
  ('c71ea7a7-b08e-40cf-88e3-2324da49adce', 'symbol', '-(-س) = +س', 2),
  ('19fb1f5b-67e8-4dee-8117-2e26a7c90d6e', 'term', 'القطر', 1),
  ('19fb1f5b-67e8-4dee-8117-2e26a7c90d6e', 'term', 'نصف القطر', 2),
  ('19fb1f5b-67e8-4dee-8117-2e26a7c90d6e', 'term', 'محيط الدائرة', 3),
  ('19fb1f5b-67e8-4dee-8117-2e26a7c90d6e', 'term', 'مساحة الدائرة', 4),
  ('19fb1f5b-67e8-4dee-8117-2e26a7c90d6e', 'term', 'النسبة التقريبية باي', 5),
  ('19fb1f5b-67e8-4dee-8117-2e26a7c90d6e', 'symbol', 'نق', 1),
  ('19fb1f5b-67e8-4dee-8117-2e26a7c90d6e', 'symbol', 'ق', 2),
  ('19fb1f5b-67e8-4dee-8117-2e26a7c90d6e', 'symbol', 'ط (π) ≈ 3.14 أو 22/7', 3),
  ('19fb1f5b-67e8-4dee-8117-2e26a7c90d6e', 'symbol', 'محيط = 2 ط نق', 4),
  ('19fb1f5b-67e8-4dee-8117-2e26a7c90d6e', 'symbol', 'مساحة = ط نق²', 5),
  ('b1415ba0-f6de-402f-83a8-77a29c5ebf91', 'term', 'طول القاعدة', 1),
  ('b1415ba0-f6de-402f-83a8-77a29c5ebf91', 'term', 'الارتفاع المناظر', 2),
  ('b1415ba0-f6de-402f-83a8-77a29c5ebf91', 'term', 'متوازي الأضلاع', 3),
  ('b1415ba0-f6de-402f-83a8-77a29c5ebf91', 'symbol', 'م = ق × ع', 1),
  ('b1415ba0-f6de-402f-83a8-77a29c5ebf91', 'symbol', 'م = 1/2 × ق × ع', 2),
  ('7b09ddaf-558f-4d1d-8567-62dd3c4adbbe', 'term', 'المفتاح الأساسي', 1),
  ('7b09ddaf-558f-4d1d-8567-62dd3c4adbbe', 'term', 'السجل', 2),
  ('7b09ddaf-558f-4d1d-8567-62dd3c4adbbe', 'term', 'الحقل', 3),
  ('7b09ddaf-558f-4d1d-8567-62dd3c4adbbe', 'symbol', 'PK', 1),
  ('7b09ddaf-558f-4d1d-8567-62dd3c4adbbe', 'symbol', 'FK', 2);

-- مجموعات وطلاب المدرّس الخصوصي
insert into public.groups (id, organization_id, name, label, grade_id, subject_id, schedule, created_by) values
  ('cac5eca5-f100-4a0a-8108-da77911c6070', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'مجموعة الأحد والثلاثاء (علمي - أ)', 'توجيهي علمي', '008f353e-0464-41f1-8140-e7b95a0ce7f7', '9017601a-f326-4012-8d18-f54a2b7e1f6e', 'الأحد والثلاثاء 4:00 - 6:00 م', 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e'),
  ('f91dcc6b-de48-4a4b-8c18-ec8a741cc919', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'مجموعة الإثنين والأربعاء (علمي - ب)', 'توجيهي علمي', '008f353e-0464-41f1-8140-e7b95a0ce7f7', '9017601a-f326-4012-8d18-f54a2b7e1f6e', 'الإثنين والأربعاء 4:00 - 6:00 م', 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e'),
  ('beaec0ef-f36a-4191-87b6-6172fdd55641', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'مجموعة الخميس (صناعي)', 'توجيهي صناعي', '008f353e-0464-41f1-8140-e7b95a0ce7f7', '9017601a-f326-4012-8d18-f54a2b7e1f6e', 'الخميس 3:00 - 6:00 م', 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e'),
  ('3259a9a2-196d-4d92-838a-dcdd2b9a9d12', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'مجموعة السبت (مكثف متميزين)', 'توجيهي علمي', '008f353e-0464-41f1-8140-e7b95a0ce7f7', '9017601a-f326-4012-8d18-f54a2b7e1f6e', 'السبت 10:00 ص - 1:00 م', 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e');

insert into public.students (id, organization_id, full_name, student_code, parent_phone, student_phone, parent_whatsapp_consent) values
  ('0b5a417a-bb52-4a96-8f46-188a29509a3c', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'أحمد محمود المصري', '1042', '+970599000101', '+970599000201', true),
  ('ee373c3d-542a-4121-8f4d-cc04da471b80', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'محمود خليل البطش', '1043', '+970599000102', '+970599000202', true),
  ('2488172e-ab9a-4f73-842a-d1e057b5c392', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'سارة عبد الرحمن البردويل', '2011', '+970599000103', '+970599000203', true),
  ('19f25b9f-b89a-4393-85ca-2b2661d61f3c', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'مريم إياد النجار', '2012', '+970599000104', '+970599000204', true),
  ('ef1d4520-71be-4289-8f20-1db1c77df88e', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'عمر شريف قاسم', '3005', '+970599000105', '+970599000205', false),
  ('3d93238f-c5e6-45ef-812b-e0125eebc24b', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'يوسف هاني اليازجي', '4019', '+970599000106', '+970599000206', true),
  ('342a609d-9224-494f-8474-aa984f6f00fa', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'رزان كمال الدلو', '1044', '+970599000107', '+970599000207', true),
  ('8f3bf6d2-3cab-4415-8e3b-3f2b3864d5df', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'خليل سمير شعت', '3006', '+970599000108', '+970599000208', true);

insert into public.group_students (group_id, student_id, organization_id) values
  ('cac5eca5-f100-4a0a-8108-da77911c6070', '0b5a417a-bb52-4a96-8f46-188a29509a3c', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37'),
  ('cac5eca5-f100-4a0a-8108-da77911c6070', 'ee373c3d-542a-4121-8f4d-cc04da471b80', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37'),
  ('f91dcc6b-de48-4a4b-8c18-ec8a741cc919', '2488172e-ab9a-4f73-842a-d1e057b5c392', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37'),
  ('f91dcc6b-de48-4a4b-8c18-ec8a741cc919', '19f25b9f-b89a-4393-85ca-2b2661d61f3c', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37'),
  ('beaec0ef-f36a-4191-87b6-6172fdd55641', 'ef1d4520-71be-4289-8f20-1db1c77df88e', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37'),
  ('3259a9a2-196d-4d92-838a-dcdd2b9a9d12', '3d93238f-c5e6-45ef-812b-e0125eebc24b', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37'),
  ('cac5eca5-f100-4a0a-8108-da77911c6070', '342a609d-9224-494f-8474-aa984f6f00fa', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37'),
  ('beaec0ef-f36a-4191-87b6-6172fdd55641', '8f3bf6d2-3cab-4415-8e3b-3f2b3864d5df', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37');

insert into public.group_lesson_progress (group_id, organization_id, lesson_id, taught_at, marked_by) values
  ('cac5eca5-f100-4a0a-8108-da77911c6070', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'fa5a48fa-ada8-4d8a-86c8-45ebc6a6edd8', '2026-10-05T16:00:00Z', 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e'),
  ('cac5eca5-f100-4a0a-8108-da77911c6070', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'dbe27192-8ca7-42ba-8c39-3510ad95f421', '2026-10-12T16:00:00Z', 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e'),
  ('cac5eca5-f100-4a0a-8108-da77911c6070', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', '7d33c8c4-f48b-4316-81c1-1f38a8fd5af7', '2026-10-19T16:00:00Z', 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e');

-- شعب المدرسة ومعلموها
insert into public.groups (id, organization_id, name, label, grade_id, created_by) values
  ('4778b11f-44bf-4772-8843-a873f8080ba2', 'b10663fc-a4b4-4181-86f3-0f9799331018', 'الصف الأول الأساسي (أ)', 'الشعبة أ', null, '485c9183-1afc-47bd-82ce-b1a0f51c64b6'),
  ('a0d59771-a8aa-4a1f-8671-d5d7e6790cb2', 'b10663fc-a4b4-4181-86f3-0f9799331018', 'الصف الثاني الأساسي (أ)', 'الشعبة أ', null, '485c9183-1afc-47bd-82ce-b1a0f51c64b6'),
  ('887e22f9-c331-4283-8af1-23e77102f082', 'b10663fc-a4b4-4181-86f3-0f9799331018', 'الصف الثالث الأساسي (أ)', 'الشعبة أ', null, '485c9183-1afc-47bd-82ce-b1a0f51c64b6'),
  ('50773995-e594-470c-821d-7a765c5b9331', 'b10663fc-a4b4-4181-86f3-0f9799331018', 'الصف الرابع الأساسي (أ)', 'الشعبة أ', null, '485c9183-1afc-47bd-82ce-b1a0f51c64b6'),
  ('f3998f88-6c00-47f2-8df3-21c7210756cf', 'b10663fc-a4b4-4181-86f3-0f9799331018', 'الصف الخامس الأساسي (أ)', 'الشعبة أ', null, '485c9183-1afc-47bd-82ce-b1a0f51c64b6'),
  ('89efdb69-f444-4e9d-879c-c8effde7c2c4', 'b10663fc-a4b4-4181-86f3-0f9799331018', 'الصف السادس الأساسي (أ)', 'الشعبة أ', '8b61e5b7-86be-4916-8396-cefb73b6e3e7', '485c9183-1afc-47bd-82ce-b1a0f51c64b6'),
  ('804cd325-7365-4894-80c9-582e65276747', 'b10663fc-a4b4-4181-86f3-0f9799331018', 'الصف السابع الأساسي (أ)', 'الشعبة أ', null, '485c9183-1afc-47bd-82ce-b1a0f51c64b6'),
  ('3c7b2ac0-5004-4d57-890b-f23d06a05852', 'b10663fc-a4b4-4181-86f3-0f9799331018', 'الصف الثامن الأساسي (أ)', 'الشعبة أ', null, '485c9183-1afc-47bd-82ce-b1a0f51c64b6'),
  ('9143b193-f111-45a8-8e0e-3b09e5eec6dc', 'b10663fc-a4b4-4181-86f3-0f9799331018', 'الصف التاسع الأساسي (أ)', 'الشعبة أ', '2a1705e0-5bf2-43c0-8794-14a6092689b5', '485c9183-1afc-47bd-82ce-b1a0f51c64b6');

delete from public.group_teachers where organization_id = 'b10663fc-a4b4-4181-86f3-0f9799331018';

insert into public.group_teachers (group_id, organization_id, user_id) values
  ('f3998f88-6c00-47f2-8df3-21c7210756cf', 'b10663fc-a4b4-4181-86f3-0f9799331018', '4c26843b-d6f7-4d0f-89a8-b5f2f3551744'),
  ('89efdb69-f444-4e9d-879c-c8effde7c2c4', 'b10663fc-a4b4-4181-86f3-0f9799331018', '4c26843b-d6f7-4d0f-89a8-b5f2f3551744'),
  ('804cd325-7365-4894-80c9-582e65276747', 'b10663fc-a4b4-4181-86f3-0f9799331018', '09487d0a-96dc-421b-85c7-80cf154f4a84'),
  ('3c7b2ac0-5004-4d57-890b-f23d06a05852', 'b10663fc-a4b4-4181-86f3-0f9799331018', '0f00b8f6-b32c-4cc6-82d6-8f7fbc3d201d'),
  ('9143b193-f111-45a8-8e0e-3b09e5eec6dc', 'b10663fc-a4b4-4181-86f3-0f9799331018', '0f00b8f6-b32c-4cc6-82d6-8f7fbc3d201d');

insert into public.group_teachers (group_id, organization_id, user_id) values
  ('9143b193-f111-45a8-8e0e-3b09e5eec6dc', 'b10663fc-a4b4-4181-86f3-0f9799331018', 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e');

insert into public.students (id, organization_id, full_name, student_code, parent_phone, parent_whatsapp_consent) values
  ('75cc9ed8-0863-43ec-8025-945422ec8868', 'b10663fc-a4b4-4181-86f3-0f9799331018', 'ليان أحمد عودة', '5101', '+970599000301', true),
  ('09bae3af-a3cd-4a26-879e-c8cbf212924f', 'b10663fc-a4b4-4181-86f3-0f9799331018', 'آدم سامي الحلو', '5102', '+970599000302', true),
  ('61b31bce-05f5-4bee-862c-bc0e50a22f90', 'b10663fc-a4b4-4181-86f3-0f9799331018', 'جود محمد أبو شعبان', '5103', '+970599000303', true),
  ('8c70ace2-8896-4ef9-888f-0298e11c6e94', 'b10663fc-a4b4-4181-86f3-0f9799331018', 'كريم وائل السقا', '5104', '+970599000304', true);

insert into public.group_students (group_id, student_id, organization_id) values
  ('89efdb69-f444-4e9d-879c-c8effde7c2c4', '75cc9ed8-0863-43ec-8025-945422ec8868', 'b10663fc-a4b4-4181-86f3-0f9799331018'),
  ('89efdb69-f444-4e9d-879c-c8effde7c2c4', '09bae3af-a3cd-4a26-879e-c8cbf212924f', 'b10663fc-a4b4-4181-86f3-0f9799331018'),
  ('9143b193-f111-45a8-8e0e-3b09e5eec6dc', '61b31bce-05f5-4bee-862c-bc0e50a22f90', 'b10663fc-a4b4-4181-86f3-0f9799331018'),
  ('3c7b2ac0-5004-4d57-890b-f23d06a05852', '8c70ace2-8896-4ef9-888f-0298e11c6e94', 'b10663fc-a4b4-4181-86f3-0f9799331018');

-- الواجبات والامتحانات
insert into public.assessments (id, organization_id, group_id, subject_id, title, kind, scheduled_on, status, submission_mode, submission_open, auto_send_reports, created_by) values
  ('d551edb9-e5a0-493c-8826-0650045af756', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'cac5eca5-f100-4a0a-8108-da77911c6070', '9017601a-f326-4012-8d18-f54a2b7e1f6e', 'امتحان التفاضل وقواعد الاشتقاق المتقدمة (الشهر الأول)', 'exam', '2026-11-03', 'needs_review', 'teacher_scan', false, false, 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e'),
  ('2291b58c-07ab-474b-8b37-711bf00f1e7b', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'f91dcc6b-de48-4a4b-8c18-ec8a741cc919', '9017601a-f326-4012-8d18-f54a2b7e1f6e', 'واجب منزلي: الاشتقاق الضمني والمعادلات الوسيطية', 'homework', '2026-11-01', 'completed', 'link', false, true, 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e'),
  ('4c9ebb73-d4da-42f1-8294-d997c0eb10c1', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'beaec0ef-f36a-4191-87b6-6172fdd55641', '9017601a-f326-4012-8d18-f54a2b7e1f6e', 'اختبار قصير: نهايات الاقترانات الدائرية', 'exam', '2026-10-28', 'reports_sent', 'teacher_scan', false, true, 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e'),
  ('79ab9673-71bf-4731-86c4-12cf6b9860cf', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', '3259a9a2-196d-4d92-838a-dcdd2b9a9d12', '9017601a-f326-4012-8d18-f54a2b7e1f6e', 'امتحان نصف الفصل الأول - الحساب التفاضلي الشامل', 'exam', '2026-11-10', 'awaiting_papers', 'teacher_scan', false, false, 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e');

insert into public.questions (id, assessment_id, number, text, type, max_score, model_answer, lesson_id) values
  ('9fcf775b-6757-4556-800c-5d283d986b99', 'd551edb9-e5a0-493c-8826-0650045af756', 1, 'إذا كان س² + ص² = 25، أوجد د²ص / دس² عند النقطة (3, 4).', 'problem_solving', 20, 'المشتقة الأولى: 2س + 2ص(ص'') = 0 => ص'' = -س / ص = -3/4. المشتقة الثانية: ص'''' = (-1 * ص - (-س) * ص'') / ص² = (-ص + س * (-س/ص)) / ص² = (-ص² - س²) / ص³ = -25 / 64.', 'fa5a48fa-ada8-4d8a-86c8-45ebc6a6edd8'),
  ('b88b55e7-c9bd-4d75-80b6-348a9f8877fb', 'd551edb9-e5a0-493c-8826-0650045af756', 2, 'أثبت أن المماس للمنحنى ص = هـ^(2س) عند س = 0 يقطع محور الصادات عند النقطة (0, 1).', 'problem_solving', 15, 'عند س = 0، ص = هـ^0 = 1. النقطة (0, 1). ص'' = 2 هـ^(2س)، عند س = 0 الميل م = 2. معادلة المماس: ص - 1 = 2(س - 0) => ص = 2س + 1. المقطع الصادي: س = 0 => ص = 1 وهو المطلوب.', 'dbe27192-8ca7-42ba-8c39-3510ad95f421');

insert into public.rubric_criteria (question_id, description, points, sort_order) values
  ('9fcf775b-6757-4556-800c-5d283d986b99', 'إجراء الاشتقاق الضمني الأول الصحيح (2س + 2ص ص'' = 0)', 6, 1),
  ('9fcf775b-6757-4556-800c-5d283d986b99', 'إيجاد قيمة المشتقة الأولى عند (3, 4) وتساوي -3/4', 4, 2),
  ('9fcf775b-6757-4556-800c-5d283d986b99', 'تطبيق قاعدة قسمة اقترانين للمشتقة الثانية والتعويض الصحيح', 7, 3),
  ('9fcf775b-6757-4556-800c-5d283d986b99', 'الناتج النهائي المبسط (-25 / 64)', 3, 4),
  ('b88b55e7-c9bd-4d75-80b6-348a9f8877fb', 'حساب نقطة التماس (0, 1)', 4, 1),
  ('b88b55e7-c9bd-4d75-80b6-348a9f8877fb', 'اشتقاق الاقتران الأسي وحساب ميل المماس م = 2', 6, 2),
  ('b88b55e7-c9bd-4d75-80b6-348a9f8877fb', 'كتابة معادلة المماس والتحقق من نقطة التقاطع', 5, 3);

-- التسليمات والدرجات (امتحان ex1)
insert into public.submissions (id, organization_id, assessment_id, student_id, source, status, submitted_at, graded_at) values
  ('f1cd5045-a161-44d3-80a0-b5991386e30b', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'd551edb9-e5a0-493c-8826-0650045af756', 'ee373c3d-542a-4121-8f4d-cc04da471b80', 'teacher_scan', 'uploaded', '2026-11-03T18:00:00Z', '2026-11-03T18:05:00Z'),
  ('26fe6b4b-1e4c-4ce1-8e1b-d128668d3f60', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'd551edb9-e5a0-493c-8826-0650045af756', '0b5a417a-bb52-4a96-8f46-188a29509a3c', 'teacher_scan', 'uploaded', '2026-11-03T18:00:00Z', '2026-11-03T18:05:00Z'),
  ('204d7c9e-ff7c-46ae-86c3-e668a5e768b8', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'd551edb9-e5a0-493c-8826-0650045af756', '342a609d-9224-494f-8474-aa984f6f00fa', 'teacher_scan', 'uploaded', '2026-11-03T18:00:00Z', '2026-11-03T18:05:00Z');

insert into public.submission_pages (submission_id, organization_id, page_number, storage_path) values
  ('f1cd5045-a161-44d3-80a0-b5991386e30b', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 1, '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37/d551edb9-e5a0-493c-8826-0650045af756/f1cd5045-a161-44d3-80a0-b5991386e30b/1.jpg'),
  ('26fe6b4b-1e4c-4ce1-8e1b-d128668d3f60', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 1, '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37/d551edb9-e5a0-493c-8826-0650045af756/26fe6b4b-1e4c-4ce1-8e1b-d128668d3f60/1.jpg'),
  ('204d7c9e-ff7c-46ae-86c3-e668a5e768b8', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 1, '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37/d551edb9-e5a0-493c-8826-0650045af756/204d7c9e-ff7c-46ae-86c3-e668a5e768b8/1.jpg');

insert into public.question_grades (submission_id, organization_id, question_id, ai_score, ai_reason, ai_transcription, ai_confidence, ai_criteria, ai_model, graded_at, teacher_note) values
  ('f1cd5045-a161-44d3-80a0-b5991386e30b', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', '9fcf775b-6757-4556-800c-5d283d986b99', 14, 'الناتج النهائي المبسط (-25 / 64) - أخطأ في توحيد المقامات البسط', '2س + 2ص ص'' = 0
ص'' = -س / ص = -3 / 4
ص'''' = (-ص - س ص'') / ص²
= (-4 - 3(-3/4)) / 16
= (-4 + 9/4) / 16 = (-7/4) / 16 = -7 / 64', 0.75, '[{"criterion":"إجراء الاشتقاق الضمني الأول الصحيح (2س + 2ص ص'' = 0)","met":true,"points":6},{"criterion":"إيجاد قيمة المشتقة الأولى (-3/4)","met":true,"points":4},{"criterion":"تطبيق قاعدة قسمة اقترانين للمشتقة الثانية","met":true,"points":4},{"criterion":"الناتج النهائي المبسط (-25 / 64) - أخطأ في توحيد المقامات البسط","met":false,"points":0}]'::jsonb, 'seed-demo', '2026-11-03T18:05:00Z', 'خطأ حسابي في تبسيط البسط: -4 + 9/4 = -7/4 وليس التعويض بالمعادلة الأصلية س² + ص² = 25'),
  ('26fe6b4b-1e4c-4ce1-8e1b-d128668d3f60', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', '9fcf775b-6757-4556-800c-5d283d986b99', 20, 'الحل مكتمل ويحقق كل المعايير', '2س + 2ص(ص'') = 0  =>  ص'' = -س/ص = -3/4
ص'''' = (-ص - س ص'') / ص²
نضرب البسط والمقام في ص:
ص'''' = (-ص² - س(ص ص'')) / ص³ ... س² + ص² = 25
= -25 / 64', 0.95, '[{"criterion":"إجراء الاشتقاق الضمني الأول الصحيح","met":true,"points":6},{"criterion":"إيجاد قيمة المشتقة الأولى (-3/4)","met":true,"points":4},{"criterion":"تطبيق المشتقة الثانية بالتعويض بالمعادلة س²+ص²=25","met":true,"points":7},{"criterion":"الناتج النهائي المبسط (-25 / 64)","met":true,"points":3}]'::jsonb, 'seed-demo', '2026-11-03T18:05:00Z', 'حل نموذجي ومتقن بارك الله فيك!'),
  ('204d7c9e-ff7c-46ae-86c3-e668a5e768b8', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'b88b55e7-c9bd-4d75-80b6-348a9f8877fb', 7, 'اشتقاق الاقتران الأسي وحساب ميل المماس (نسي ضرب مشتقة الأس 2)', 'ص'' = هـ^(2س)
عند س = 0 => ص'' = 1
المعادلة ص - 1 = 1(س - 0) => ص = س + 1
عند س = 0 => ص = 1', 0.45, '[{"criterion":"حساب نقطة التماس (0, 1)","met":true,"points":4},{"criterion":"اشتقاق الاقتران الأسي وحساب ميل المماس (نسي ضرب مشتقة الأس 2)","met":false,"points":0},{"criterion":"كتابة معادلة المماس والتعويض","met":true,"points":3}]'::jsonb, 'seed-demo', '2026-11-03T18:05:00Z', 'انتبه! مشتقة هـ^(2س) هي 2 هـ^(2س) (قاعدة السلسلة)، لا تنسَ مشتقة الأس!');

-- نتصرّف هنا كأننا المدرّس من المتصفح حتى تُطبَّق نفس القواعد (الصلاحيات وسجل التعديلات).
select set_config('request.jwt.claims', '{"sub":"d45dfdfe-111f-4a8d-8871-0d0ab1784d3e","role":"authenticated"}', false);
set role authenticated;
update public.question_grades set final_score = 8, teacher_note = 'أعطيتك علامة إضافية على ترتيب الخطوات، لكن انتبه لقاعدة السلسلة'
  where submission_id = '204d7c9e-ff7c-46ae-86c3-e668a5e768b8';
update public.submissions set status = 'needs_review' where id in ('f1cd5045-a161-44d3-80a0-b5991386e30b', '204d7c9e-ff7c-46ae-86c3-e668a5e768b8');
update public.submissions set status = 'approved' where id = '26fe6b4b-1e4c-4ce1-8e1b-d128668d3f60';
reset role;
select set_config('request.jwt.claims', '', false);

insert into public.reports (organization_id, student_id, submission_id, kind, recipient_phone, body, status, created_by) values
  ('2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', '0b5a417a-bb52-4a96-8f46-188a29509a3c', '26fe6b4b-1e4c-4ce1-8e1b-d128668d3f60', 'assessment_result', '+970599000101', 'حصل أحمد على 20 من 20 في السؤال الأول من امتحان التفاضل. أداء ممتاز!', 'draft', 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e');

-- باقات إضافية من البيانات الوهمية (للعرض في لوحة مدير المنصة)
insert into public.subscription_plans (slug, name, target, billing_cycle, price_per_student, min_students, installments, features, is_active, is_popular, notes, sort_order) values
  ('plan_school_basic', 'باقة المدارس الخاصة (الصفوف 1 - 9)', 'schools', 'yearly', 40, 80, 2, '["تغطية شاملة لكل مواد التعليم الأساسي (عربي، رياضيات، علوم، إنجليزي، دين)","عقد سنوي يدفع على قسطين (بداية الفصل الأول وبداية الفصل الثاني)","لوحة قياس الفاقد التعليمي ومقارنة أداء الشعب","حسابات غير محدودة لمعلمي المدرسة مع حجب الفواتير عنهم","شعار واسم المدرسة على جميع الأوراق والتقارير بدعم دقة","أولوية معالجة الخوادم ودعم تقني مخصص للمدرسة"]'::jsonb, true, true, 'الخيار المعتمد لمدارس التعليم الأساسي الخاصة', 10),
  ('plan_relief_initiative', 'باقة الإسناد لمدارس ومراكز غزة المتضررة', 'enterprise', 'yearly', 0, null, 2, '["استخدام مجاني بالكامل بدون أي رسوم","تغطية تكاليف الذكاء الاصطناعي بدعم من منصة دقة","مساندة مراكز الإيواء والمخيمات التعليمية البديلة"]'::jsonb, true, false, 'مبادرة دعم التعليم المستمر في فلسطين', 11)
on conflict (slug) do nothing;

-- الاشتراكات والفواتير (نحذف الاشتراكات التجريبية التلقائية ونضع اشتراكات معروفة)
delete from public.subscriptions;
insert into public.subscriptions (id, organization_id, plan_id, status, price_per_student, started_on, current_period_start, current_period_end)
select 'b0357e0b-7bb8-42cd-82fd-3c2a20fcf2ac', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', id, 'active', 5, '2026-09-01', '2026-11-01', '2026-11-30' from public.subscription_plans where slug = 'teacher_monthly';
insert into public.subscriptions (id, organization_id, plan_id, status, price_per_student, started_on, current_period_start, current_period_end)
select 'a091e8b4-f1e1-4758-8639-880aa1f4662d', 'b10663fc-a4b4-4181-86f3-0f9799331018', id, 'active', 50, '2026-09-01', '2026-09-01', '2027-06-30' from public.subscription_plans where slug = 'school_yearly';
insert into public.subscriptions (id, organization_id, plan_id, status, price_per_student, started_on, current_period_start, current_period_end)
select 'f2af55c6-2232-4d59-8746-a9ae302b91f6', '51b38bc2-9779-44e1-8ae7-4c51e697f45f', id, 'trial', 45, '2026-10-15', '2026-10-15', '2026-11-15' from public.subscription_plans where slug = 'school_yearly';

insert into public.invoices (id, organization_id, subscription_id, number, period_start, period_end, installment_no, active_students, price_per_student, amount, status, due_on) values
  ('0eb52ab8-ac01-43ac-89c6-b2447b79b83b', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'b0357e0b-7bb8-42cd-82fd-3c2a20fcf2ac', 'INV-2026-0101', '2026-10-01', '2026-10-31', 1, 180, 5, 900, 'issued', '2026-10-15'),
  ('13c8e53d-dd3e-495c-8e3c-4433f8dd0cac', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'b0357e0b-7bb8-42cd-82fd-3c2a20fcf2ac', 'INV-2026-0102', '2026-11-01', '2026-11-30', 1, 180, 5, 900, 'issued', '2026-11-15'),
  ('c7973af3-8875-4682-8863-5eb10763014e', 'b10663fc-a4b4-4181-86f3-0f9799331018', 'a091e8b4-f1e1-4758-8639-880aa1f4662d', 'INV-2026-0201', '2026-09-01', '2027-01-31', 1, 280, 50, 7000, 'issued', '2026-09-15');

insert into public.payment_receipts (invoice_id, organization_id, method, amount, reference, storage_path, uploaded_by) values
  ('0eb52ab8-ac01-43ac-89c6-b2447b79b83b', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'e_wallet', 900, 'JAWWAL-PAY-778812', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37/0eb52ab8-ac01-43ac-89c6-b2447b79b83b/receipt.jpg', 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e'),
  ('c7973af3-8875-4682-8863-5eb10763014e', 'b10663fc-a4b4-4181-86f3-0f9799331018', 'bank_transfer', 7000, 'BOP-TRX-55120', 'b10663fc-a4b4-4181-86f3-0f9799331018/c7973af3-8875-4682-8863-5eb10763014e/receipt.pdf', '485c9183-1afc-47bd-82ce-b1a0f51c64b6');

update public.payment_receipts set status = 'confirmed', review_note = 'تم التأكد من الحوالة'
  where invoice_id in ('0eb52ab8-ac01-43ac-89c6-b2447b79b83b', 'c7973af3-8875-4682-8863-5eb10763014e');

-- رسوم الطلاب (شهر نوفمبر 2026)
insert into public.tuition_charges (id, organization_id, student_id, period_month, amount_due, notes) values
  ('860edcc0-a5f7-4e2a-8fd8-bc2313913f9f', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', '0b5a417a-bb52-4a96-8f46-188a29509a3c', '2026-11-01', 150, 'تم الدفع نقداً في الجلسة'),
  ('e51ec067-357b-44e3-8ed1-7079943e94ea', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'ee373c3d-542a-4121-8f4d-cc04da471b80', '2026-11-01', 150, 'تحويل جوال باي'),
  ('2e22aadb-dbe7-41e7-8e6f-19248efe6ae1', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', '2488172e-ab9a-4f73-842a-d1e057b5c392', '2026-11-01', 150, 'مسدد بالكامل'),
  ('cc550231-1cf1-4d89-8d83-e2b21f3dd0e3', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', '19f25b9f-b89a-4393-85ca-2b2661d61f3c', '2026-11-01', 150, 'سددت النصف ومتبقي 75 شيكل نهاية الأسبوع'),
  ('0e1dfda1-e5fc-4b4a-80a2-c4f261d5951b', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'ef1d4520-71be-4289-8f20-1db1c77df88e', '2026-11-01', 150, 'متأخر قسط شهر نوفمبر - تم إرسال تذكير واتساب'),
  ('697d2e5a-b335-4778-8936-38b4eac39518', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', '3d93238f-c5e6-45ef-812b-e0125eebc24b', '2026-11-01', 200, 'مجموعة المكثف - مسدد كامل'),
  ('58eb4ccb-eaad-46b2-8716-a73a27ff1929', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', '342a609d-9224-494f-8474-aa984f6f00fa', '2026-11-01', 150, null),
  ('1f198d13-b50e-47e2-85aa-b2eec9bfda8b', '2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', '8f3bf6d2-3cab-4415-8e3b-3f2b3864d5df', '2026-11-01', 150, 'متبقي قسط نوفمبر كاملاً');

insert into public.tuition_payments (organization_id, student_id, charge_id, amount, paid_on, method, receipt_number, recorded_by) values
  ('2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', '0b5a417a-bb52-4a96-8f46-188a29509a3c', '860edcc0-a5f7-4e2a-8fd8-bc2313913f9f', 150, '2026-11-02', 'نقداً', 'REC-2026-1042', 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e'),
  ('2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', 'ee373c3d-542a-4121-8f4d-cc04da471b80', 'e51ec067-357b-44e3-8ed1-7079943e94ea', 150, '2026-11-03', 'جوال باي', 'REC-2026-1043', 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e'),
  ('2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', '2488172e-ab9a-4f73-842a-d1e057b5c392', '2e22aadb-dbe7-41e7-8e6f-19248efe6ae1', 150, '2026-11-01', 'نقداً', 'REC-2026-2011', 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e'),
  ('2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', '19f25b9f-b89a-4393-85ca-2b2661d61f3c', 'cc550231-1cf1-4d89-8d83-e2b21f3dd0e3', 75, '2026-10-28', 'نقداً', 'REC-2026-2012', 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e'),
  ('2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', '3d93238f-c5e6-45ef-812b-e0125eebc24b', '697d2e5a-b335-4778-8936-38b4eac39518', 200, '2026-10-30', 'نقداً', 'REC-2026-4019', 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e'),
  ('2cca55e7-c01f-4b73-861a-ac3e5b0c2f37', '342a609d-9224-494f-8474-aa984f6f00fa', '58eb4ccb-eaad-46b2-8716-a73a27ff1929', 150, '2026-11-04', 'نقداً', 'REC-2026-1044', 'd45dfdfe-111f-4a8d-8871-0d0ab1784d3e');

-- محتوى الصفحة التعريفية (كان محفوظاً في المتصفح فقط)
insert into public.platform_settings (key, value, is_public) values
  ('landing_page', '{"hero":{"announcementBadge":"المنصة التعليمية العامة لكل مدرّس ومدرسة ومركز تعليمي · لأي صف وأي مادة","headline":"صحّح واجبات وامتحانات طلابك في دقائق","subheadline":"منظومة تصحيح وتقييم ذكية مصممة لكافة المراحل الدراسية والمناهج. تصحيح فوري لخط اليد، رصد دقيق للفاقد التعليمي، ومتابعة درجات الطلاب مع إرسال تقارير واتساب احترافية للأهالي بنقرة واحدة.","primaryCtaText":"ابدأ الآن مجاناً","secondaryCtaText":"لمن دِقّـة؟","sampleExamTitle":"امتحان الرياضيات - سؤال 1 (الاشتقاق الضمني)","sampleStudentName":"أحمد محمود المصري","sampleExamScore":"20 / 20","sampleTeacherNote":"تطبيق متقن لمعايير الاشتقاق والتعويض الدقيق"},"whoIsItFor":{"sectionBadge":"الفئات المستهدفة والشراكات","sectionTitle":"لمن صُممت منصة دِقّـة؟","sectionSubtitle":"دقة منصة مرنة مصممة لتخدم ثلاثة مستويات تعليمية بأعلى كفاءة","tutor":{"title":"المدرّس الخصوصي والمستقل","subtitle":"للمعلمين أصحاب المجموعات الخاصة والدورات ودروس التقوية.","exampleTitle":"مثال تطبيقي:","exampleText":"مدرّسو الثانوية العامة (التوجيهي) الذين يصححون أسبوعياً مئات الأوراق ويحتاجون متابعة دقيقة لدرجات كل طالب وتحصيل رسوم الجلسات الشهرية.","features":["مجموعات وصفوف غير محدودة","فوترة مرنة: 5 ₪ شهرياً لكل طالب نشط فقط","إرسال تقارير واتساب فردية للأهالي"],"buttonText":"ابدأ كمعلم مستقل ←"},"school":{"title":"المدرسة (الخاصة والحكومية)","subtitle":"لإدارات المدارس والمشرفين التربويين ورؤساء الأقسام لمراقبة الجودة.","exampleTitle":"مثال تطبيقي:","exampleText":"المدارس الخاصة للمرحلة الأساسية (الصفوف 1 - 9) لمتابعة الفاقد التعليمي واختبارات الشعب في كافة المواد، وجدول حراري يكشف أضعف المهارات فوراً.","features":["إدارة طاقم المعلمين وربط الشعب الدراسية","عقد سنوي: 50 ₪ لكل طالب (بدفعتين فصليتين)","الأوراق والتقارير تحمل اسم المدرسة وشعارها «بدعم دقة»"],"buttonText":"سجّل مدرستك واحجز مكالمة تجهيز ←"},"center":{"title":"المركز التعليمي والمعهد","subtitle":"للمعاهد الأكاديمية والمراكز الثقافية التي تضم معلمين متعددين ومئات الطلاب.","exampleTitle":"مثال تطبيقي:","exampleText":"مراكز التقوية والدورات المسائية للمناهج المتنوعة مع فرز الطلاب حسب المستويات وشعب المواد المختلفة.","features":["لوحة تحكم موحدة لإدارة الشعب والمعلمين","صلاحيات منفصلة للإدارة والمعلمين","توليد تقارير أداء مركزية مطبوعة ورقمية"],"buttonText":"ابدأ لمركزك التعليمي ←"}},"curricula":{"badge":"المناهج والصفوف الدراسية","title":"نظام عالمي يتكيف مع أي منهاج ومبحث","description":"«دقة» منصة عامة ومفتوحة لكافة المناهج الدراسية العربية والدولية، مع توفير كامل لمفردات ومخرجات التعلم.","palestineNotice":"المنهاج الفلسطيني متاح بالكامل الآن (الصفوف 1 - 12 لكافة المواد العلمية والأدبية).","upcomingNotice":"مناهج أخرى قادمة قريباً: المنهاج الأردني، السعودي، والمصري."},"howItWorks":{"sectionBadge":"آلية العمل البسيطة","sectionTitle":"كيف تعمل «دقة» في دقائق؟","sectionSubtitle":"دورة عمل متكاملة تبدأ من وضع الامتحان وحتى عودة الورقة المصححة ليد الطالب","steps":[{"num":"01","title":"أنشئ الواجب أو الامتحان","desc":"حدد المادة ومعايير توزيع الدرجات (قانون، تعويض، ناتج) أو ارفع نموذج الامتحان."},{"num":"02","title":"تسليم الأوراق بسهولة","desc":"يرفع الطلاب صور حلولهم برابط واتساب مباشر بدون تسجيل، أو يصورها المعلم بكاميرا الهاتف."},{"num":"03","title":"تصحيح ذكي مع ملاحظات","desc":"يقرأ الذكاء الاصطناعي الخطوات اليدوية ويضع علامات ✓ و ✗ وملاحظات توجيهية."},{"num":"04","title":"أوراق مصححة تعود للطالب","desc":"ترجع الورقة الأصلية محبرة بالقلم الأحمر والدرجة المستحقة مع نقاط التطوير."},{"num":"05","title":"إرسال تقارير واتساب","desc":"تقارير فورية لولي الأمر والمدرسة بضغطة زر مع رسالة صوتية مقروءة."},{"num":"06","title":"اسأل مساعدك الذكي","desc":"حلل أداء الطلاب وولد تمارين علاجية فورية لمن أخفق في أي مفهوم."}]},"features":{"sectionBadge":"قدرات المنصة","sectionTitle":"كل ما تحتاجه لإدارة التقييمات","sectionSubtitle":"أدوات صممت خصيصاً لتوفير 80% من وقت تصحيح الأوراق الورقية وتجهيز الاختبارات","items":[{"title":"تصحيح فوري فائق الدقة","desc":"يصحح الخطوات والمعادلات والقوانين والناتج النهائي بدقة تنافس لجان التوجيهي."},{"title":"تقارير واتساب تلقائية","desc":"تصل تقارير مفصلة لكل طالب وولي أمر ومدرسة فور اعتماد المعلم للدرجات."},{"title":"لوحات أداء ومتابعة","desc":"تحليل دقيق لأضعف 3 دروس في كل مجموعة ونسب إتقان المهارات والفاقد التعليمي."},{"title":"متابعة رسوم الطلاب","desc":"سجّل من دفع ومن تأخر، وأصدر سندات القبض، واعرف نسبة التحصيل الشهرية في مكان واحد."},{"title":"إنشاء واجبات وامتحانات","desc":"أنشئ امتحاناتك بنماذج وزارية متعددة ومعايير تفصيلية أو ولّدها بالذكاء الاصطناعي."},{"title":"مساعد ذكي خاص بمعلمك","desc":"اطرح أي سؤال صوتياً أو نصياً ليرفع الدرجات، يعطيك إحصائيات، أو يقترح تدريبات."}]},"faqs":{"sectionBadge":"الأسئلة الشائعة","sectionTitle":"كل ما تود معرفته عن منصة دِقّـة","sectionSubtitle":"إجابات على أكثر الأسئلة شيوعاً من المعلمين ومديري المدارس","items":[{"q":"هل تصحيح الذكاء الاصطناعي دقيق ومعتمد لمناهج التوجيهي؟","a":"نعم، نموذج «دقة» مدرّب خصيصاً على معايير تصحيح الثانوية العامة الفلسطينية وتوزيع العلامات المعتمد (علامتان للقانون، علامة للتعويض، علامة للناتج). بالإضافة إلى ذلك، لا تُعتمد أي درجة مشكوك فيها أو منخفضة الثقة إلا بمراجعة المعلم وموافقته."},{"q":"هل أحتاج إلى إنترنت قوي وسريع لاستخدام المنصة؟","a":"إطلاقاً! المنصة مصممة خصيصاً لظروف قطاع غزة وفلسطين. الصفحات خفيفة للغاية، وعند رفع الأوراق أو تسليمها تعمل ميزة الحفظ المحلي؛ وفي حال انقطاع الإنترنت تُحفظ الأوراق وترفع تلقائياً فور عودة الاتصال."},{"q":"هل يحتاج الطالب إلى تحميل تطبيق أو فتح حساب؟","a":"كلا، الطالب لا يحتاج أي حساب أو كلمة مرور أو ربط بجوجل كلاسروم. يصله رابط تسليم مباشر في مجموعة واتساب، يختار اسمه ويلتقط صورة ورقته ويرسلها بلمسة واحدة."},{"q":"ما هي المواد التي تدعمها منصة دقة حالياً؟","a":"تدعم المنصة حالياً المواد العلمية والأدبية الأهم: الرياضيات (العلمي والأدبي والصناعي)، الفيزياء، الكيمياء، واللغة الإنجليزية (بما فيها تصحيح مواضيع التعبير Writing وتصنيف الأخطاء لقواعد وإملاء ومفردات)."}]},"ctaBanner":{"title":"جاهز لتوفير 15 ساعة تصحيح أسبوعياً؟","subtitle":"انضم لمئات المعلمين والمدارس الذين وثقوا بـ «دقة» لتصحيح امتحاناتهم","buttonText":"ابدأ تجربتك المجانية الآن ←"},"footer":{"copyright":"© 2026 منصة دقة (DEQUA). جميع الحقوق محفوظة.","contactPhone":"+970 599 123 456","contactEmail":"support@dequa.edu.ps","whatsappNumber":"+970 599 123 456"},"sectionVisibility":{"hero":true,"whoIsItFor":true,"curricula":true,"howItWorks":true,"features":true,"faqs":true,"ctaBanner":true}}'::jsonb, true)
on conflict (key) do nothing;
