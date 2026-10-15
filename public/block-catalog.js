import {page,group,ref,when,choose} from './block-engine.js';

// Source: הסדור המפורש "כוונת הלב", נוסח ספרדים ועדות המזרח.
// Page IDs are the printed page numbers, which equal the PDF page numbers.
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>String(a+i));
const pages=ids=>ids.map(id=>ref(`page:${id}`));
export const sourcePages=[...range(29,42),...range(69,250)];

export const blockCatalog=Object.fromEntries(sourcePages.map(id=>[`page:${id}`,page(id)]));
const define=(id,title,children)=>{blockCatalog[id]=group(id,title,children);};

// Morning blessings through מודעה וגלוי דעת (said every day, page 40).
define('birchot-hashachar','ברכות השחר',pages(range(29,42)));
// Page 69 opens with the last lines of פתיחת אליהו, then אדון עולם.
define('adon-olam','אדון עולם',pages(range(69,70)));
define('tzitzit-tefillin','ציצית ותפילין',pages(range(71,74)));
define('to-synagogue','ההליכה לבית הכנסת ותפילת חנה',pages(range(75,77)));
define('morning-preparation','הכנה לתפילה',[
  ...['adon-olam','tzitzit-tefillin','to-synagogue'].map(ref)
]);

define('akeda','פרשת העקדה',pages(range(78,90)));
define('korbanot','פרשת הקרבנות',pages(range(91,103)));
// Pages 104-108 end with קדיש על ישראל, before הודו.
define('rabbi-yishmael','ברייתא דרבי ישמעאל וקדיש',pages(range(104,108)));
define('hodu','הודו',pages(range(109,114)));
define('aromimcha','ארוממך',pages(range(115,116)));
define('lamnatzeach-menorah','למנצח בנגינות',pages(range(117,119)));
define('baruch-sheamar','ברוך שאמר',pages(range(120,121)));
define('pesukei-dezimra','פסוקי דזמרה',pages(range(122,143)));
define('shema-blessings','קריאת שמע וברכותיה',pages(range(144,163)));
// Page 193 completes the Amidah (עושה שלום and יהי רצון). It is never conditional.
define('amidah','תפילת שמונה עשרה',pages(range(164,193)));
define('shacharit-opening','שחרית עד העמידה',[
  ...['akeda','korbanot','rabbi-yishmael','hodu','aromimcha','lamnatzeach-menorah',
    'baruch-sheamar','pesukei-dezimra','shema-blessings','amidah'].map(ref)
]);

// Page 194 opens with the note on חזרת הש״ץ, then אבינו מלכנו of the Ten Days.
define('avinu-malkenu','אבינו מלכנו',pages(range(194,195)));
// Page 196 ends אבינו מלכנו, prints יהי שם for days without Tachanun and opens
// סדר תחנון. Every reader of Shacharit needs one of these, so it is always shown.
define('after-amidah','אחר חזרת הש״ץ',[
  when('avinuMalkenu',ref('avinu-malkenu')),
  ref('page:196')
]);
// Page 205 ends the daily Tachanun and opens the Monday/Thursday additions.
define('tachanun','סדר תחנון',pages(range(197,205)));
// Page 214 ends the Monday/Thursday additions and opens the half Kaddish
// that precedes הוצאת ספר תורה.
define('tachanun-monday-thursday','תחנונים לשני וחמישי',pages(range(206,214)));
define('tachanun-section','תחנון',[
  when({not:'noTachanun'},[
    ref('tachanun'),
    when('longTachanun',ref('tachanun-monday-thursday'))
  ])
]);
define('torah-service','הוצאת ספר תורה',[
  when('torahReading',[
    when({not:'longTachanun'},ref('page:214')),
    ...pages(range(215,216))
  ])
]);
// Page 217: ברכות התורה, then the half Kaddish that every service needs.
define('torah-blessings-kaddish','ברכות התורה וחצי קדיש',[ref('page:217')]);

define('ashrei','אשרי',pages(range(218,219)));
// Page 220 ends אשרי; למנצח (Ps. 20) follows on the same page.
define('lamnatzeach','למנצח',[ref('page:220')]);
define('uva-letzion','ובא לציון',pages(range(221,226)));
// Page 227 is only תפלה לדוד, omitted on days without Tachanun (instruction on page 227).
define('tefilla-ledavid','תפלה לדוד',[when({not:'noTachanun'},ref('page:227'))]);
define('beit-yaakov','בית יעקב ושיר המעלות',pages(range(228,229)));

// Each weekday psalm uses the smallest span of complete pages containing it.
define('song-sun','שיר של יום ראשון',pages(['230','231']));
define('song-mon','שיר של יום שני',pages(['231','232','233']));
define('song-tue','שיר של יום שלישי',pages(['233','234']));
define('song-wed','שיר של יום רביעי',pages(['234','235','236']));
define('song-thu','שיר של יום חמישי',pages(['236','237']));
// The Friday psalm begins at the foot of page 237 and ends on page 238, which
// always follows as part of הושיענו.
define('song-fri','שיר של יום שישי',pages(['237']));
define('song-of-day','שיר של יום',[
  choose('h.weekday',Object.fromEntries(['Sun','Mon','Tue','Wed','Thu','Fri'].map(day=>[day,ref(`song-${day.toLowerCase()}`)])))
]);
// Page 238 ends the Friday psalm and prints הושיענו; page 239 ends it and opens
// the additional psalms (למחרת יום כיפור on page 239 itself).
define('hoshienu','הושיענו',pages(['238','239']));
define('extra-psalm','מזמור נוסף',[
  choose('extraPsalm',{
    gedaliaTevet:pages(['240']),
    chanukah:pages(['240','241']),
    esther:pages(['241','242']),
    tamuz:pages(['242','243'])
  })
]);
// Page 244 ends the mourners' psalm and holds קדיש יהא שלמא, so it is always shown.
define('kaddish-ein-kelokeinu','קדיש, קוה ואין כאלהינו',pages(range(244,245)));
define('ketoret','פרשת הקטורת',pages(range(246,249)));
// The scan ends at page 250, before קדיש על ישראל and עלינו (review/open-questions.md).
define('tana-devei-eliyahu','תנא דבי אליהו',[ref('page:250')]);

define('shacharit-ending','סיום שחרית',[
  ...['ashrei','lamnatzeach','uva-letzion','tefilla-ledavid','beit-yaakov','song-of-day',
    'hoshienu','extra-psalm','kaddish-ein-kelokeinu','ketoret','tana-devei-eliyahu'].map(ref)
]);
