"""ocr_pages.py <book-code> <book.pdf> [lang] : like moe_pages.py, but reads every page with OCR (tesseract),
for books whose PDF fonts give no usable text (many grade-11 books on elearn.edu.ps come out as Latin junk).
Writes ../txt/<book-code>.json. Needs poppler-utils and tesseract-ocr with the Arabic data (tesseract-ocr-ara).
lang defaults to ara+eng. Runs one tesseract per CPU."""
import json
import os
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'txt'


def pages_of(pdf):
    info = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True, check=True).stdout
    return int(next(l.split()[1] for l in info.splitlines() if l.startswith('Pages:')))


def ocr_page(pdf, n, lang, tmp):
    base = os.path.join(tmp, f'p{n}')
    subprocess.run(['pdftoppm', '-f', str(n), '-l', str(n), '-r', '200', '-gray', '-singlefile', '-png', pdf, base],
                   check=True, capture_output=True)
    env = dict(os.environ, OMP_THREAD_LIMIT='1')
    r = subprocess.run(['tesseract', base + '.png', '-', '-l', lang, '--psm', '3'],
                       capture_output=True, text=True, env=env)
    os.remove(base + '.png')
    return r.stdout


if __name__ == '__main__':
    code, pdf = sys.argv[1], sys.argv[2]
    lang = sys.argv[3] if len(sys.argv) > 3 else 'ara+eng'
    n = pages_of(pdf)
    with tempfile.TemporaryDirectory() as tmp, ThreadPoolExecutor(os.cpu_count() or 2) as ex:
        pages = list(ex.map(lambda i: ocr_page(pdf, i, lang, tmp), range(1, n + 1)))
    OUT.mkdir(exist_ok=True)
    (OUT / f'{code}.json').write_text(json.dumps(pages, ensure_ascii=False), encoding='utf-8')
    print(f'{n:4d} pages (OCR)  {code}')
