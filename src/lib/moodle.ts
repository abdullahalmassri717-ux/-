// Moodle grade export: read the class list a teacher downloads from Moodle,
// match it to دقة students by name, and build a CSV that Moodle's
// "Import grades → CSV file" accepts.
import type { MoodleIdKind, StudentRow } from '../data/types';

export interface MoodleUser {
  name: string;
  email: string;
  username: string;
  idnumber: string;
}

export const MOODLE_KIND_LABEL: Record<MoodleIdKind, { ar: string; moodle: string }> = {
  email: { ar: 'البريد الإلكتروني', moodle: 'Email address' },
  username: { ar: 'اسم المستخدم', moodle: 'Username' },
  idnumber: { ar: 'رقم الهوية', moodle: 'ID number' },
};

const clean = (s: string) => s.replace(/^﻿/, '').trim().toLowerCase();

/** Arabic-aware name key: drops diacritics/tatweel and unifies letter forms. */
export function nameKey(name: string): string {
  return name
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Finds the users in a Moodle export (participants list or gradebook, Arabic or English). */
export function parseMoodleUsers(rows: string[][]): MoodleUser[] {
  const headerIndex = rows.findIndex((r) => r.some((c) => /email|بريد|username|اسم المستخدم/i.test(c)));
  if (headerIndex < 0) throw new Error('ما لقينا عمود البريد الإلكتروني أو اسم المستخدم في الملف. تأكد إنه الملف اللي نزّلته من Moodle.');
  const head = rows[headerIndex].map(clean);
  const col = (re: RegExp) => head.findIndex((h) => re.test(h));
  const first = col(/^first ?name|الاسم الأول/);
  const last = col(/^(last ?name|surname)|اسم العائلة|الاسم الأخير|اللقب/);
  const full = col(/^(full ?name|name)$|الاسم الكامل|^الاسم$/);
  const email = col(/email|بريد/);
  const username = col(/username|اسم المستخدم/);
  const idnumber = col(/^id ?number|رقم الهوية|الرقم التعريفي/);
  if (first < 0 && full < 0) throw new Error('ما لقينا عمود الاسم في الملف.');
  const cell = (r: string[], i: number) => (i >= 0 ? String(r[i] ?? '').trim() : '');
  return rows
    .slice(headerIndex + 1)
    .map((r) => ({
      name: full >= 0 && cell(r, full) ? cell(r, full) : `${cell(r, first)} ${cell(r, last)}`.trim(),
      email: cell(r, email),
      username: cell(r, username),
      idnumber: cell(r, idnumber),
    }))
    .filter((u) => u.name && (u.email || u.username || u.idnumber));
}

/** The best field to identify users by: the one every user has, email first. */
export function pickKind(users: MoodleUser[]): MoodleIdKind | null {
  for (const k of ['email', 'username', 'idnumber'] as const) if (users.length && users.every((u) => u[k])) return k;
  for (const k of ['email', 'username', 'idnumber'] as const) if (users.some((u) => u[k])) return k;
  return null;
}

/**
 * Matches each student to one Moodle user: exact name first, then same first
 * and last word. Ambiguous or missing names stay unmatched for the teacher.
 */
export function matchStudents(students: StudentRow[], users: MoodleUser[]): Map<string, number> {
  const out = new Map<string, number>();
  const taken = new Set<number>();
  const keys = users.map((u) => nameKey(u.name));
  const tryMatch = (test: (sk: string, uk: string) => boolean) => {
    for (const s of students) {
      if (out.has(s.id)) continue;
      const sk = nameKey(s.name);
      const hits = keys.map((uk, i) => (!taken.has(i) && test(sk, uk) ? i : -1)).filter((i) => i >= 0);
      if (hits.length === 1) {
        out.set(s.id, hits[0]);
        taken.add(hits[0]);
      }
    }
  };
  tryMatch((a, b) => a === b);
  const ends = (k: string) => {
    const w = k.split(' ');
    return w.length > 1 ? `${w[0]}|${w[w.length - 1]}` : '';
  };
  tryMatch((a, b) => !!ends(a) && ends(a) === ends(b));
  return out;
}

/** CSV for Moodle's grade import: one identifier column and one grade column. */
export function buildGradeCsv(identifierHeader: string, gradeHeader: string, rows: { id: string; grade: number }[]): string {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return [[identifierHeader, gradeHeader], ...rows.map((r) => [r.id, r.grade])].map((r) => r.map(q).join(',')).join('\r\n');
}
