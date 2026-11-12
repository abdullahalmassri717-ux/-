"""Text cleanup shared by the content extractors: PDF bidi marks, presentation-form letters, odd spaces."""
import re
import unicodedata

HARAKAT = '[ً-ْٰ]'


def clean(s: str) -> str:
    s = re.sub('[‎‏‪-‮⁦-⁩­﻿�]', '', s)  # bidi marks, soft hyphen, BOM
    s = unicodedata.normalize('NFKC', s)  # Arabic presentation forms (ﻻ ﺍ …) -> normal letters
    # Some PDFs put a space before a vowel mark or around a tatweel, cutting words in two
    # ("النّكبـ ُ ـات"): glue the pieces back and drop the marks.
    s = re.sub(r'[ \xa0]+(?=' + HARAKAT + ')', '', s)
    s = re.sub(HARAKAT, '', s)
    s = re.sub(r'[ \xa0]*ـ+[ \xa0]*', '', s)
    s = s.replace('\t', ' ')
    return re.sub(r'[ \xa0]+', ' ', s)
