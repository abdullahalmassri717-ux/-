"""content.py <raw.txt>... : for each raw book file, find where each lesson starts in the book text
and write <raw>.content.json = {"<unit>\t<lesson>": text}. Prints match stats."""
import json, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from clean import clean
from parse import toc_pages

S = Path(__file__).resolve().parent.parent
CAP = 8000

def nz(s):
    s = clean(s)
    s = re.sub('[أإآٱ]', 'ا', s).replace('ى', 'ي').replace('ة', 'ه').replace('ؤ', 'و').replace('ئ', 'ي')
    s = re.sub(r'[^a-z0-9\u0621-\u064a]+', ' ', s.lower())
    s = re.sub(r'\d+', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

def sk(s):
    """skeleton: drop alef and lam, which broken fonts swap around (االنسان, احلجري)."""
    return re.sub(r'\s+', ' ', re.sub('[ال]', '', s)).strip()

ORDW = ['الاول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
        'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر']

SKILL_ALTS = {
    'الشعر': ['النص الشعري', 'المحفوظات', 'الشعر', 'نشيد'], 'النص الشعري': ['النص الشعري', 'المحفوظات', 'الشعر'],
    'المحفوظات': ['المحفوظات', 'النص الشعري', 'الشعر'], 'القراءة': ['القراءة', 'المطالعة'], 'المطالعة': ['المطالعة', 'القراءة'],
    'القواعد اللغوية': ['القواعد اللغوية', 'القواعد'], 'القواعد': ['القواعد', 'القواعد اللغوية'], 'الإملاء': ['الإملاء', 'الاملاء'],
    'التعبير': ['التعبير'], 'الاستماع': ['الاستماع'], 'البلاغة': ['البلاغة'], 'العروض': ['العروض'],
}

def key_of(lesson):
    t = re.sub(r'^[^:]{2,25}:\s*', '', lesson) if re.match(r'^(المطالعة|القراءة|النص|القواعد|الإملاء|التعبير|البلاغة|العروض|الاستماع|المحفوظات|الخط|الكتابة|الأدب|النحو|الصرف|التعبير الوظيفي|الطبقة)', lesson) else lesson
    t = re.sub(r'\(.*?\)', ' ', t)
    w = nz(t).split()
    return ' '.join(w[:5])

def page_text(p):
    out = []
    p = re.sub('[\u0100-\u052f\u1e00-\u1eff]', '', clean(p))
    for l in p.split('\n'):
        l = re.sub(r'\s+', ' ', l).strip()
        if not l or re.fullmatch(r'[\d\s\-–.،/()]+', l):
            continue
        out.append(l)
    return '\n'.join(out)

def run(raw):
    lines = Path(raw).read_text(encoding='utf-8').splitlines()
    book = next(l.split('|', 1)[1] for l in lines if l.startswith('#book|'))
    pages = json.loads((S / 'txt' / f'{book}.json').read_text(encoding='utf-8'))
    tp = toc_pages(pages)
    start0 = (max(tp) + 1) if tp else 2
    norm = [nz(p) for p in pages]
    heads = [n[:500] for n in norm]
    items, unit = [], None
    for l in lines:
        if l.startswith('U|'):
            unit = l[2:].strip()
        elif l.startswith('L|') and unit:
            items.append((unit, l[2:].strip()))
    # English / no-lesson units: the lesson is the unit title
    us = [l[2:].strip() for l in lines if l.startswith('U|')]
    have = {u for u, _ in items}
    for u in us:
        if u not in have:
            items.append((u, re.sub(r'^(Unit\s+\d+|الوحدة\s+\S+)\s*:\s*', '', u)))
    order = {u: i for i, u in enumerate(us)}
    items.sort(key=lambda x: order[x[0]])  # keep unit order (stable within unit)
    skn = [sk(n) for n in norm]
    skh = [x[:450] for x in skn]
    tocish = [bool(re.search(r'المحتويات|الموضوع الصفحه|الفرع الموضوع|المحتوي الصفحه', n)
                   or len(re.findall(r'(^| )الدرس ', n)) >= 3
                   or re.search(r'يتوقع من (الطلبه|الطالب|المتعلم)[^.]{0,80}(هذه الوحده|الوحده)', n[:300])) for n in norm]
    def find(arr, k, lo, hi):
        if len(k) < 2: return None
        pat = re.compile(r'(^| )' + re.escape(k) + r'( |$)')
        for i in range(max(lo, start0), min(hi, len(pages))):
            if not tocish[i] and pat.search(arr[i]):
                return i
        return None
    # unit anchors: "الوحدة <ordinal>" near the top of a page, in order
    ustart, cur = {}, start0
    for u in us:
        m = re.match(r'^الوحدة\s+(.+?)\s*(:|$)', u)
        if not m: continue
        k = sk(nz('الوحدة ' + m.group(1)))
        f = find(skh, k, cur, len(pages))
        if f is not None:
            ustart[u] = f; cur = f
    bounds = {}
    for j, u in enumerate(us):
        lo = ustart.get(u)
        hi = next((ustart[v] for v in us[j + 1:] if v in ustart), len(pages))
        bounds[u] = (lo, hi)
    starts, cur = [], start0
    pos_in_unit, prev_u = 0, None
    for u, l in items:
        pos_in_unit = pos_in_unit + 1 if u == prev_u else 1
        if u != prev_u and bounds[u][0] is not None:
            cur = bounds[u][0]
        prev_u = u
        hi = bounds[u][1]
        w = key_of(l).split()
        tries = []
        if w:
            tries.append((skh, sk(' '.join(w)), hi))
            tries.append((skn, sk(' '.join(w)), hi))
            if len(w) > 3: tries.append((skh, sk(' '.join(w[:3])), min(hi, cur + 40)))
            if len(w) > 2 and len(' '.join(w[:2])) >= 8: tries.append((skh, sk(' '.join(w[:2])), min(hi, cur + 30)))
        m = re.match(r'^([^:]{2,25}):', l)
        if m:
            sk0 = m.group(1).strip()
            alts = SKILL_ALTS.get(sk0, [sk0])
            for a in alts:
                tries.append((skh, sk(nz(a)), min(hi, cur + 25)))
        elif pos_in_unit <= len(ORDW):
            tries.append((skh, sk('الدرس ' + ORDW[pos_in_unit - 1]), min(hi, cur + 30)))
        found = None
        same_unit_prev = bool(starts) and items[len(starts) - 1][0] == u and starts[-1] is not None
        for n_try, (arr, k, lim) in enumerate(tries):
            lo = cur + 1 if (n_try >= 2 and same_unit_prev) else cur
            found = find(arr, k, lo, lim)
            if found is not None: break
        starts.append(found)
        if found is not None:
            cur = found
    # second chance (books whose pages are out of order): strong title match anywhere
    for i, (u, l) in enumerate(items):
        if starts[i] is None:
            w = key_of(l).split()
            if len(' '.join(w)) >= 6:
                starts[i] = find(skh, sk(' '.join(w)), start0, len(pages))
    # third chance: the page heading words the title differently ("قصة آدم" for "قصة خلق آدم"):
    # look between the neighbouring lessons that were found for 3, then 2, consecutive title words.
    for i, (u, l) in enumerate(items):
        if starts[i] is not None:
            continue
        lo = max([s for s in starts[:i] if s is not None], default=start0 - 1) + 1
        hi = min([s for s in starts[i + 1:] if s is not None], default=len(pages))
        w = [x for x in sk(nz(re.sub(r'\(.*?\)', ' ', l))).split() if len(x) >= 3]
        for n in (3, 2):
            for j in range(len(w) - n + 1):
                f = find(skh, ' '.join(w[j:j + n]), lo, hi)
                if f is not None:
                    starts[i] = f
                    break
            if starts[i] is not None:
                break
    out, hit = {}, 0
    known = [(i, s) for i, s in enumerate(starts) if s is not None]
    for n, (i, s) in enumerate(known):
        later = [t for _, t in known if t > s]
        nxt = min(later) if later else min(len(pages), s + 8)
        end = max(nxt, s + 1)
        if end - s > 12:
            end = s + 12
        txt = '\n'.join(page_text(pages[p]) for p in range(s, end)).strip()
        if len(txt) > CAP:
            txt = txt[:CAP].rsplit('\n', 1)[0]
        letters = re.findall(r'[A-Za-z\u0621-\u064a]', txt)
        arabic = sum(1 for c in letters if c >= '\u0621')
        if letters and re.search(r'[\u0621-\u064a]', items[i][1]) and arabic / len(letters) < 0.6:
            txt = ''  # undecodable font: mostly junk latin letters
        if txt:
            u, l = items[i]
            out[f'{u}\t{l}'] = txt
            hit += 1
    Path(str(raw)[:-4] + '.content.json').write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding='utf-8')
    return hit, len(items)

if __name__ == '__main__':
    for r in sys.argv[1:]:
        h, n = run(r)
        print(f'{h:3d}/{n:3d}  {r}')
