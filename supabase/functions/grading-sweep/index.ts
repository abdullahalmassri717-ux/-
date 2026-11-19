// Re-grades papers that got stuck (teacher closed the page mid-grading, or the
// AI failed for a moment). Called every 10 minutes by the database's own
// schedule (migration 20261119000100_grading_sweep.sql) with the internal
// token that lives only inside the database. Each paper gets at most 3
// automatic tries.
import { adminClient, env, json, logFunctionError, runInBackground } from '../_shared/http.ts';
import { gradeSubmission } from '../_shared/gradeSubmission.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const admin = adminClient();

  const token = req.headers.get('x-daqa-cron') ?? '';
  const { data: ok } = await admin.rpc('check_weekly_reports_token', { p_token: token });
  if (!token || ok !== true) return json({ error: 'Forbidden' }, 403);

  const { data, error } = await admin.rpc('claim_stuck_submissions', { p_limit: 10 });
  if (error) return json({ error: error.message }, 500);
  const ids = (data ?? []) as string[];

  // One after another, so a big backlog does not hit the AI all at once.
  runInBackground(
    (async () => {
      for (const id of ids) {
        try {
          const r = await gradeSubmission(admin, id, env());
          if (!r.ok) {
            console.warn('grading-sweep', id, r.error);
            // Refused before starting (e.g. no AI key): put it back as it was.
            if (r.status === 'uploaded') await admin.from('submissions').update({ status: 'uploaded' }).eq('id', id);
          }
        } catch (e) {
          console.error('grading-sweep', id, e);
          await logFunctionError(admin, 'grading-sweep', e);
        }
      }
    })(),
  );
  return json({ claimed: ids.length });
});
