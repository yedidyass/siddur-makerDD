import {planForPrayer,hebrewAt,sunset,TZ} from './calendar.js';
import {composePrayerTree,flattenBlocks,blockIndex,guidance} from './prayer-blocks.js';
import {BookReader} from './book-reader.js?v=40';

const options={latitude:31.95,longitude:34.89,jerusalem:false};
const home=document.querySelector('#home'),reader=document.querySelector('#reader'),book=document.querySelector('#book');
let plans={},prayers={},prayerTrees={},currentPrayer='shacharit',blocks=[],index=0;
const bookReader=new BookReader(book,{pageUrl:id=>pageUrl(id),onChange:next=>{index=next;const block=blocks[index];if(block)localStorage.setItem(storageKey(currentPrayer),block.id);}});
const storageKey=prayer=>`siddur:${prayer}:block-v10`;
const pageUrl=id=>`/pages/page-${id.padStart(3,'0')}.png`;
// The current source contains Shacharit only (review/source-audit.md).
const prayerNames={shacharit:'שחרית'};
function calendarSignature(date) {
  const h=hebrewAt(date,options);
  return `${h.year}:${h.month}:${h.day}:${date>=sunset(date,options.latitude,options.longitude)}`;
}
let signature='';
function refreshCalendar() {
  const now=new Date();
  signature=calendarSignature(now);
  for(const prayer of Object.keys(prayerNames)) {
    plans[prayer]=planForPrayer(now,prayer,options);
    prayerTrees[prayer]=composePrayerTree(prayer,plans[prayer]);
    prayers[prayer]=flattenBlocks(prayerTrees[prayer]);
  }
  // After sunset the home screen describes the coming day; its next prayer is Shacharit.
  const today=now>=sunset(now,options.latitude,options.longitude)?planForPrayer(now,'maariv',options):plans.shacharit;
  document.querySelector('#hebrew-date').textContent=today.dateText;
  const occasion=document.querySelector('#occasion');
  occasion.textContent=today.title;occasion.hidden=!today.title;
  const items=guidance({...today,service:'shacharit'},'shacharit');
  document.querySelector('#today-guidance').replaceChildren(...items.map(value=>{
    const span=document.createElement('span');span.textContent=value;return span;
  }));
  for(const [prayer,plan] of Object.entries(plans)) {
    document.querySelectorAll(`[data-card="${prayer}"] [data-tachanun]`).forEach(button=>button.hidden=plan.noTachanun||plan.unavailable);
    document.querySelectorAll(`[data-card="${prayer}"] [data-weekday-only]`).forEach(button=>button.hidden=!plan.longTachanun||plan.unavailable);
    document.querySelectorAll(`[data-card="${prayer}"] [data-ten-days]`).forEach(button=>button.hidden=!plan.avinuMalkenu||plan.unavailable);
    document.querySelectorAll(`[data-card="${prayer}"] [data-torah]`).forEach(button=>button.hidden=!plan.torahReading||plan.unavailable);
    const status=document.querySelector(`[data-card="${prayer}"] [data-service-guidance]`);
    if(status)status.textContent=plan.unavailable?'סדר יום חול אינו מתאים ליום הזה':guidance(plan,prayer).join(' · ');
  }
}
function openPrayer(prayer,startPage){
  refreshCalendar();
  currentPrayer=prayer;blocks=prayers[prayer];
  if(!blocks.length){document.querySelector(`[data-card="${prayer}"] [data-service-guidance]`)?.scrollIntoView({behavior:'smooth'});return;}
  const savedPage=localStorage.getItem(storageKey(prayer));
  const requested=startPage||savedPage;
  // Anchors are source page IDs or semantic group IDs; both resolve in today's tree.
  const target=requested?blockIndex(prayerTrees[prayer],requested):0;
  index=Math.max(0,target);
  if(reader.hidden)history.pushState({siddurReader:true},'',location.href);
  home.hidden=true;reader.hidden=false;bookReader.open(blocks,index);
}
function closeReader(){bookReader.close();reader.hidden=true;home.hidden=false;refreshCalendar();}
function move(step){bookReader.move(step);}
document.querySelectorAll('.primary').forEach(button=>{
  button.onclick=()=>{
    const card=button.closest('.prayer-card'),opening=!card.classList.contains('open');
    document.querySelectorAll('.prayer-card').forEach(item=>{item.classList.remove('open');item.querySelector('.primary').setAttribute('aria-expanded','false');});
    if(opening){card.classList.add('open');button.setAttribute('aria-expanded','true');}
  };
});
document.querySelectorAll('.quick-starts [data-prayer]').forEach(button=>{
  button.onclick=()=>openPrayer(button.dataset.prayer,button.dataset.start);
});
window.addEventListener('popstate',()=>{if(!reader.hidden)closeReader();});
document.addEventListener('keydown',event=>{
  if(reader.hidden)return;
  if(event.key==='ArrowRight'&&bookReader.zoom===1)move(1);
  if(event.key==='ArrowLeft'&&bookReader.zoom===1)move(-1);
  if(event.key==='+'||event.key==='=')bookReader.setZoom(bookReader.zoom+.5);
  if(event.key==='-')bookReader.setZoom(bookReader.zoom-.5);
  if(event.key==='0')bookReader.setZoom(1);
  if(event.key==='Escape')history.back();
});
function orderMenu(){
  const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',hourCycle:'h23'}).format(new Date()));
  const order=(hour<12?['shacharit','mincha','maariv']:hour<19?['mincha','maariv','shacharit']:['maariv','shacharit','mincha']).filter(name=>name in prayerNames);
  const list=document.querySelector('#prayer-list');
  order.forEach(name=>list.append(document.querySelector(`[data-card="${name}"]`)));
  document.querySelectorAll('[data-card]').forEach(card=>card.classList.toggle('suggested',card.dataset.card===order[0]));
}
refreshCalendar();orderMenu();
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&reader.hidden&&calendarSignature(new Date())!==signature){refreshCalendar();orderMenu();}});
setInterval(()=>{if(reader.hidden&&calendarSignature(new Date())!==signature){refreshCalendar();orderMenu();}},60000);
async function enableOffline(){
  const status=document.querySelector('#offline-status');
  if(!('serviceWorker'in navigator)){status.textContent='הדפדפן אינו תומך בשימוש ללא אינטרנט';return;}
  try{
    await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
    const ready=await caches.has('siddur-kavanat-halev-v1');
    status.textContent=ready?'✓ מוכן לשימוש ללא אינטרנט':'מכין את הסידור לשימוש ללא אינטרנט…';
    status.classList.toggle('ready',ready);
  }catch{status.textContent='השמירה ללא אינטרנט נכשלה';}
}
enableOffline();


