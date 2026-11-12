"""moe_pages.py [--swapfix] <book-code> <book.pdf> : writes ../txt/<book-code>.json, the text of every page,
so extract_content.py can cut lesson text from it. Used for the grade-12 books from moe.edu.ps/class12/books.
Needs pdftotext (poppler-utils). The txt/ folder is a local cache and is not committed.

--swapfix: for books whose font stores two-letter ligatures backwards ("يف" for "في", "إجياد" for "إيجاد"),
repair each unknown word by swapping neighbouring letters until it becomes a word seen in the other books."""
import json
import re
import subprocess
import sys
from collections import Counter
from functools import lru_cache
from pathlib import Path

from clean import clean

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / 'txt'
WORD = re.compile(r'[ء-ي]+')


def vocabulary(skip: str) -> Counter:
    """Arabic words from every other extracted grade-12 book (txt cache); their fonts decode cleanly."""
    c = Counter()
    for f in OUT.glob('*.json'):
        if f.stem != skip:
            for p in json.loads(f.read_text(encoding='utf-8')):
                c.update(WORD.findall(clean(p)))
    return c


def swap_variants(w: str):
    """Every word made by swapping any set of non-overlapping neighbouring letter pairs, fewest swaps first."""
    @lru_cache(None)
    def go(i):
        if i >= len(w) - 1:
            return [(0, w[i:])]
        out = [(n, w[i] + r) for n, r in go(i + 1)]
        out += [(n + 1, w[i + 1] + w[i] + r) for n, r in go(i + 2)]
        return out
    return sorted(go(0))


def swapfix(text: str, vocab: Counter) -> str:
    cache = {}

    def fix(m):
        w = m.group(0)
        if w in cache:
            return cache[w]
        best = w
        if len(w) <= 14:  # a fix must be a far more common word (the other books share some of these typos)
            need = max(2, 10 * vocab[w])
            cands = [(n, -vocab[v], v) for n, v in swap_variants(w) if n and vocab[v] >= need]
            if cands:
                best = min(cands)[2]
        cache[w] = best
        return best
    return WORD.sub(fix, text)


if __name__ == '__main__':
    args = sys.argv[1:]
    fix = args and args[0] == '--swapfix'
    if fix:
        args = args[1:]
    code, pdf = args
    text = subprocess.run(['pdftotext', '-enc', 'UTF-8', pdf, '-'], capture_output=True, text=True, check=True).stdout
    pages = text.split('\f')
    if pages and not pages[-1].strip():
        pages.pop()
    if fix:
        vocab = vocabulary(code)
        pages = [swapfix(clean(p), vocab) for p in pages]
    OUT.mkdir(exist_ok=True)
    (OUT / f'{code}.json').write_text(json.dumps(pages, ensure_ascii=False), encoding='utf-8')
    print(f'{len(pages):4d} pages  {code}')
