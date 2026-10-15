# Source audit

- PDF filename: `source/01-siddur.pdf` (copy of `source/Siddur_Ha_Miphorush_Kavanas_Ha_Leiv.pdf` from `main`)
- Total PDF pages: 250 (all 420×595 pt, A5 portrait)
- Siddur title / edition: הסדור המפורש "כוונת הלב" השלם — מכון שירה חדשה,
  פתח תקוה תשס״ו, הוצאה שביעית. Hebrewbooks.org ID 36061.
- Nusach: ספרדים ועדות המזרח, לפי פסקי מרן השלחן ערוך (title page).
- Scan orientation and quality: upright, clean, readable at 120 dpi; ABBYY OCR
  text layer present (used only for orientation, never as prayer text).
- Page numbering: PDF page N = printed page N (verified on pages 29, 78, 122,
  144, 164, 196, 217, 230, 250).
- Missing, duplicated, blank, or damaged pages: **the PDF is a partial copy.**
  The printed table of contents (page 3) runs to page 862. The PDF ends at
  printed page 250, in the middle of the Shacharit ending (תנא דבי אליהו,
  before קדיש על ישראל / עלינו). No blank or duplicate pages.
- Damaged page: **33** is a low-resolution (438×620 px) re-scan with smeared
  letters in several blessings, but every word remains legible at reading size.
  It is published as greyscale; the other 195 published pages are clean
  300-dpi bilevel scans exported as 1-bit PNG.
- Scan resolution: most pages 1750×2479 px; pages 29, 43, 78, 122, 196 are
  2333×3306, 119 is 3500×4958, 144 is 2100×2975. All are normalised to 1750 px
  wide without cropping (`tools/export_pages.py`).

## Contents present (printed page = PDF page, from the TOC on page 3)

| Section | Start page |
|---|---:|
| מבוא לסידור "כוונת הלב" | 9 |
| תפילה בכוונה, כיצד? | 18 |
| כוונת שמות השם | 26 |
| ברכות השחר | 29 |
| תקון חצות | 43 |
| פתיחת אליהו הנביא | 59 |
| אדון עולם | 69 |
| סדר עטיפת ציצית | 71 |
| סדר הנחת תפילין | 72 |
| תפילת שחרית | 78 |
| פסוקי דזמרה | 122 |
| ק״ש וברכותיה | 144 |
| תפילת שמונה עשרה | 164 |
| סדר תחנון | 196 |
| ברכות התורה / הוצאת ספר תורה | 217 |
| שיר של יום | 230 |
| (end of PDF, mid Shacharit ending) | 250 |

## Contents listed in the TOC but absent from the PDF

שלשה עשר עקרים (257), מנחה (264), ערבית לחול (309), ספירת העומר (352),
ברכת לבנה (358), ק״ש על המטה (363), all of Shabbat (372–626), הבדלה (626),
ראש חודש incl. הלל and מוסף (636–669), שלש רגלים (669–695), חנוכה, פורים,
ברכת המזון (453 for Shabbat; weekday section not located), ארבע תעניות (759),
and everything after.

## Shacharit boundaries (verified at readable resolution)

| Join | Last words before / first words after | Rule |
|---|---|---|
| 42 → 69 | end of מודעה וגלוי דעת / tail of פתיחת אליהו, then אדון עולם | 43-68 not in recipe |
| 193 | עושה שלום … יהי רצון … בלבב שלם | always shown |
| 194-195 | note on חזרת הש״ץ, then "בעשרת ימי תשובה אומרים אבינו מלכנו" | Ten Days only |
| 196 | end of אבינו מלכנו; "בימים שאין אומרים בהם תחנון": יהי שם; opens סדר תחנון | always shown |
| 205 | end of daily Tachanun; "ואומר החזן חצי קדיש לקמן עמ׳ 217"; "בימי שני וחמישי מוסיפים" | Tachanun days |
| 214 | end of Monday/Thursday Tachanunim; half Kaddish begins | Mon/Thu, or any Torah-reading day |
| 215-216 | half Kaddish ends; אל ארך אפים / יהי ה׳ אלהינו; הוצאת ס״ת | Torah-reading days |
| 217 | ברכות התורה; "ואומרים חצי קדיש" | always shown (Kaddish) |
| 220 | end of אשרי; למנצח (not on days without Tachanun, printed on the page) | always shown |
| 227 | "בימים שאין אומרים בהם תחנון אין אומרים תפלה לדוד ומתחילין מבית יעקב" | Tachanun days |
| 230-238 | weekday psalms, each starting and ending mid-page | minimum full-page span |
| 238-239 | הושיענו (always), then למחרת יום כיפור, צום גדליה ועשרה בטבת | always shown |
| 240-243 | חנוכה; תענית אסתר ופורים; שבעה עשר בתמוז; בבית האבל | by day |
| 244 | end of the mourners' psalm; קדיש יהא שלמא | always shown |
| 250 | תנא דבי אליהו … יברך את עמו בשלום | end of scan |
