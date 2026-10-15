import {PageFlip} from './vendor/page-flip.module.js?v=40';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const shouldComplete=(progress,velocity,distance)=>progress>=.38||(distance>28&&velocity>.35);
export const fitPage=(width,height,ratio=930/1450)=>{
  const w=Math.min(width,height*ratio);
  return {width:Math.floor(w),height:Math.floor(w/ratio)};
};

// StPageFlip owns paper geometry only. This adapter owns gestures, RTL mapping,
// loading, zoom and lifecycle. Native mouse/touch handlers MUST stay disabled.
export class BookReader {
  constructor(book,{pageUrl,onChange}){
    this.book=book;this.pageUrl=pageUrl;this.onChange=onChange;
    this.loading=book.querySelector('#loading');this.host=book.querySelector('#flipbook');
    this.abort=new AbortController();this.pointers=new Map();this.epoch=0;
    this.index=0;this.zoom=1;this.pan={x:0,y:0};this.images=new Map();
    const opts={signal:this.abort.signal};
    book.addEventListener('pointerdown',e=>this.down(e),opts);
    book.addEventListener('pointermove',e=>this.motion(e),opts);
    book.addEventListener('pointerup',e=>this.up(e),opts);
    book.addEventListener('pointercancel',e=>this.up(e,true),opts);
    book.addEventListener('lostpointercapture',e=>{if(this.pointers.has(e.pointerId))this.up(e,true);},opts);
    book.addEventListener('wheel',e=>{e.preventDefault();this.setZoom(this.zoom+(e.deltaY<0?.25:-.25));},{...opts,passive:false});
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(book);
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
  }
  async open(blocks,index){
    this.close();this.blocks=blocks;this.index=index;this.active=true;
    this.loading.hidden=false;this.loading.textContent='טוען…';
    const epoch=++this.epoch;
    try{
      const img=await this.load(index);
      if(epoch!==this.epoch)return;
      this.ratio=img?img.naturalWidth/img.naturalHeight:930/1450;
      this.build();this.loading.hidden=true;this.preload();
    }catch{if(epoch===this.epoch){this.loading.textContent='טעינת העמוד נכשלה — גע כאן לניסיון נוסף';this.loading.onclick=()=>this.open(blocks,index);}}
  }
  load(index){
    const block=this.blocks[index];
    if(!block||block.type!=='image')return Promise.resolve(null);
    const url=this.pageUrl(block.id);
    if(!this.images.has(url)){
      const promise=new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>img.decode().then(()=>resolve(img),()=>resolve(img));img.onerror=()=>reject(new Error('Image unavailable'));img.src=url;});
      this.images.set(url,promise);promise.catch(()=>this.images.delete(url));
    }
    return this.images.get(url);
  }
  preload(){
    const near=[this.index-1,this.index,this.index+1,this.index+2];
    const keep=new Set(near.filter(i=>this.blocks[i]?.type==='image').map(i=>this.pageUrl(this.blocks[i].id)));
    for(const key of this.images.keys())if(!keep.has(key))this.images.delete(key);
    for(const n of near)this.load(n).catch(()=>{});
  }
  page(block,i){
    const page=document.createElement('div');page.className='siddur-page';page.dataset.density='soft';page.dataset.index=i;
    const content=document.createElement('div');content.className='siddur-page-content';
    const face=document.createElement('div');face.className='page-face';
    if(block.type==='image'){
      const img=document.createElement('img');if(Math.abs(i-this.index)<=2)img.src=this.pageUrl(block.id);img.alt='עמוד תפילה מסידור תהילת ה׳';img.draggable=false;img.decoding='async';
      // Do not lazy-load transformed/clipped leaves: Safari may never decode them.
      face.append(img);
    }else{
      const note=document.createElement('article');note.className='note-page';
      const h=document.createElement('h2'),p=document.createElement('p');h.textContent=block.title;p.textContent=block.body;note.append(h,p);face.append(note);
    }
    content.append(face);page.append(content);return page;
  }
  build(){
    this.disposeEngine();
    const box=this.book.getBoundingClientRect();this.size=fitPage(box.width,box.height,this.ratio);
    const host=document.createElement('div');host.id='flipbook';host.className='flipbook';host.setAttribute('aria-label','עמודי הסידור');
    host.style.width=this.size.width+'px';host.style.height=this.size.height+'px';
    this.book.insertBefore(host,this.loading);this.host=host;
    host.replaceChildren(...this.blocks.map((b,i)=>this.page(b,i)));
    const engine=this.engine=new PageFlip(host,{
      ...this.size,size:'fixed',autoSize:false,usePortrait:true,startPage:this.index,
      useMouseEvents:false,showPageCorners:false,disableFlipByClick:false,
      drawShadow:true,maxShadowOpacity:.27,flippingTime:600,showCover:false
    });
    engine.on('flip',e=>{
      if(this.engine!==engine)return;
      this.index=Number(e.data);this.host.dataset.page=this.index;
      this.onChange(this.index);this.preload();
    });
    engine.loadFromHTML(host.querySelectorAll('.siddur-page'));
    this.host.dataset.page=this.index;this.setZoom(1);
  }
  disposeEngine(){
    cancelAnimationFrame(this.frame);this.frame=0;this.turn=null;
    if(this.engine){this.engine.destroy();this.engine=null;}
    else this.host?.remove();
  }
  close(){
    this.epoch++;this.active=false;this.pointers.clear();this.gesture=null;
    this.disposeEngine();this.loading.hidden=true;this.loading.onclick=null;
    this.zoom=1;this.pan={x:0,y:0};this.busy=false;
  }
  destroy(){this.close();this.abort.abort();this.observer.disconnect();}
  resize(){
    if(!this.active||!this.engine)return;
    const r=this.book.getBoundingClientRect(),size=fitPage(r.width,r.height,this.ratio);
    if(size.width!==this.size.width||size.height!==this.size.height){this.epoch++;this.busy=false;this.gesture=null;this.pointers.clear();this.build();}
  }
  coords(e){const r=this.host.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
  setZoom(value,x=this.pan.x,y=this.pan.y){
    this.zoom=clamp(value,1,4);
    const maxX=(this.size?.width||0)*(this.zoom-1)/2,maxY=(this.size?.height||0)*(this.zoom-1)/2;
    this.pan={x:clamp(x,-maxX,maxX),y:clamp(y,-maxY,maxY)};
    if(this.zoom===1)this.pan={x:0,y:0};
    // The host's RTL mirror reverses screen X; apply zoom inside the counter-mirror.
    this.host?.querySelectorAll('.page-face').forEach(el=>{el.style.transform=Number(el.closest('[data-index]').dataset.index)===this.index?`translate(${this.pan.x}px,${this.pan.y}px) scale(${this.zoom})`:'';});
    this.book.dataset.zoom=String(this.zoom);
  }
  down(e){
    if(!this.engine||(this.busy&&!this.pointers.size)||this.turn?.settling||e.button>0)return;
    e.preventDefault();this.book.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(this.pointers.size===2){
      this.epoch++;this.busy=false;this.cancelTurn();const [a,b]=[...this.pointers.values()];
      this.pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:this.zoom};
      this.gesture=null;this.lastTap=0;return;
    }
    if(this.pointers.size>2)return;
    const p=this.coords(e);
    this.gesture={start:p,last:p,time:e.timeStamp,lastTime:e.timeStamp,velocity:0,pan:{...this.pan},zoomed:this.zoom>1,step:0};
  }
  motion(e){
    if(!this.pointers.has(e.pointerId))return;
    e.preventDefault();this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(this.pointers.size===2&&this.pinch){
      const [a,b]=[...this.pointers.values()];this.setZoom(this.pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/this.pinch.distance);return;
    }
    const g=this.gesture;if(!g)return;
    const p=this.coords(e),dx=p.x-g.start.x,dy=p.y-g.start.y;
    if(g.zoomed){this.setZoom(this.zoom,g.pan.x+dx,g.pan.y+dy);g.last=p;return;}
    const dt=e.timeStamp-g.lastTime;
    if(dt>0)g.velocity=(p.x-g.last.x)/dt;
    g.last=p;g.lastTime=e.timeStamp;
    if(!g.step){
      if(Math.abs(dx)<8||Math.abs(dx)<Math.abs(dy)*1.1)return;
      g.step=dx>0?1:-1;g.travel=Math.max(this.size.width*.32,g.step>0?this.size.width-g.start.x:g.start.x);
      this.begin(g.step,g.start.y).then(ok=>{if(ok&&this.gesture===g)this.drag(g);});
    }
    if(this.turn&&!this.turn.settling)this.drag(g);
  }
  async begin(step,y){
    if(this.busy||this.turn||this.index+step<0||this.index+step>=this.blocks.length)return false;
    const epoch=this.epoch;this.busy=true;
    try{
      await Promise.all([this.load(this.index),this.load(this.index+step)]);
      if(epoch!==this.epoch)return false;
      await Promise.all([this.index,this.index+step].map(async i=>{
        const img=this.host.querySelector(`.siddur-page[data-index="${i}"] img`);
        if(!img)return;
        if(img.complete&&img.naturalWidth){await img.decode();return;}
        // A failed Safari <img> can retain a rejected decode promise when the
        // same URL is assigned again. Replace it with a fresh element.
        const fresh=new Image();fresh.alt=img.alt;fresh.draggable=false;
        const ready=new Promise((resolve,reject)=>{fresh.onload=resolve;fresh.onerror=reject;});
        fresh.src=this.pageUrl(this.blocks[i].id);img.replaceWith(fresh);
        await ready;await fresh.decode();
      }));
    }
    catch{if(epoch===this.epoch){this.busy=false;this.loading.textContent='העמוד אינו זמין כרגע';this.loading.hidden=false;setTimeout(()=>{if(epoch===this.epoch)this.loading.hidden=true;},2000);}return false;}
    if(epoch!==this.epoch)return false;
    this.busy=false;
    const controller=this.engine.getFlipController(),w=this.size.width,h=this.size.height;
    const corner=y<h/2?'top':'bottom';
    // Geometry is kept in the engine's original LTR coordinate space.
    if(!controller.start({x:step>0?w-2:2,y:corner==='top'?2:h-2}))return false;
    this.turn={step,corner,progress:step>0?0:.5,y:corner==='top'?1:h-1,controller};
    controller.setState('user_fold');
    if(step>0)controller.flippingPage.getElement().classList.add('paper-back');
    return true;
  }
  drag(g){
    if(!this.turn||this.turn.settling)return;
    const distance=Math.max(0,(g.last.x-g.start.x)*g.step);
    // The free corner moves at finger speed. Portrait completion is decided
    // in screen space, then the remaining off-screen travel is animated.
    this.turn.commitProgress=clamp(distance/g.travel,0,1);
    const p=clamp(distance/(2*this.size.width),0,.499);
    const bend=Math.sin(Math.PI*p)*Math.min(95,this.size.height*.13);
    const dy=clamp(g.last.y-g.start.y,-this.size.height*.25,this.size.height*.25);
    const y=this.turn.corner==='top'?clamp(bend+dy,1,this.size.height*.6):clamp(this.size.height-bend+dy,this.size.height*.4,this.size.height-1);
    this.draw(g.step>0?p:.5+p,y);
  }
  draw(progress,y){
    if(!this.turn)return;
    this.turn.progress=progress;this.turn.y=y;
    this.turn.controller.do({x:this.size.width*(1-2*progress),y});
  }
  up(e,cancel=false){
    if(!this.pointers.has(e.pointerId))return;
    this.pointers.delete(e.pointerId);
    if(this.pinch){if(!this.pointers.size)this.pinch=null;this.gesture=null;return;}
    const g=this.gesture;this.gesture=null;if(!g)return;
    if(this.turn){
      const distance=(g.last.x-g.start.x)*g.step;
      const velocity=e.timeStamp-g.lastTime>100?0:g.velocity*g.step;
      this.settle(!cancel&&shouldComplete(this.turn.commitProgress??this.turn.progress,velocity,distance));
    }else if(g.step&&this.busy){
      // Image decoding can finish after pointerup. Only finish this gesture;
      // never leave a detached half-fold waiting for another finger.
      const epoch=this.epoch;
      const wait=()=>{if(epoch!==this.epoch)return;if(this.busy){requestAnimationFrame(wait);return;}if(this.turn){this.drag(g);this.settle(!cancel&&shouldComplete(this.turn.commitProgress??this.turn.progress,g.velocity*g.step,Math.abs(g.last.x-g.start.x)));}};
      requestAnimationFrame(wait);
    }else if(!cancel&&Math.hypot(g.last.x-g.start.x,g.last.y-g.start.y)<10){
      if(this.lastTap&&e.timeStamp-this.lastTap<300){this.setZoom(this.zoom>1?1:2);this.lastTap=0;}else this.lastTap=e.timeStamp;
    }
  }
  settle(commit){
    const turn=this.turn;if(!turn||turn.settling)return;
    turn.settling=true;turn.controller.setState('flipping');
    const start=turn.progress,target=commit?1:(turn.step>0?0:.5),fromY=turn.y,toY=turn.corner==='top'?1:this.size.height-1;
    const duration=this.reduced.matches?0:Math.max(180,480*Math.abs(target-start));
    const began=performance.now();
    const tick=now=>{
      if(this.turn!==turn)return;
      const t=duration?clamp((now-began)/duration,0,1):1,eased=1-(1-t)**3;
      this.draw(start+(target-start)*eased,fromY+(toY-fromY)*eased);
      if(t<1){this.frame=requestAnimationFrame(tick);return;}
      const targetIndex=this.index+(commit?turn.step:0);
      this.clearFold();this.engine.turnToPage(targetIndex);this.setZoom(1);
    };
    this.frame=requestAnimationFrame(tick);
  }
  clearFold(){
    cancelAnimationFrame(this.frame);this.frame=0;
    const render=this.engine.getRender(),ctrl=this.engine.getFlipController();
    render.setBottomPage(null);render.setFlippingPage(null);render.clearShadow();ctrl.reset();ctrl.setState('read');
    this.host.querySelectorAll('.paper-back').forEach(p=>p.classList.remove('paper-back'));this.turn=null;
  }
  cancelTurn(){if(this.turn){this.clearFold();this.engine.turnToPage(this.index);}}
  async move(step){
    if(!this.engine||this.zoom>1||this.busy||this.turn)return;
    if(await this.begin(step,this.size.height*.8)){this.draw(step>0?.035:.535,this.size.height-15);this.settle(true);}
  }
}
