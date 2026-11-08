"""Builds the curriculum import spreadsheets from the raw table-of-contents files.

Raw files live in raw/<grade-folder>/<subject>[-p1|-p2].txt, one line per item:
  #subject|<subject name>     #sem|<1, 2 or 0 for a yearly book>     #book|<book code on elearn.edu.ps>
  U|<unit>   L|<lesson>   O|<outcome of the current unit>
  G|<general outcome of the whole book; matched to lessons by skill (Arabic books)>
A unit with no L lines (English books) becomes a single lesson named after the unit.

Output (in the folder above raw/): one .xlsx per grade plus one file with every grade,
in the column layout of the admin "import curriculum" screen:
  الصف | المادة | الوحدة | الدرس | ناتج التعلّم | محتوى الدرس

Run:  python3 curricula/palestine/build.py
"""
import json
import re
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw"
OUT = ROOT / "xlsx"

GRADES = {
    "01": "الصف الأول", "02": "الصف الثاني", "03": "الصف الثالث", "04": "الصف الرابع",
    "05": "الصف الخامس", "06": "الصف السادس", "07": "الصف السابع", "08": "الصف الثامن",
    "09": "الصف التاسع", "10": "الصف العاشر",
    "11s": "الصف الحادي عشر - علمي", "11h": "الصف الحادي عشر - أدبي",
    "11ri": "الصف الحادي عشر - ريادي", "11en": "الصف الحادي عشر - صناعي",
    "12s": "الصف الثاني عشر - علمي", "12h": "الصف الثاني عشر - أدبي",
    "12ri": "الصف الثاني عشر - ريادي", "12en": "الصف الثاني عشر - صناعي",
}
FILE_NAMES = {k: v.replace(" - ", "-").replace(" ", "-") for k, v in GRADES.items()}

ORDINALS = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة",
            "الثامنة", "التاسعة", "العاشرة", "الحادية عشرة", "الثانية عشرة", "الثالثة عشرة",
            "الرابعة عشرة", "الخامسة عشرة", "السادسة عشرة", "السابعة عشرة", "الثامنة عشرة",
            "التاسعة عشرة", "العشرون"]
SEM_NAMES = {1: "الفصل الأول", 2: "الفصل الثاني"}

HEADER = ["الصف", "المادة", "الوحدة", "الدرس", "ناتج التعلّم", "محتوى الدرس"]

# Arabic-language books list general outcomes per skill; send each to the lessons of that skill.
SKILL_HINTS = [
    ("الاستماع", ["الاستماع", "المسموع"]),
    ("القراءة", ["قراءة", "المقروء", "النصوص"]),
    ("المطالعة", ["قراءة", "المقروء", "النصوص"]),
    ("الشعر", ["أبيات", "القصائد", "قصيدة", "الشعر"]),
    ("النصوص", ["أبيات", "القصائد", "قصيدة", "الشعر"]),
    ("القواعد", ["القواعد النحوية", "النحو", "الصرف"]),
    ("الإملاء", ["الإملائية", "الإملاء"]),
    ("التعبير", ["التعبير", "الكتابة"]),
    ("الكتابة", ["التعبير", "الكتابة"]),
    ("البلاغة", ["البلاغ"]),
    ("العروض", ["العروض", "البحر"]),
]

STOP = set("في من إلى على عن مع أن التي الذي ذلك هذه هذا بين كل بعض أو ثم قد".split())


def clean(s: str) -> str:
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"^الدرس\s+\S+(\s+عشر)?\s*[:：\-–]\s*", "", s)  # "الدرس الأول: ..."
    return s.strip(" .،")


def tokens(s: str) -> set:
    s = re.sub(r"[ً-ْـ]", "", s)  # tashkeel, tatweel
    out = set()
    for w in re.findall(r"[؀-ۿA-Za-z]+", s):
        w = re.sub(r"^(و|ف|ب|ل|ك)?ال", "", w)
        if len(w) >= 3 and w not in STOP:
            out.add(w[:5])
    return out


def read_book(path: Path):
    meta = {"subject": path.stem, "sem": 0}
    units = []  # [name, [lessons], [outcomes]]
    general = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        if "|" not in raw:
            continue
        tag, text = raw.split("|", 1)
        text = text.strip()
        if tag == "#subject":
            meta["subject"] = text
        elif tag == "#sem":
            meta["sem"] = int(text or 0)
        elif tag == "U":
            units.append([clean(text), [], []])
        elif tag == "L" and units:
            units[-1][1].append(clean(text))
        elif tag == "O" and units:
            units[-1][2].append(text.strip())
        elif tag == "G":
            general.append(text.strip())
    return meta, units, general


def fix_text(t: str) -> str:
    """Undoes a common PDF font glitch where lam-alef comes out as alef+hamza+lam (األ -> الأ)."""
    t = re.sub(r"ا([أإآ])ل", r"ال\1", t)
    t = re.sub(r"(?<![\u0600-\u06ff])اال", "الا", t)
    t = re.sub(r"ا([أإ])", r"\1", t)  # same glitch when the lam is lost: اأخرى -> أخرى
    t = re.sub(r"[\u0100-\u05ff]", "", t)  # stray glyphs from broken fonts
    t = re.sub(r"[\x00-\x08\x0b-\x1f\x7f]", "", t)  # control characters (not allowed in xlsx)
    t = re.sub(r"(?m)^.*\.indd\s+\d+.*$|^\d\d/\d\d/\d{4}\s+\d\d:\d\d.*$", "", t)  # printer marks
    # Quran text set in a special font comes out as rows of single letters: drop those lines.
    keep = []
    for line in t.split("\n"):
        words = line.split()
        if len(words) >= 4 and sum(len(w) == 1 for w in words) / len(words) >= 0.6:
            continue
        keep.append(line)
    return re.sub(r"\n{2,}", "\n", "\n".join(keep)).strip()


def read_content(book: Path) -> dict:
    """Lesson text cut from the book PDF (extract_content.py), keyed "unit<TAB>lesson"."""
    f = book.with_name(book.stem + ".content.json")
    return {k: fix_text(v) for k, v in json.loads(f.read_text(encoding="utf-8")).items()} if f.exists() else {}


def rows_for_grade(folder: Path):
    grade = GRADES[folder.name]
    books = {}
    for f in sorted(folder.glob("*.txt")):
        meta, units, general = read_book(f)
        books.setdefault(meta["subject"], []).append((meta["sem"], units, general, read_content(f)))
    rows = []
    for subject, parts in books.items():
        parts.sort(key=lambda p: p[0])
        seen_units = set()
        n = 0
        for sem, units, general, content in parts:
            for name, lessons, outcomes in units:
                raw_unit = name
                n += 1
                if not lessons:  # books with no lesson list (English): the unit itself is the lesson
                    lessons = [re.sub(r"^(Unit\s+\d+|الوحدة\s+\S+)\s*:\s*", "", name)]
                if not re.match(r"^(الوحدة|Unit\s|Literature\s|مدخل)", name):
                    name = f"الوحدة {ORDINALS[min(n, len(ORDINALS)) - 1]}: {name}"
                if name in seen_units and sem in SEM_NAMES:
                    name = f"{SEM_NAMES[sem]} – {name}"
                seen_units.add(name)
                per_lesson = {l: [] for l in lessons}
                for o in outcomes:
                    ot = tokens(o)
                    best = max(lessons, key=lambda l: len(ot & tokens(l)), default=None)
                    if best is not None and len(ot & tokens(best)) >= 2:
                        per_lesson[best].append(o)
                    else:
                        for l in lessons:
                            per_lesson[l].append(o)
                for g in general:
                    for l in lessons:
                        for skill, hints in SKILL_HINTS:
                            if l.startswith(skill) and any(h in g for h in hints):
                                per_lesson[l].append(g)
                                break
                for l in lessons:
                    outs = list(dict.fromkeys(per_lesson[l])) or [""]
                    text = content.get(f"{raw_unit}\t{l}", "")
                    for i, o in enumerate(outs):
                        rows.append([grade, subject, name, l, o, text if i == 0 else ""])
    return rows


def write(path: Path, rows):
    wb = Workbook()
    ws = wb.active
    ws.title = "المنهاج"
    ws.sheet_view.rightToLeft = True
    ws.append(HEADER)
    for r in rows:
        ws.append(r)
    bold = Font(bold=True, color="FFFFFF")
    fill = PatternFill("solid", fgColor="1E3A5F")
    for c in ws[1]:
        c.font, c.fill = bold, fill
    for col, width in zip("ABCDEF", [24, 22, 40, 44, 70, 20]):
        ws.column_dimensions[col].width = width
    for row in ws.iter_rows(min_row=2):
        for c in row:
            c.alignment = Alignment(wrap_text=True, vertical="top")
    ws.freeze_panes = "A2"
    wb.save(path)


def main():
    OUT.mkdir(exist_ok=True)
    all_rows = []
    summary = []
    for key in GRADES:
        folder = RAW / key
        if not folder.is_dir():
            continue
        rows = rows_for_grade(folder)
        if not rows:
            continue
        write(OUT / f"منهاج-فلسطين-{FILE_NAMES[key]}.xlsx", rows)
        all_rows += rows
        subjects = len({r[1] for r in rows})
        units = len({(r[1], r[2]) for r in rows})
        lessons = len({(r[1], r[2], r[3]) for r in rows})
        outcomes = sum(1 for r in rows if r[4])
        summary.append(f"{GRADES[key]}: {subjects} مواد، {units} وحدة، {lessons} درس، {outcomes} ناتج تعلّم")
    write(OUT / "منهاج-فلسطين-كل-الصفوف.xlsx", all_rows)
    print("\n".join(summary))
    print(f"total rows: {len(all_rows)}", file=sys.stderr)


if __name__ == "__main__":
    main()
