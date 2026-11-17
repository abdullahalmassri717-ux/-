-- Time limit for the student submission link (/s/<code>).
-- The teacher sets when the link opens and when it closes. Outside that time the
-- link shows «انتهى وقت التسليم» (or «لم يبدأ بعد») and the server rejects uploads.
--   submission_opens_at  null = open from the moment the exam is saved
--   submission_closes_at null = no end time (older exams keep working as before)
-- The teacher can extend or reopen at any time by moving the closing time.
alter table public.assessments
  add column if not exists submission_opens_at  timestamptz,
  add column if not exists submission_closes_at timestamptz;

alter table public.assessments
  drop constraint if exists assessments_submission_window_check;
alter table public.assessments
  add constraint assessments_submission_window_check
  check (submission_opens_at is null or submission_closes_at is null or submission_closes_at > submission_opens_at);

comment on column public.assessments.submission_opens_at is
  'Student link accepts papers from this time (null = right away).';
comment on column public.assessments.submission_closes_at is
  'Student link stops accepting papers after this time (null = no limit). Teacher uploads are not affected.';
