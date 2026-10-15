import test from 'node:test';
import assert from 'node:assert/strict';
import {planForPrayer,hebrewAt,sunset} from '../public/calendar.js';
import {composePrayer,guidance} from '../public/prayer-blocks.js';

const at=(value,service='shacharit',options)=>planForPrayer(new Date(value),service,options);
// First weekday plan within the coming years that matches a predicate.
function find(predicate,service='shacharit') {
  for(let day=0;day<3*366;day++){
    const plan=planForPrayer(new Date(Date.UTC(2026,8,1+day,9)),service);
    if(!plan.unavailable&&predicate(plan))return plan;
  }
  throw new Error('No matching date');
}
test('sunset turns the Hebrew date and Maariv into the coming day',()=>{
  const friday=new Date('2026-10-02T12:00:00Z');
  assert.equal(hebrewAt(friday).day,21);
  assert.equal(hebrewAt(new Date('2026-10-02T17:00:00Z')).day,22);
  assert.equal(at('2026-10-02T12:00:00Z','maariv').unavailable,true);
  assert.equal(at('2026-10-02T17:00:00Z','maariv').h.day,22);
  assert.ok(sunset(friday)>friday);
  assert.ok(Math.abs(sunset(friday).getTime()-Date.parse('2026-10-02T15:24:00Z'))<5*60000);
});
test('Hoshana Rabbah flags Hallel, Musaf and Hoshanot that are missing from the source',()=>{
  const plan=at('2026-10-02T09:00:00Z');
  assert.equal(plan.hallel,'full');assert.equal(plan.musaf,'festival');
  assert.equal(plan.hoshanot,true);assert.equal(plan.noTachanun,true);assert.equal(plan.torahReading,true);
  assert.ok(guidance(plan,'shacharit').includes('חסר בקובץ המקור: הלל שלם, מוסף, הושענות'));
  assert.ok(composePrayer('shacharit',plan).length>0);
});
test('Israel starts the rain request on 7 Cheshvan, already at Maariv',()=>{
  assert.equal(at('2026-10-17T17:00:00Z','maariv').rainRequest,true);
  assert.equal(at('2026-10-17T09:00:00Z').rainRequest,false);
  assert.ok(guidance(at('2026-10-15T09:00:00Z'),'shacharit').includes('ברכנו'));
  assert.ok(guidance(at('2026-10-19T09:00:00Z'),'shacharit').includes('ברך עלינו'));
});
test('Sephardi summer wording is מוריד הטל from Pesach until Shemini Atzeret',()=>{
  assert.ok(guidance(at('2026-09-15T09:00:00Z'),'shacharit').includes('מוריד הטל'));
  assert.ok(guidance(at('2026-10-14T09:00:00Z'),'shacharit').includes('משיב הרוח ומוריד הגשם'));
});
test('Rosh Chodesh Tevet during Chanukah combines inserts, Torah reading and the Chanukah psalm',()=>{
  const p=at('2026-12-11T09:00:00Z');
  assert.equal(p.roshChodesh,true);assert.equal(p.alHanissim,'chanukah');
  assert.equal(p.yaalehVeyavo,true);assert.equal(p.hallel,'full');assert.equal(p.musaf,'roshChodesh');
  assert.equal(p.torahReading,true);assert.equal(p.extraPsalm,'chanukah');
  const ids=composePrayer('shacharit',p).map(b=>b.id);
  assert.ok(ids.includes('240'));assert.ok(ids.includes('241'));assert.ok(!ids.includes('227'));
});
test('Chabad-only dates have Tachanun in the Sephardi calendar',()=>{
  const kislev19=at('2026-11-29T09:00:00Z');
  assert.equal(kislev19.h.day,19);assert.equal(kislev19.noTachanun,false);
  const kislev9=at('2026-11-19T09:00:00Z','mincha');
  assert.equal(kislev9.h.day,9);assert.equal(kislev9.noTachanun,false);
});
test('Tachanun is omitted on the days printed on page 196',()=>{
  const omitted=[['Tishri',25],['Heshvan',1],['Kislev',27],['Shevat',15],['Nisan',3],['Iyar',14],['Iyar',18],['Sivan',10],['Av',15],['Elul',29]];
  for(const [month,day] of omitted)assert.equal(find(p=>p.h.month===month&&p.h.day===day).noTachanun,true,`${month} ${day}`);
  for(const [month,day] of [['Heshvan',10],['Iyar',19],['Sivan',13],['Elul',28],['Tishri',8]])
    assert.equal(find(p=>p.h.month===month&&p.h.day===day).noTachanun,false,`${month} ${day}`);
});
test('Mincha before a day without Tachanun omits it, except the printed exceptions',()=>{
  assert.equal(find(p=>p.h.month==='Iyar'&&p.h.day===17,'mincha').noTachanun,true);
  assert.equal(find(p=>p.h.month==='Shevat'&&p.h.day===14,'mincha').noTachanun,true);
  // Page 196 note ג: before Erev Rosh Hashana, Erev Yom Kippur and Pesach Sheni.
  assert.equal(find(p=>p.h.month==='Elul'&&p.h.day===28,'mincha').noTachanun,false);
  assert.equal(find(p=>p.h.month==='Tishri'&&p.h.day===8,'mincha').noTachanun,false);
  assert.equal(find(p=>p.h.month==='Iyar'&&p.h.day===13,'mincha').noTachanun,false);
});
test('additional psalms follow the headings on pages 239-243',()=>{
  assert.equal(find(p=>p.fast==='צום גדליה').extraPsalm,'gedaliaTevet');
  assert.equal(find(p=>p.fast==='עשרה בטבת').extraPsalm,'gedaliaTevet');
  assert.equal(find(p=>p.fast==='תענית אסתר').extraPsalm,'esther');
  assert.equal(find(p=>p.purimDay).extraPsalm,'esther');
  assert.equal(find(p=>p.fast==='שבעה עשר בתמוז').extraPsalm,'tamuz');
  assert.equal(find(p=>p.h.month==='Tishri'&&p.h.day===11).extraPsalm,'afterYomKippur');
  assert.equal(at('2026-10-20T09:00:00Z').extraPsalm,null);
});
test('Tisha BeAv is flagged as missing from the current source',()=>{
  const plan=find(p=>p.fast==='תשעה באב');
  assert.equal(plan.tishaBav,true);
  assert.ok(guidance(plan,'shacharit').some(item=>item.includes('סדר תשעה באב')));
});
test('weekday Pesach Chol Hamoed has half Hallel and Omer; late Nisan has no Tachanun',()=>{
  const p=at('2027-04-23T09:00:00Z');
  assert.equal(p.h.month,'Nisan');assert.equal(p.h.day,16);
  assert.equal(p.hallel,'half');assert.equal(p.musaf,'festival');assert.equal(p.omer,1);
  assert.equal(at('2027-04-23T17:00:00Z','maariv').omer,2);
});
test('no weekday blocks on Shabbat or festival',()=>{
  assert.equal(composePrayer('shacharit',at('2026-10-03T09:00:00Z')).length,0);
});
