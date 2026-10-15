import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join,extname} from 'node:path';

async function open(page,start='29',url='/'){
  await page.goto(url);
  await page.locator('[data-card="shacharit"] .primary').click();
  await page.locator(`[data-prayer="shacharit"][data-start="${start}"]`).click();
  await expect(page.locator('#flipbook')).toHaveAttribute('data-page',/\d+/);
  await expect(page.locator('#loading')).toBeHidden();
}
async function current(page){return Number(await page.locator('#flipbook').getAttribute('data-page'));}
async function drag(page,from,to,{pause=35,steps=14,release=true}={}){
  const r=await page.locator('#flipbook').boundingBox();
  await page.mouse.move(r.x+r.width*from,r.y+r.height*.78);await page.mouse.down();
  for(let i=1;i<=steps;i++){
    await page.mouse.move(r.x+r.width*(from+(to-from)*i/steps),r.y+r.height*(.78-.035*Math.sin(i/steps*Math.PI)));
    await page.waitForTimeout(pause);
  }
  if(release){await page.mouse.up();await page.waitForTimeout(550);}
}

test.beforeEach(async({page})=>{
  // Stable weekday, independent of CI's date and sunset.
  await page.clock.setFixedTime(new Date('2026-10-07T09:00:00Z'));
});

test('full page proportions; held fold; slow RTL forward and back',async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await open(page);
  const dimensions=await page.locator('.siddur-page[data-index="0"] img').evaluate(img=>({width:img.naturalWidth,height:img.naturalHeight}));
  const box=await page.locator('#flipbook').boundingBox();
  expect(Math.abs(box.width/box.height-dimensions.width/dimensions.height)).toBeLessThan(.005);
  expect(box.width).toBeGreaterThan(380);expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);
  await page.screenshot({path:info.outputPath('01-rest.png')});
  await drag(page,.10,.50,{release:false});
  expect(await current(page)).toBe(0);
  await expect(page.locator('.stf__outerShadow')).toBeVisible();
  await page.screenshot({path:info.outputPath('02-forward-fold.png')});
  await page.mouse.up();await page.waitForTimeout(550);
  await expect(page.locator('#flipbook')).toHaveAttribute('data-page','1');
  await drag(page,.88,.46,{release:false});
  await expect(page.locator('.stf__outerShadow')).toBeVisible();
  await page.screenshot({path:info.outputPath('03-backward-fold.png')});
  await page.mouse.up();await page.waitForTimeout(550);
  await expect(page.locator('#flipbook')).toHaveAttribute('data-page','0');
  expect(errors).toEqual([]);
});

test('short drag cancels; fast flick advances exactly one page; boundaries hold',async({page})=>{
  await open(page);
  await drag(page,.12,.23,{pause:70});
  expect(await current(page)).toBe(0);
  await drag(page,.12,.48,{pause:2,steps:5});
  await expect(page.locator('#flipbook')).toHaveAttribute('data-page','1');
  await page.keyboard.press('ArrowLeft');await page.waitForTimeout(650);expect(await current(page)).toBe(0);
  await drag(page,.88,.1);expect(await current(page)).toBe(0);
});

test('zoom does not turn pages; exit and reopen repeatedly; resize keeps page',async({page},info)=>{
  await open(page,'144');const start=await current(page);
  await page.keyboard.press('+');await drag(page,.2,.8);expect(await current(page)).toBe(start);
  await page.keyboard.press('0');
  await page.keyboard.press('ArrowRight');await page.waitForTimeout(650);expect(await current(page)).toBe(start+1);
  for(let n=0;n<4;n++){
    await page.keyboard.press('Escape');await expect(page.locator('#reader')).toBeHidden();
    await page.locator('[data-prayer="shacharit"][data-start="144"]').click();
    await expect(page.locator('#loading')).toBeHidden();
    await expect(page.locator('#flipbook')).toHaveCount(1);expect(await current(page)).toBe(start);
  }
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(250);
  const box=await page.locator('#flipbook').boundingBox();expect(box.height).toBeLessThanOrEqual(390);expect(box.y).toBeGreaterThanOrEqual(0);
  expect(await current(page)).toBe(start);
  await page.screenshot({path:info.outputPath('04-landscape.png')});
});

test('real touch swipe, pinch interrupts fold, later swipe still works',async({page,browserName})=>{
  test.skip(browserName!=='chromium','CDP touch input');
  await open(page);const cdp=await page.context().newCDPSession(page);const r=await page.locator('#flipbook').boundingBox();
  const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y],id)=>({x:r.x+x*r.width,y:r.y+y*r.height,id}))});
  await touch('touchStart',[[.1,.75]]);
  for(let i=1;i<=12;i++){await touch('touchMove',[[.1+.7*i/12,.75]]);await page.waitForTimeout(25);}
  await touch('touchEnd',[]);await page.waitForTimeout(550);await expect(page.locator('#flipbook')).toHaveAttribute('data-page','1');
  await touch('touchStart',[[.15,.75]]);await touch('touchMove',[[.3,.74]]);await page.waitForTimeout(60);
  await touch('touchStart',[[.3,.74],[.7,.35]]);await touch('touchMove',[[.15,.85],[.85,.2]]);
  await touch('touchEnd',[]);await expect(page.locator('#flipbook')).toHaveAttribute('data-page','1');
  expect(Number(await page.locator('#book').getAttribute('data-zoom'))).toBeGreaterThan(1);
  await page.keyboard.press('0');await drag(page,.12,.85);expect(await current(page)).toBe(2);
});

test('missing next image keeps current leaf, recovery succeeds',async({page})=>{
  let blocked=true;
  await page.route('**/pages/page-030.png',route=>blocked?route.abort():route.continue());
  await open(page);await drag(page,.1,.9);expect(await current(page)).toBe(0);
  blocked=false;await drag(page,.1,.9);await expect(page.locator('#flipbook')).toHaveAttribute('data-page','1');
});

test('closing stops renderer frames; reopening during decoding cannot blank reader',async({page})=>{
  await page.addInitScript(()=>{
    const raf=window.requestAnimationFrame.bind(window);window.__readerFrames=0;
    window.requestAnimationFrame=cb=>raf(t=>{window.__readerFrames++;cb(t);});
  });
  await open(page);await page.keyboard.press('Escape');await page.waitForTimeout(100);
  const before=await page.evaluate(()=>window.__readerFrames);await page.waitForTimeout(200);
  expect(await page.evaluate(()=>window.__readerFrames)).toBe(before);
  await page.locator('[data-prayer="shacharit"][data-start="144"]').click();
  await page.keyboard.press('Escape');
  await page.locator('[data-prayer="shacharit"][data-start="29"]').click();
  await expect(page.locator('#flipbook')).toHaveAttribute('data-page','0');
  await expect(page.locator('#loading')).toBeHidden();await drag(page,.1,.9);await expect(page.locator('#flipbook')).toHaveAttribute('data-page','1');
});

test('cached reader and page turn work with origin server stopped',async({browser})=>{
  // Stop a dedicated origin instead of setOffline: WebKit's offline emulator
  // rejects even service-worker responses (microsoft/playwright#42775).
  const server=createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const file=pathname==='/'?'index.html':pathname.slice(1);
    try{
      const data=await readFile(join(process.cwd(),'public',file));
      const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.jpg':'image/jpeg','.png':'image/png','.webmanifest':'application/manifest+json'};
      res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(data);
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}/`;
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
  try{
    const page=await context.newPage();await page.clock.setFixedTime(new Date('2026-10-07T09:00:00Z'));
    await open(page,'29',url);
    await page.evaluate(async()=>{
      await navigator.serviceWorker.ready;
      if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
    });
    await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
    await open(page,'29',url);await drag(page,.1,.9);
    await expect(page.locator('#flipbook')).toHaveAttribute('data-page','1');
  }finally{await context.close();server.close();server.closeAllConnections();}
});
