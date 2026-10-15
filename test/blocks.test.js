import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {page,group,ref,when,choose,resolveBlocks,flattenBlocks,blockIndex} from '../public/block-engine.js';
import {blockCatalog,sourcePages} from '../public/block-catalog.js';
import {prayerRecipes} from '../public/prayer-recipes.js';
import {composePrayerTree,composePrayer} from '../public/prayer-blocks.js';
import {planForPrayer} from '../public/calendar.js';
const at=(date,service='shacharit')=>planForPrayer(new Date(date),service);
const ids=date=>composePrayer('shacharit',at(date)).map(block=>block.id);
const follows=(list,a,b)=>list[list.indexOf(a)+1]===b;
// Reference weekdays in Cheshvan 5787 (Tachanun is said, no special additions).
const MON='2026-10-19T07:00:00Z',TUE='2026-10-20T07:00:00Z',WED='2026-10-21T07:00:00Z',
  THU='2026-10-22T07:00:00Z',FRI='2026-10-23T07:00:00Z',SUN='2026-10-25T07:00:00Z';
function* weekdaysOfYear() {
  for(let day=0;day<400;day++){
    const plan=planForPrayer(new Date(Date.UTC(2026,8,1+day,7)),'shacharit');
    if(!plan.unavailable)yield plan;
  }
}

test('resolved Shacharit retains primitive, group, and nested group levels',()=>{
  const tree=composePrayerTree('shacharit',at(TUE));
  const opening=tree.children.find(node=>node.id==='shacharit-opening');
  assert.equal(opening.type,'group');
  assert.equal(opening.children[0].id,'akeda');
  assert.equal(opening.children[0].children[0].type,'image');
  const amidah=opening.children.find(node=>node.id==='amidah');
  assert.equal(amidah.children.at(-1).id,'193');
  const ending=tree.children.find(node=>node.id==='shacharit-ending');
  assert.ok(ending.children.some(node=>node.id==='song-of-day'));
});
test('serialized catalogs and recipes resolve without executable catalog functions',()=>{
  const plan=at(MON);
  const catalog=JSON.parse(JSON.stringify(blockCatalog)),recipe=JSON.parse(JSON.stringify(prayerRecipes.shacharit));
  assert.deepEqual(resolveBlocks(recipe,catalog,plan),composePrayerTree('shacharit',plan));
});
test('a shared group can be nested and reused without mutation',()=>{
  const catalog={shared:group('shared','shared',[page('6')])};
  const recipe=group('prayer','prayer',[ref('shared'),group('nested','nested',[ref('shared')])]);
  const tree=resolveBlocks(recipe,catalog,{});
  assert.deepEqual(flattenBlocks(tree).map(node=>node.id),['6','6']);
  tree.children[0].children[0].id='changed';
  assert.equal(tree.children[1].children[0].children[0].id,'6');
  assert.equal(catalog.shared.children[0].id,'6');
});
test('missing references and recursive groups fail explicitly',()=>{
  assert.throws(()=>resolveBlocks(group('root','',[ref('missing')]),{},{}),/Unknown block/);
  assert.throws(()=>resolveBlocks(ref('a'),{a:group('a','',[ref('b')]),b:group('b','',[ref('a')])},{}),/Cyclic block/);
});
test('all catalog branches reference existing blocks and contain no cycles',()=>{
  function scan(node,stack=[]) {
    if(Array.isArray(node)){node.forEach(item=>scan(item,stack));return;}
    if(node.type==='ref'){
      assert.ok(Object.hasOwn(blockCatalog,node.ref),node.ref);
      assert.ok(!stack.includes(node.ref),stack.join(' -> '));
      scan(blockCatalog[node.ref],[...stack,node.ref]);return;
    }
    if(node.type==='group')scan(node.children,stack);
    if(node.type==='when'){scan(node.then,stack);scan(node.otherwise,stack);}
    if(node.type==='choose'){Object.values(node.cases).forEach(item=>scan(item,stack));scan(node.fallback,stack);}
  }
  Object.values(prayerRecipes).forEach(recipe=>scan(recipe));
  Object.values(blockCatalog).forEach(block=>scan(block));
});
test('conditions resolve at any nesting level and empty groups disappear',()=>{
  const recipe=group('root','',[
    group('optional','',[when('enabled',page('6'))]),
    choose('variant',{first:group('chosen','',[page('7')])},page('8'))
  ]);
  assert.deepEqual(flattenBlocks(resolveBlocks(recipe,{},{})).map(node=>node.id),['8']);
  assert.deepEqual(flattenBlocks(resolveBlocks(recipe,{},{enabled:true,variant:'first'})).map(node=>node.id),['6','7']);
});
test('every weekday of the year follows the printed order without repeating a page',()=>{
  for(const plan of weekdaysOfYear()){
    const tree=composePrayerTree('shacharit',plan);
    const pages=flattenBlocks(tree).map(block=>Number(block.id));
    assert.deepEqual(flattenBlocks(tree),composePrayer('shacharit',plan));
    for(let i=1;i<pages.length;i++)assert.ok(pages[i]>pages[i-1],`${plan.dateText}: ${pages[i-1]} -> ${pages[i]}`);
    for(const block of flattenBlocks(tree))assert.equal(block.type,'image');
  }
});
test('every displayed page is a published full-page asset that is cached offline',()=>{
  const files=new Set(readdirSync(new URL('../public/pages/',import.meta.url)));
  const sw=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
  assert.ok(sw.includes('...range(29, 42), ...range(69, 250)'));
  const expected=[];for(let n=29;n<=42;n++)expected.push(String(n));for(let n=69;n<=250;n++)expected.push(String(n));
  assert.deepEqual(sourcePages,expected);
  for(const id of sourcePages)assert.ok(files.has(`page-${id.padStart(3,'0')}.png`),id);
  assert.equal([...files].filter(name=>name.endsWith('.png')).length,sourcePages.length);
  for(const plan of weekdaysOfYear())for(const block of composePrayer('shacharit',plan))assert.ok(sourcePages.includes(block.id));
});
test('engine modules and versioned assets are included in the offline shell',()=>{
  const sw=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
  for(const module of ['block-engine','block-catalog','prayer-recipes'])assert.ok(sw.includes(`'/${module}.js'`));
  assert.ok(sw.includes("'siddur-kavanat-halev-v1'"));
  for(const asset of ["'/app.js?v=40'","'/styles.css?v=40'","'/vendor/page-flip.module.js?v=40'","'/book-reader.js?v=40'"])assert.ok(sw.includes(asset));
  const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.ok(app.includes("caches.has('siddur-kavanat-halev-v1')"));
  assert.ok(app.includes("'./book-reader.js?v=40'"));
  const reader=readFileSync(new URL('../public/book-reader.js',import.meta.url),'utf8');
  assert.ok(reader.includes("'./vendor/page-flip.module.js?v=40'"));
});
test('pages that complete a required section are always shown',()=>{
  for(const plan of weekdaysOfYear()){
    const list=composePrayer('shacharit',plan).map(block=>block.id);
    // 193 ends the Amidah; 196 ends אבינו מלכנו and holds יהי שם; 217 holds the half Kaddish;
    // 220 ends אשרי; 238-239 hold הושיענו; 244 holds קדיש יהא שלמא.
    for(const id of ['29','42','69','193','196','217','218','220','226','228','229','238','239','244','250'])
      assert.ok(list.includes(id),`${plan.dateText} missing ${id}`);
    for(let n=69;n<=193;n++)assert.ok(list.includes(String(n)),`${plan.dateText} missing ${n}`);
  }
});
test('Song of the Day selects the minimum span of complete pages for each weekday',()=>{
  const expected={[SUN]:['230','231'],[MON]:['231','232','233'],[TUE]:['233','234'],
    [WED]:['234','235','236'],[THU]:['236','237'],[FRI]:['237']};
  for(const [date,pages] of Object.entries(expected)){
    const tree=composePrayerTree('shacharit',at(date));
    const song=tree.children.find(node=>node.id==='shacharit-ending').children.find(node=>node.id==='song-of-day');
    assert.deepEqual(flattenBlocks(song).map(block=>block.id),pages);
    assert.equal(flattenBlocks(tree)[blockIndex(tree,'song-of-day')].id,pages[0]);
  }
  assert.ok(follows(ids(FRI),'237','238'));
});
test('ordinary weekday Tachanun returns to the half Kaddish on page 217',()=>{
  const tuesday=ids(TUE);
  assert.ok(follows(tuesday,'193','196'));assert.ok(follows(tuesday,'205','217'));
  assert.ok(!tuesday.includes('206'));assert.ok(!tuesday.includes('215'));
  assert.ok(follows(tuesday,'226','227'));
});
test('Monday and Thursday add Tachanunim and the Torah service in printed order',()=>{
  for(const date of [MON,THU]){
    const list=ids(date);
    for(let n=196;n<=218;n++)assert.ok(list.includes(String(n)),`${date} ${n}`);
  }
});
test('a day without Tachanun skips Tachanun and תפלה לדוד',()=>{
  const plan=at('2026-10-06T07:00:00Z');   // 25 Tishri, Tuesday
  assert.equal(plan.noTachanun,true);assert.equal(plan.torahReading,false);
  const list=composePrayer('shacharit',plan).map(block=>block.id);
  assert.ok(follows(list,'196','217'));
  assert.ok(!list.includes('197'));assert.ok(!list.includes('227'));
  assert.ok(follows(list,'226','228'));
});
test('a Torah reading without Tachanunim keeps the Kaddish page before the Torah service',()=>{
  const plan=at('2026-12-07T07:00:00Z');   // Chanukah, Monday
  assert.equal(plan.noTachanun,true);assert.equal(plan.torahReading,true);
  const list=composePrayer('shacharit',plan).map(block=>block.id);
  assert.deepEqual(list.slice(list.indexOf('196'),list.indexOf('218')+1),['196','214','215','216','217','218']);
});
test('Avinu Malkenu appears only during the Ten Days of Repentance',()=>{
  const tenDays=ids('2026-09-15T07:00:00Z');   // 4 Tishri
  assert.deepEqual(tenDays.slice(tenDays.indexOf('193'),tenDays.indexOf('196')+1),['193','194','195','196']);
  for(const date of [MON,TUE])assert.ok(!ids(date).includes('194'));
});
test('additional psalms use the pages on which they begin and end',()=>{
  const expected={gedaliaTevet:['240'],chanukah:['240','241'],esther:['241','242'],tamuz:['242','243'],afterYomKippur:[]};
  const seen=new Set();
  for(const plan of weekdaysOfYear()){
    const list=composePrayer('shacharit',plan).map(block=>block.id);
    const extra=list.slice(list.indexOf('239')+1,list.indexOf('244'));
    assert.deepEqual(extra,plan.extraPsalm?expected[plan.extraPsalm]:[],plan.dateText);
    if(plan.extraPsalm)seen.add(plan.extraPsalm);
  }
  assert.deepEqual([...seen].sort(),Object.keys(expected).sort());
});
