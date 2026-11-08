import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import {
  ClaudeGradingProvider,
  GradingError,
  gradePaper,
  gradingConfigFromEnv,
  type GradePaperInput,
} from '../supabase/functions/_shared/grading/index.ts';

// Trial grading endpoint for `npm run dev` only.
//
// The Claude key stays on this machine's server process (read from
// .env.local) and never reaches the browser. In production this job moves to
// a Supabase Edge Function that also checks the teacher is signed in.

const MAX_BODY_BYTES = 20 * 1024 * 1024;

export function devGradingApi(env: Record<string, string | undefined>): Plugin {
  return {
    name: 'daqa-dev-grading-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/grade-paper', (req, res) => {
        void handle(req, res, env);
      });
    },
  };
}

async function handle(req: IncomingMessage, res: ServerResponse, env: Record<string, string | undefined>) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return send(res, 503, {
      error: 'لم يُضبط مفتاح Claude بعد. أضف ANTHROPIC_API_KEY إلى ملف .env.local ثم أعد تشغيل المنصة.',
      code: 'missing_key',
    });
  }

  let input: GradePaperInput;
  try {
    input = JSON.parse(await readBody(req)) as GradePaperInput;
  } catch {
    return send(res, 400, { error: 'الطلب غير صالح أو الصور كبيرة جداً.' });
  }

  try {
    const result = await gradePaper(new ClaudeGradingProvider(apiKey), gradingConfigFromEnv(env), input);
    console.log(
      `[grading] ${result.model} · ${result.totalScore}/${result.totalMaxScore} · $${result.totalCostUsd.toFixed(4)}` +
        (result.attempts.length > 1 ? ' · escalated' : ''),
    );
    send(res, 200, result);
  } catch (error) {
    if (error instanceof GradingError) {
      console.error('[grading]', error.message);
      return send(res, error.retryable ? 503 : 422, { error: error.userMessage });
    }
    console.error('[grading]', error);
    send(res, 500, { error: 'حدث خطأ غير متوقع أثناء التصحيح.' });
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}
