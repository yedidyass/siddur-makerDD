// Israel Sephardi (עדות המזרח) weekday calendar. Date and service are separate inputs:
// Maariv before sunset belongs to the coming Hebrew day.
export const TZ = 'Asia/Jerusalem';
const names = {Tishri:'תשרי',Heshvan:'חשוון',Kislev:'כסלו',Tevet:'טבת',Shevat:'שבט',Adar:'אדר','Adar I':'אדר א׳','Adar II':'אדר ב׳',Nisan:'ניסן',Iyar:'אייר',Sivan:'סיוון',Tamuz:'תמוז',Av:'אב',Elul:'אלול'};
const weekdays = {Sun:'יום ראשון',Mon:'יום שני',Tue:'יום שלישי',Wed:'יום רביעי',Thu:'יום חמישי',Fri:'יום שישי',Sat:'שבת'};
const format = new Intl.DateTimeFormat('en-u-ca-hebrew',{timeZone:TZ,weekday:'short',day:'numeric',month:'long',year:'numeric'});
const local = new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const parts = date => Object.fromEntries(local.formatToParts(date).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
const shifted = (date,days) => new Date(date.getTime()+days*86400000);
const hebrew = date => {
  const p=Object.fromEntries(format.formatToParts(date).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return {day:Number(p.day),month:p.month,year:Number(p.year),weekday:p.weekday};
};
const key = h => `${h.month}:${h.day}`;
const is = (h,m,...days) => h.month===m && days.includes(h.day);
const yearMonth = (h) => h.month==='Adar'||h.month==='Adar II';

// Solar transit and 0.833-degree sunset, calculated from the selected city.
export function sunset(date,latitude=31.95,longitude=34.89) {
  const p=parts(date), rad=Math.PI/180, lw=-longitude*rad, phi=latitude*rad;
  const noon=Date.UTC(p.year,p.month-1,p.day,12);
  const d=noon/86400000-0.5+2440588-2451545;
  const n=Math.round(d-0.0009-lw/(2*Math.PI));
  const ds=0.0009+lw/(2*Math.PI)+n;
  const M=(357.5291+0.98560028*ds)*rad;
  const C=(1.9148*Math.sin(M)+0.02*Math.sin(2*M)+0.0003*Math.sin(3*M))*rad;
  const L=M+C+102.9372*rad+Math.PI;
  const decl=Math.asin(Math.sin(L)*Math.sin(23.4397*rad));
  const transit=2451545+ds+0.0053*Math.sin(M)-0.0069*Math.sin(2*L);
  const w=Math.acos(Math.max(-1,Math.min(1,(Math.sin(-0.833*rad)-Math.sin(phi)*Math.sin(decl))/(Math.cos(phi)*Math.cos(decl)))));
  return new Date((transit+w/(2*Math.PI)+0.5-2440588)*86400000);
}
export function hebrewAt(date,location) {
  const p=parts(date);
  // Intl's civil date is anchored at midday, regardless of the device timezone.
  const civil=new Date(Date.UTC(p.year,p.month-1,p.day,12));
  return hebrew(date>=sunset(date,location?.latitude,location?.longitude)?shifted(civil,1):civil);
}
export function hebrewForPrayer(date,service,location) {
  if(service!=='maariv') {
    const p=parts(date);
    return hebrew(new Date(Date.UTC(p.year,p.month-1,p.day,12)));
  }
  const p=parts(date), civil=new Date(Date.UTC(p.year,p.month-1,p.day,12));
  return hebrew(date<sunset(date,location?.latitude,location?.longitude)&&p.hour<12?civil:shifted(civil,1));
}
export function hebrewNumber(value) {
  let number=Number(value)%1000;
  if(number===15)return 'ט״ו';if(number===16)return 'ט״ז';
  const letters=[[400,'ת'],[300,'ש'],[200,'ר'],[100,'ק'],[90,'צ'],[80,'פ'],[70,'ע'],[60,'ס'],[50,'נ'],[40,'מ'],[30,'ל'],[20,'כ'],[10,'י'],[9,'ט'],[8,'ח'],[7,'ז'],[6,'ו'],[5,'ה'],[4,'ד'],[3,'ג'],[2,'ב'],[1,'א']];
  let result='';for(const [amount,letter] of letters)while(number>=amount){result+=letter;number-=amount;}
  return result.length===1?`${result}׳`:`${result.slice(0,-1)}״${result.slice(-1)}`;
}
function chanukah(h,civilDate) {
  if(h.month==='Kislev'&&h.day>=25)return true;
  if(h.month==='Tevet'&&h.day<=2)return true;
  return h.month==='Tevet'&&h.day===3&&key(hebrew(shifted(civilDate,-7)))==='Kislev:25';
}
function fastDay(h,civilDate) {
  const previous=hebrew(shifted(civilDate,-1));
  if(is(h,'Tishri',3)&&h.weekday!=='Sat')return 'צום גדליה';
  if(is(h,'Tishri',4)&&is(previous,'Tishri',3)&&previous.weekday==='Sat')return 'צום גדליה';
  if(is(h,'Tevet',10))return 'עשרה בטבת';
  if(yearMonth(h)&&h.day===13&&h.weekday!=='Sat')return 'תענית אסתר';
  if(yearMonth(h)&&h.day===11&&h.weekday==='Thu'&&hebrew(shifted(civilDate,2)).weekday==='Sat')return 'תענית אסתר';
  if(is(h,'Tamuz',17)&&h.weekday!=='Sat')return 'שבעה עשר בתמוז';
  if(is(h,'Tamuz',18)&&is(previous,'Tamuz',17)&&previous.weekday==='Sat')return 'שבעה עשר בתמוז';
  if(is(h,'Av',9)&&h.weekday!=='Sat')return 'תשעה באב';
  if(is(h,'Av',10)&&is(previous,'Av',9)&&previous.weekday==='Sat')return 'תשעה באב';
  return '';
}
function omerDay(h,civilDate) {
  if(!(['Nisan','Iyar','Sivan'].includes(h.month)))return 0;
  for(let d=0;d<60;d++) {
    const candidate=shifted(civilDate,-d), start=hebrew(candidate);
    if(is(start,'Nisan',16)&&start.year===h.year)return d+1<=49?d+1:0;
  }
  return 0;
}
const yomTov=h=>is(h,'Tishri',1,2,10,15,22)||is(h,'Nisan',15,21)||is(h,'Sivan',6);
const cholSukkot=h=>h.month==='Tishri'&&h.day>=16&&h.day<=21;
const cholPesach=h=>h.month==='Nisan'&&h.day>=16&&h.day<=20;
// Days without Tachanun, as printed in this Siddur (סדר תחנון, page 196 note ב).
function omitTachanun(h,chanuka,fast) {
  return h.weekday==='Sat'||yomTov(h)||h.day===1||h.day===30||chanuka||
    h.month==='Nisan'||is(h,'Iyar',14,18)||h.month==='Sivan'&&h.day<=12||
    is(h,'Av',9,15)||fast==='תשעה באב'||is(h,'Elul',29)||h.month==='Tishri'&&h.day>=9||
    is(h,'Shevat',15)||is(h,'Adar I',14,15)||yearMonth(h)&&[14,15].includes(h.day);
}
// Page 196 note ג: Mincha before a day without Tachanun also omits it, except
// before Erev Rosh Hashana, Erev Yom Kippur and Pesach Sheni.
function erevOmission(h,next,civilDate) {
  if(h.weekday==='Fri')return true;
  if(['Elul:29','Tishri:9','Iyar:14'].includes(key(next)))return false;
  const tomorrow=shifted(civilDate,1);
  return omitTachanun(next,chanukah(next,tomorrow),fastDay(next,tomorrow));
}
// The additional psalm said after the Song of the Day (pages 239-243).
function extraPsalm(h,chanuka,fast,purimDay) {
  if(is(h,'Tishri',11))return 'afterYomKippur';
  if(fast==='צום גדליה'||fast==='עשרה בטבת')return 'gedaliaTevet';
  if(chanuka)return 'chanukah';
  if(fast==='תענית אסתר'||purimDay)return 'esther';
  if(fast==='שבעה עשר בתמוז')return 'tamuz';
  return null;
}
export function rulesForHebrewDate(h,civilDate,service='shacharit',options={}) {
  const next=hebrew(shifted(civilDate,1)), chanuka=chanukah(h,civilDate), fast=fastDay(h,civilDate);
  const roshChodesh=h.day===1||h.day===30, sukkot=cholSukkot(h), pesach=cholPesach(h);
  const purimDay=yearMonth(h)&&h.day===(options.jerusalem?15:14);
  const noTachanun=omitTachanun(h,chanuka,fast)||(service==='mincha'&&erevOmission(h,next,civilDate));
  const hallel=chanuka||sukkot?'full':roshChodesh||pesach?'half':'none';
  const yaalehVeyavo=roshChodesh||sukkot||pesach;
  const alHanissim=chanuka?'chanukah':purimDay?'purim':null;
  const omer=omerDay(h,civilDate);
  const unavailable=h.weekday==='Sat'||yomTov(h);
  const tenDays=h.month==='Tishri'&&h.day>=3&&h.day<=9;
  const mondayThursday=['Mon','Thu'].includes(h.weekday);
  const torahReading=mondayThursday||roshChodesh||chanuka||purimDay||Boolean(fast)||sukkot||pesach;
  let title=fast||'';
  if(sukkot)title=h.day===21?'הושענא רבה':'חול המועד סוכות';
  else if(pesach)title='חול המועד פסח';
  else if(chanuka)title=roshChodesh?'חנוכה · ראש חודש':'חנוכה';
  else if(purimDay)title='פורים';
  else if(roshChodesh)title='ראש חודש';
  else if(tenDays&&!fast)title='עשרת ימי תשובה';
  else if(is(h,'Iyar',14,18)||is(h,'Shevat',15)||is(h,'Av',15))title='יום שאין בו תחנון';
  if(unavailable)title=h.weekday==='Sat'?'שבת':'יום טוב';
  return {h,service,title,unavailable,roshChodesh,chanukah:chanuka,sukkot,pesach,purimDay,fast,tenDays,
    noTachanun,hallel,yaalehVeyavo,alHanissim,omer,torahReading,
    longTachanun:!noTachanun&&mondayThursday,
    avinuMalkenu:tenDays,
    extraPsalm:extraPsalm(h,chanuka,fast,purimDay),
    tishaBav:fast==='תשעה באב',
    musaf:roshChodesh?'roshChodesh':sukkot||pesach?'festival':null,
    hoshanot:sukkot,season:h.month==='Tishri'&&h.day<22||h.month==='Nisan'&&h.day>=15||
      ['Iyar','Sivan','Tamuz','Av','Elul'].includes(h.month)?'tal':'geshem',
    rainRequest:h.month==='Heshvan'&&h.day>=7||['Kislev','Tevet','Shevat','Adar','Adar I','Adar II'].includes(h.month)||h.month==='Nisan'&&h.day<15,
    dateText:`${weekdays[h.weekday]} · ${hebrewNumber(h.day)} ב${names[h.month]||h.month} ${hebrewNumber(h.year)}`
  };
}
export function planForPrayer(date,service,options={}) {
  const h=hebrewForPrayer(date,service,options), p=parts(date);
  const today=new Date(Date.UTC(p.year,p.month-1,p.day,12));
  const civil=key(hebrew(today))===key(h)?today:shifted(today,1);
  return rulesForHebrewDate(h,civil,service,options);
}
