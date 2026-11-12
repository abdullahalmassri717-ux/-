"""cut_pages.py <raw.txt>... : cuts each lesson's text from its book using the page numbers of the book's
table of contents, written by hand in <raw>.pages (more exact than extract_content.py's title search).

<raw>.pages lines:  #pdf|<book url>   <printed page>|<lesson title, exactly as in the raw file>   <page>|#end
Lessons are looked up in book order, so a repeated title (التعبير) goes to the next unit that has it; for
units with no lessons (English) give the unit name. A lesson runs until the next listed page; #end marks
where unit tests or appendices start. Lessons that are not listed (left out of this edition) get no text.
The page text comes from ../txt/<book code>.json (moe_pages.py). The gap between printed page numbers and
PDF pages is found by checking which shift puts the lesson titles on their pages.
Writes <raw>.content.json, like extract_content.py."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from extract_content import CAP, S, key_of, nz, page_text, sk  # noqa: E402

MAX_PAGES = 14


def items_of(lines):
    out, unit, has = [], None, set()
    for l in lines:
        if l.startswith('U|'):
            unit = l[2:].strip()
            out.append((unit, None))
        elif l.startswith('L|') and unit:
            out.append((unit, l[2:].strip()))
            has.add(unit)
    res = []
    for u, l in out:
        if l is not None:
            res.append((u, l))
        elif u not in has:  # unit without lessons: the unit is the lesson
            res.append((u, re.sub(r'^(Unit\s+\d+|الوحدة\s+\S+)\s*:\s*', '', u)))
    return res


def run(raw):
    raw = Path(raw)
    lines = raw.read_text(encoding='utf-8').splitlines()
    book = next(l.split('|', 1)[1] for l in lines if l.startswith('#book|'))
    pages = json.loads((S / 'txt' / f'{book}.json').read_text(encoding='utf-8'))
    items = items_of(lines)
    spec = [l.split('|', 1) for l in raw.with_suffix('.pages').read_text(encoding='utf-8').splitlines()
            if l and not l.startswith('#pdf')]
    marks, pos = [], 0  # (printed page, item index or None for #end)
    for p, title in spec:
        if title == '#end':
            marks.append((int(p), None))
            continue
        for i in range(pos, len(items)):
            if title in (items[i][1], items[i][0]):
                marks.append((int(p), i))
                pos = i + 1
                break
        else:
            sys.exit(f'{raw}: "{title}" is not a lesson of this book (or is out of order)')
    skn = [sk(nz(t)) for t in pages]

    def score(off):
        n = 0
        for p, i in marks:
            if i is None:
                continue
            k = sk(key_of(items[i][1]))
            idx = p - 1 + off
            if k and 0 <= idx < len(pages):  # on the page itself counts double, on the next page once
                n += 2 * (k in skn[idx]) or (idx + 1 < len(pages) and k in skn[idx + 1])
        return n
    off = max(range(-2, 12), key=score)
    out = {}
    for n, (p, i) in enumerate(marks):
        if i is None:
            continue
        s = p - 1 + off
        nxt = next((q for q, _ in marks[n + 1:] if q > p), None)
        e = (nxt - 1 + off) if nxt else s + 8
        e = min(max(e, s + 1), s + MAX_PAGES, len(pages))
        txt = '\n'.join(page_text(pages[j]) for j in range(s, e)).strip()
        if len(txt) > CAP:
            txt = txt[:CAP].rsplit('\n', 1)[0]
        if txt:
            out[f'{items[i][0]}\t{items[i][1]}'] = txt
    raw.with_suffix('.content.json').write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding='utf-8')
    return len(out), len(items), off, score(off), sum(1 for _, i in marks if i is not None)


if __name__ == '__main__':
    for r in sys.argv[1:]:
        h, n, off, sc, m = run(r)
        print(f'{h:3d}/{n:3d} lessons  page shift {off:+d} (title score {sc}/{2 * m})  {r}')
