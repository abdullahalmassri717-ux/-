// Platform admin edits the curriculum tree: curriculum → grade → subject → unit →
// lesson (+ content, learning outcomes, terms and symbols). Teachers only read
// published subjects; the database allows writes to the platform admin only.
import { supabase } from '../lib/supabase';
import { CURRICULA_DATA } from '../mockData';

export interface CLesson {
  id: string;
  title: string;
  /** Lesson text. The tree loads without it (it can be large): use getLessonContent. */
  content: string;
  hasContent: boolean;
  outcomes: string[];
  terms: string[];
  symbols: string[];
}
export interface CUnit {
  id: string;
  title: string;
  lessons: CLesson[];
}
export interface CSubject {
  id: string;
  name: string;
  status: 'draft' | 'published';
  units: CUnit[];
}
export interface CGrade {
  id: string;
  name: string;
  subjects: CSubject[];
}
export interface CCurriculum {
  id: string;
  name: string;
  country: string;
  isAvailable: boolean;
  grades: CGrade[];
}

export type Level = 'curriculum' | 'grade' | 'subject' | 'unit' | 'lesson';

export interface CurriculumAdminApi {
  load(): Promise<CCurriculum[]>;
  /** Adds a child under parentId (null for a new curriculum). Returns the new id. */
  add(level: Level, parentId: string | null, name: string, order: number): Promise<string>;
  rename(level: Level, id: string, name: string): Promise<void>;
  remove(level: Level, id: string): Promise<void>;
  setSubjectStatus(id: string, status: 'draft' | 'published'): Promise<void>;
  setCurriculumAvailable(id: string, available: boolean): Promise<void>;
  saveLesson(lesson: CLesson): Promise<void>;
  /** Bulk add for the import: returns the new ids in the same order as `rows`. */
  addMany(level: Exclude<Level, 'curriculum'>, rows: { parentId: string; name: string; order: number; content?: string }[]): Promise<string[]>;
  addOutcomes(rows: { lessonId: string; text: string; order: number }[]): Promise<void>;
  setLessonContent(lessonId: string, content: string): Promise<void>;
  getLessonContent(lessonId: string): Promise<string>;
}

const TABLE: Record<Level, { table: string; nameCol: string; parentCol: string | null }> = {
  curriculum: { table: 'curricula', nameCol: 'name', parentCol: null },
  grade: { table: 'grades', nameCol: 'name', parentCol: 'curriculum_id' },
  subject: { table: 'subjects', nameCol: 'name', parentCol: 'grade_id' },
  unit: { table: 'units', nameCol: 'title', parentCol: 'subject_id' },
  lesson: { table: 'lessons', nameCol: 'title', parentCol: 'unit_id' },
};

class CurriculumError extends Error {}
const fail = (e: { message?: string; code?: string } | null, fallback: string): never => {
  const msg = e?.message ?? '';
  if (e?.code === '23503') throw new CurriculumError('لا يمكن الحذف: هناك مجموعات أو امتحانات مرتبطة بهذا العنصر.');
  throw new CurriculumError(/[؀-ۿ]/.test(msg) ? msg : fallback);
};

const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

function realApi(): CurriculumAdminApi {
  const db = supabase!;
  return {
    async load() {
      const { data, error } = await db
        .from('curricula')
        .select(
          'id, name, country, is_available, sort_order, grades(id, name, sort_order, subjects(id, name, status, sort_order, units(id, title, sort_order, lessons(id, title, sort_order, learning_outcomes(text, sort_order), lesson_terms(kind, text, sort_order)))))',
        )
        .order('sort_order');
      if (error) fail(error, 'تعذّر تحميل المناهج.');
      // Which lessons have text, without downloading the text itself (paged: the API returns at most 1000 rows).
      const withContent = new Set<string>();
      for (let from = 0; ; from += 1000) {
        const page = await db.from('lessons').select('id').not('content', 'is', null).neq('content', '').order('id').range(from, from + 999);
        if (page.error) fail(page.error, 'تعذّر تحميل المناهج.');
        for (const r of (page.data ?? []) as { id: string }[]) withContent.add(r.id);
        if ((page.data?.length ?? 0) < 1000) break;
      }
      type L = { id: string; title: string; sort_order: number; learning_outcomes: { text: string; sort_order: number }[]; lesson_terms: { kind: string; text: string; sort_order: number }[] };
      type U = { id: string; title: string; sort_order: number; lessons: L[] };
      type S = { id: string; name: string; status: 'draft' | 'published'; sort_order: number; units: U[] };
      type G = { id: string; name: string; sort_order: number; subjects: S[] };
      type C = { id: string; name: string; country: string | null; is_available: boolean; sort_order: number; grades: G[] };
      return ((data ?? []) as unknown as C[]).map((c) => ({
        id: c.id,
        name: c.name,
        country: c.country ?? '',
        isAvailable: c.is_available,
        grades: [...c.grades].sort(bySort).map((g) => ({
          id: g.id,
          name: g.name,
          subjects: [...g.subjects].sort(bySort).map((s) => ({
            id: s.id,
            name: s.name,
            status: s.status,
            units: [...s.units].sort(bySort).map((u) => ({
              id: u.id,
              title: u.title,
              lessons: [...u.lessons].sort(bySort).map((l) => {
                const terms = [...l.lesson_terms].sort(bySort);
                return {
                  id: l.id,
                  title: l.title,
                  content: '',
                  hasContent: withContent.has(l.id),
                  outcomes: [...l.learning_outcomes].sort(bySort).map((o) => o.text),
                  terms: terms.filter((t) => t.kind === 'term').map((t) => t.text),
                  symbols: terms.filter((t) => t.kind === 'symbol').map((t) => t.text),
                };
              }),
            })),
          })),
        })),
      }));
    },
    async add(level, parentId, name, order) {
      const t = TABLE[level];
      const row: Record<string, unknown> = { [t.nameCol]: name.trim(), sort_order: order };
      if (t.parentCol) row[t.parentCol] = parentId;
      if (level === 'curriculum') row.slug = `c-${Date.now().toString(36)}`;
      const { data, error } = await db.from(t.table).insert(row).select('id').single();
      if (error) fail(error, 'تعذّر الإضافة.');
      return (data as { id: string }).id;
    },
    async rename(level, id, name) {
      const t = TABLE[level];
      const { error } = await db.from(t.table).update({ [t.nameCol]: name.trim() }).eq('id', id);
      if (error) fail(error, 'تعذّر الحفظ.');
    },
    async remove(level, id) {
      const { error } = await db.from(TABLE[level].table).delete().eq('id', id);
      if (error) fail(error, 'تعذّر الحذف.');
    },
    async setSubjectStatus(id, status) {
      const { error } = await db.from('subjects').update({ status }).eq('id', id);
      if (error) fail(error, 'تعذّر تحديث الحالة.');
    },
    async setCurriculumAvailable(id, available) {
      const { error } = await db.from('curricula').update({ is_available: available }).eq('id', id);
      if (error) fail(error, 'تعذّر تحديث الحالة.');
    },
    async addMany(level, rows) {
      if (!rows.length) return [];
      const t = TABLE[level];
      const payload = rows.map((r) => {
        const row: Record<string, unknown> = { [t.nameCol]: r.name.trim(), sort_order: r.order, [t.parentCol!]: r.parentId };
        if (level === 'lesson' && r.content) row.content = r.content;
        return row;
      });
      const { data, error } = await db.from(t.table).insert(payload).select(`id, ${t.nameCol}, ${t.parentCol}`);
      if (error) fail(error, 'تعذّر حفظ الاستيراد.');
      // Map back by parent + name (unique within one import) rather than relying on row order.
      const byKey = new Map<string, string>();
      for (const d of (data ?? []) as unknown as Record<string, string>[]) byKey.set(`${d[t.parentCol!]}|${d[t.nameCol]}`, d.id);
      return rows.map((r) => {
        const id = byKey.get(`${r.parentId}|${r.name.trim()}`);
        if (!id) throw new CurriculumError('تعذّر حفظ الاستيراد.');
        return id;
      });
    },
    async addOutcomes(rows) {
      if (!rows.length) return;
      const { error } = await db
        .from('learning_outcomes')
        .insert(rows.map((r) => ({ lesson_id: r.lessonId, text: r.text, sort_order: r.order })));
      if (error) fail(error, 'تعذّر حفظ نواتج التعلّم.');
    },
    async setLessonContent(lessonId, content) {
      const { error } = await db.from('lessons').update({ content }).eq('id', lessonId);
      if (error) fail(error, 'تعذّر حفظ محتوى الدرس.');
    },
    async getLessonContent(lessonId) {
      const { data, error } = await db.from('lessons').select('content').eq('id', lessonId).single();
      if (error) fail(error, 'تعذّر تحميل محتوى الدرس.');
      return (data as { content: string | null }).content ?? '';
    },
    async saveLesson(l) {
      const up = await db.from('lessons').update({ title: l.title.trim(), content: l.content.trim() || null }).eq('id', l.id);
      if (up.error) fail(up.error, 'تعذّر حفظ الدرس.');
      // Outcomes and terms are small lists: replace them.
      const [d1, d2] = await Promise.all([
        db.from('learning_outcomes').delete().eq('lesson_id', l.id),
        db.from('lesson_terms').delete().eq('lesson_id', l.id),
      ]);
      if (d1.error || d2.error) fail(d1.error ?? d2.error, 'تعذّر حفظ نواتج التعلّم.');
      const outcomes = l.outcomes.filter(Boolean).map((text, i) => ({ lesson_id: l.id, text, sort_order: i }));
      const terms = [
        ...l.terms.filter(Boolean).map((text, i) => ({ lesson_id: l.id, kind: 'term', text, sort_order: i })),
        ...l.symbols.filter(Boolean).map((text, i) => ({ lesson_id: l.id, kind: 'symbol', text, sort_order: 100 + i })),
      ];
      if (outcomes.length) {
        const r = await db.from('learning_outcomes').insert(outcomes);
        if (r.error) fail(r.error, 'تعذّر حفظ نواتج التعلّم.');
      }
      if (terms.length) {
        const r = await db.from('lesson_terms').insert(terms);
        if (r.error) fail(r.error, 'تعذّر حفظ المصطلحات.');
      }
    },
  };
}

function demoApi(): CurriculumAdminApi {
  let seq = 0;
  const tree: CCurriculum[] = CURRICULA_DATA.map((c) => ({
    id: c.id,
    name: c.name,
    country: c.country,
    isAvailable: c.isAvailable !== false,
    grades: c.grades.map((g) => ({
      id: g.id,
      name: g.name,
      subjects: g.subjects.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        units: s.units.map((u) => ({
          id: u.id,
          title: u.title,
          lessons: u.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            content: '',
            hasContent: false,
            outcomes: l.learningOutcomes ?? l.outcomes ?? [],
            terms: l.keyTerms ?? l.termsAndSymbols ?? [],
            symbols: l.symbols ?? [],
          })),
        })),
      })),
    })),
  }));
  const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 80));
  const clone = () => JSON.parse(JSON.stringify(tree)) as CCurriculum[];
  // Walks every node with its parent list so add/rename/remove share one search.
  const find = (id: string): { list: { id: string }[]; node: Record<string, unknown> } | null => {
    const lists: { id: string }[][] = [tree];
    while (lists.length) {
      const list = lists.pop()!;
      for (const n of list as unknown as Record<string, unknown>[]) {
        if (n.id === id) return { list, node: n };
        for (const k of ['grades', 'subjects', 'units', 'lessons']) if (Array.isArray(n[k])) lists.push(n[k] as { id: string }[]);
      }
    }
    return null;
  };
  const CHILD: Record<Level, string> = { curriculum: '', grade: 'grades', subject: 'subjects', unit: 'units', lesson: 'lessons' };
  return {
    load: () => wait(clone()),
    async add(level, parentId, name) {
      const id = `new_${++seq}_${Date.now().toString(36)}`;
      const base: Record<Level, object> = {
        curriculum: { id, name, country: '', isAvailable: false, grades: [] },
        grade: { id, name, subjects: [] },
        subject: { id, name, status: 'draft', units: [] },
        unit: { id, title: name, lessons: [] },
        lesson: { id, title: name, content: '', hasContent: false, outcomes: [], terms: [], symbols: [] },
      };
      if (level === 'curriculum') tree.push(base.curriculum as CCurriculum);
      else (find(parentId!)?.node[CHILD[level]] as object[] | undefined)?.push(base[level]);
      return wait(id);
    },
    async rename(level, id, name) {
      const f = find(id);
      if (f) f.node[TABLE[level].nameCol] = name;
      await wait(null);
    },
    async remove(_level, id) {
      const f = find(id);
      if (f) f.list.splice(f.list.indexOf(f.node as unknown as { id: string }), 1);
      await wait(null);
    },
    async setSubjectStatus(id, status) {
      const f = find(id);
      if (f) f.node.status = status;
      await wait(null);
    },
    async setCurriculumAvailable(id, available) {
      const f = find(id);
      if (f) f.node.isAvailable = available;
      await wait(null);
    },
    async saveLesson(l) {
      const f = find(l.id);
      if (f) Object.assign(f.node, l, { hasContent: !!l.content.trim() });
      await wait(null);
    },
    async addMany(level, rows) {
      const ids: string[] = [];
      for (const r of rows) {
        const id = await this.add(level, r.parentId, r.name, r.order);
        if (level === 'lesson' && r.content) {
          const f = find(id);
          if (f) Object.assign(f.node, { content: r.content, hasContent: true });
        }
        ids.push(id);
      }
      return ids;
    },
    async addOutcomes(rows) {
      for (const r of rows) {
        const f = find(r.lessonId);
        if (f) (f.node.outcomes as string[]).push(r.text);
      }
      await wait(null);
    },
    async setLessonContent(lessonId, content) {
      const f = find(lessonId);
      if (f) Object.assign(f.node, { content, hasContent: !!content.trim() });
      await wait(null);
    },
    async getLessonContent(lessonId) {
      return wait((find(lessonId)?.node.content as string | undefined) ?? '');
    },
  };
}

let api: CurriculumAdminApi | null = null;
export function curriculumAdminApi(): CurriculumAdminApi {
  api ??= supabase ? realApi() : demoApi();
  return api;
}
