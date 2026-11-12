"""Helpers for reading book page texts."""
import re
from clean import clean

TOC = re.compile(r'المحتويات|احملتويات|الفهرس|Contents', re.I)


def toc_pages(pages):
    """Indexes of the table-of-contents pages (looked for in the first 15 pages only)."""
    return [i for i, p in enumerate(pages[:15]) if TOC.search(clean(p)[:400])]
