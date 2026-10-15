import {resolveBlocks,flattenBlocks} from './block-engine.js';
import {blockCatalog} from './block-catalog.js';
import {prayerRecipes} from './prayer-recipes.js';

export function composePrayerTree(service,plan) {
  const recipe=prayerRecipes[service];
  if(!recipe)throw new Error(`Unknown prayer: ${service}`);
  if(plan.unavailable)return {...recipe,children:[]};
  return resolveBlocks(recipe,blockCatalog,plan);
}
// Flatten only at the reader boundary; composition stays hierarchical.
export function composePrayer(service,plan) {
  return flattenBlocks(composePrayerTree(service,plan));
}
export {flattenBlocks,blockIndex} from './block-engine.js';

const extraPsalms={afterYomKippur:'למחרת יום כיפור',gedaliaTevet:'צום גדליה ועשרה בטבת',chanukah:'חנוכה',esther:'תענית אסתר ופורים',tamuz:'שבעה עשר בתמוז'};
export function guidance(plan,service) {
  if(plan.unavailable)return ['היום שבת או יום טוב; סדר תפילת חול אינו מתאים.'];
  const items=[];
  if(plan.tenDays)items.push('עשרת ימי תשובה: המלך הקדוש, המלך המשפט ותוספות; אבינו מלכנו');
  if(plan.yaalehVeyavo)items.push('יעלה ויבוא בעמידה');
  if(plan.alHanissim)items.push('על הנסים בעמידה');
  items.push(plan.season==='geshem'?'משיב הרוח ומוריד הגשם':'מוריד הטל');
  items.push(plan.rainRequest?'ברך עלינו':'ברכנו');
  if(plan.fast)items.push(`${plan.fast}: עננו בחזרת הש״ץ`);
  if(service==='shacharit') {
    items.push(plan.noTachanun?'אין אומרים תחנון':plan.longTachanun?'תחנונים לשני וחמישי':'אומרים תחנון');
    if(plan.torahReading)items.push('קריאת התורה');
    if(plan.extraPsalm)items.push(`מזמור נוסף: ${extraPsalms[plan.extraPsalm]}`);
    // These sections are printed later in the Siddur, beyond the pages of the current source.
    const missing=[];
    if(plan.hallel!=='none')missing.push(plan.hallel==='full'?'הלל שלם':'חצי הלל');
    if(plan.musaf)missing.push('מוסף');
    if(plan.hoshanot)missing.push('הושענות');
    if(plan.tishaBav)missing.push('סדר תשעה באב');
    if(missing.length)items.push(`חסר בקובץ המקור: ${missing.join(', ')}`);
  }
  return items;
}
