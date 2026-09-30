
class SeededRNG {
  constructor(seed=123456789){ this.s = seed >>> 0; }
  next(){ this.s = (1664525 * this.s + 1013904223) >>> 0; return this.s / 4294967296; }
  int(n){ return Math.floor(this.next()*n); }
  chance(p){ return this.next() < p; }
}
class Ecosystem {
  constructor(canvas, graphCanvas, opts={}){
    this.canvas=canvas; this.ctx=canvas.getContext('2d');
    this.graphCanvas=graphCanvas; this.gctx=graphCanvas.getContext('2d');
    this.cols=28; this.rows=18; this.stepNo=0; this.running=false; this.timer=null;
    this.history=[]; this.seed=opts.seed||20260928; this.rng=new SeededRNG(this.seed);
    this.onUpdate=()=>{};
    this.params={
      rabbitBirth:.10, rabbitDeath:.015, rabbitInitial:100,
      wolfBirth:.045, wolfDeath:.035, wolfInitial:12,
      thirdInitial:0, foxInitial:0,
      vegRegrowth:.07, rabbitMetabolic:.55, wolfMetabolic:.85, thirdMetabolic:1.0, foxMetabolic:.8,
      rabbitFoodEnergy:3.5, wolfFoodEnergy:10, thirdFoodEnergy:14, foxFoodEnergy:8,
      rabbitMaxAge:120, wolfMaxAge:145, thirdMaxAge:155, foxMaxAge:140
    };
    this.agents=[]; this.veg=[];
  }
  configure(p){ Object.assign(this.params,p); }
  reset(seed=this.seed){
    this.stop(); this.seed=seed; this.rng=new SeededRNG(seed); this.stepNo=0; this.history=[]; this.agents=[];
    this.veg=Array.from({length:this.rows},()=>Array.from({length:this.cols},()=>this.rng.int(4)));
    this.spawn('rabbit',this.params.rabbitInitial);
    this.spawn('wolf',this.params.wolfInitial);
    if(this.params.thirdInitial>0) this.spawn('third',this.params.thirdInitial);
    if(this.params.foxInitial>0) this.spawn('fox',this.params.foxInitial);
    this.record(); this.render(); this.onUpdate(this.summary());
  }
  spawn(type,n){
    const base={rabbit:7,wolf:13,third:16,fox:12}[type];
    for(let i=0;i<n;i++){
      this.agents.push({type,x:this.rng.int(this.cols),y:this.rng.int(this.rows),energy:base+this.rng.next()*5,age:0});
    }
  }
  counts(){
    const c={rabbit:0,wolf:0,third:0,fox:0};
    for(const a of this.agents) if(c[a.type]!==undefined) c[a.type]++;
    return c;
  }
  summary(){
    const c=this.counts();
    let veg=0;
    for(const row of this.veg) for(const v of row) veg+=v;
    return {...c,veg,step:this.stepNo};
  }
  record(){
    const c=this.counts();
    this.history.push({step:this.stepNo,...c});
    // 전체 STEP 기록을 유지하여 시작부터 종료까지 한 그래프에 표시
  }
  start(interval=180){
    if(this.running) return;
    this.running=true;
    this.timer=setInterval(()=>this.step(),interval);
  }
  stop(){ if(this.timer) clearInterval(this.timer); this.timer=null; this.running=false; }
  move(a){
    const dx=this.rng.int(3)-1, dy=this.rng.int(3)-1;
    a.x=(a.x+dx+this.cols)%this.cols; a.y=(a.y+dy+this.rows)%this.rows;
  }
  randomAt(type,x,y){
    const matches=[];
    for(let i=0;i<this.agents.length;i++){
      const a=this.agents[i];
      if(a.type===type && a.x===x && a.y===y) matches.push(i);
    }
    return matches.length?matches[this.rng.int(matches.length)]:-1;
  }
  killIndex(i){ if(i>=0 && i<this.agents.length) this.agents[i]._dead=true; }
  reproduce(parent,type,rate){
    if(this.rng.chance(rate) && parent.energy>5){
      parent.energy*=.72;
      this.agents.push({type,x:parent.x,y:parent.y,energy:Math.max(4,parent.energy*.7),age:0});
    }
  }
  step(){
    this.stepNo++;
    // vegetation regrowth
    for(let y=0;y<this.rows;y++) for(let x=0;x<this.cols;x++){
      if(this.veg[y][x]<3 && this.rng.chance(this.params.vegRegrowth)) this.veg[y][x]++;
    }
    // shuffle
    for(let i=this.agents.length-1;i>0;i--){ const j=this.rng.int(i+1); [this.agents[i],this.agents[j]]=[this.agents[j],this.agents[i]]; }
    const originals=[...this.agents];
    for(const a of originals){
      if(a._dead) continue;
      a.age++; this.move(a);
      const metabolic={rabbit:this.params.rabbitMetabolic,wolf:this.params.wolfMetabolic,third:this.params.thirdMetabolic,fox:this.params.foxMetabolic}[a.type];
      a.energy-=metabolic;
      if(a.type==='rabbit'){
        if(this.veg[a.y][a.x]>0){ this.veg[a.y][a.x]--; a.energy+=this.params.rabbitFoodEnergy; }
        if(this.rng.chance(this.params.rabbitDeath) || a.energy<=0 || a.age>this.params.rabbitMaxAge){ a._dead=true; continue; }
        this.reproduce(a,'rabbit',this.params.rabbitBirth);
      } else if(a.type==='wolf'){
        const idx=this.randomAt('rabbit',a.x,a.y);
        if(idx>=0 && !this.agents[idx]._dead){ this.killIndex(idx); a.energy+=this.params.wolfFoodEnergy; }
        if(this.rng.chance(this.params.wolfDeath) || a.energy<=0 || a.age>this.params.wolfMaxAge){ a._dead=true; continue; }
        this.reproduce(a,'wolf',this.params.wolfBirth);
      } else if(a.type==='third'){
        const idx=this.randomAt('wolf',a.x,a.y);
        if(idx>=0 && !this.agents[idx]._dead){ this.killIndex(idx); a.energy+=this.params.thirdFoodEnergy; }
        if(this.rng.chance(.028) || a.energy<=0 || a.age>this.params.thirdMaxAge){ a._dead=true; continue; }
        this.reproduce(a,'third',.018);
      } else if(a.type==='fox'){
        const idx=this.randomAt('rabbit',a.x,a.y);
        if(idx>=0 && !this.agents[idx]._dead){ this.killIndex(idx); a.energy+=this.params.foxFoodEnergy; }
        if(this.rng.chance(.032) || a.energy<=0 || a.age>this.params.foxMaxAge){ a._dead=true; continue; }
        this.reproduce(a,'fox',.035);
      }
    }
    this.agents=this.agents.filter(a=>!a._dead).slice(0,1600);
    this.record(); this.render(); this.onUpdate(this.summary());
  }
  render(){
    const dpr=Math.max(1,window.devicePixelRatio||1);
    const rect=this.canvas.getBoundingClientRect();
    const cssW=Math.max(400,Math.floor(rect.width||840));
    const cssH=Math.round(cssW/1.52);
    if(this.canvas.width!==Math.round(cssW*dpr)||this.canvas.height!==Math.round(cssH*dpr)){
      this.canvas.width=Math.round(cssW*dpr); this.canvas.height=Math.round(cssH*dpr);
    }
    const ctx=this.ctx; ctx.setTransform(dpr,0,0,dpr,0,0);
    const w=cssW,h=cssH,cw=w/this.cols,ch=h/this.rows;
    const greens=['#2c6a43','#3b7b4b','#5d9458','#83ad69'];
    for(let y=0;y<this.rows;y++) for(let x=0;x<this.cols;x++){
      ctx.fillStyle=greens[this.veg[y][x]];
      ctx.fillRect(x*cw,y*ch,cw+1,ch+1);
    }
    ctx.font=`${Math.max(12,Math.min(cw,ch)*.72)}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    const icon={rabbit:'🐇',wolf:'🐺',third:'🦅',fox:'🦊'};
    // cap drawn icons per type for readability while counts remain exact
    const caps={rabbit:180,wolf:80,third:40,fox:50}, drawn={rabbit:0,wolf:0,third:0,fox:0};
    for(const a of this.agents){
      if(drawn[a.type]>=caps[a.type]) continue;
      drawn[a.type]++;
      ctx.fillText(icon[a.type],(a.x+.5)*cw,(a.y+.52)*ch);
    }
    this.drawGraph();
  }
  drawGraph(){
    const c=this.graphCanvas,g=this.gctx,dpr=Math.max(1,window.devicePixelRatio||1);
    const rect=c.getBoundingClientRect(), cssW=Math.max(700,Math.floor(rect.width||1000)), cssH=330;
    if(c.width!==Math.round(cssW*dpr)||c.height!==Math.round(cssH*dpr)){ c.width=Math.round(cssW*dpr);c.height=Math.round(cssH*dpr); }
    g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,cssW,cssH);
    g.fillStyle='#fff'; g.fillRect(0,0,cssW,cssH);
    const L=58,R=58,T=18,B=42,pw=cssW-L-R,ph=cssH-T-B;
    const data=this.history.length?this.history:[{step:0,rabbit:0,wolf:0,third:0,fox:0}];
    const maxRabbit=Math.max(10,...data.map(d=>d.rabbit));
    const maxPred=Math.max(5,...data.flatMap(d=>[d.wolf,d.third,d.fox]));
    const yLMax=Math.ceil(maxRabbit/20)*20, yRMax=Math.ceil(maxPred/5)*5;
    g.strokeStyle='#d7ddd7'; g.lineWidth=1; g.setLineDash([4,4]);
    for(let i=0;i<=5;i++){
      const y=T+ph*i/5; g.beginPath();g.moveTo(L,y);g.lineTo(cssW-R,y);g.stroke();
      g.fillStyle='#647168';g.font='12px system-ui';g.textAlign='right';g.fillText(String(Math.round(yLMax*(1-i/5))),L-8,y+4);
      g.textAlign='left';g.fillText(String(Math.round(yRMax*(1-i/5))),cssW-R+8,y+4);
    }
    g.setLineDash([]); g.strokeStyle='#26382d';g.lineWidth=1.4;
    g.beginPath();g.moveTo(L,T);g.lineTo(L,T+ph);g.lineTo(cssW-R,T+ph);g.stroke();
    g.beginPath();g.moveTo(cssW-R,T);g.lineTo(cssW-R,T+ph);g.stroke();
    const firstStep=data[0].step||0, lastStep=data[data.length-1].step||0;
    g.fillStyle='#647168'; g.font='11px system-ui'; g.textAlign='center';
    for(let i=0;i<=5;i++){
      const xx=L+pw*i/5;
      const sv=Math.round(firstStep+(lastStep-firstStep)*i/5);
      g.fillText(String(sv),xx,T+ph+18);
    }
    const n=data.length, x=i=>L+(n<=1?0:i/(n-1))*pw;
    const yL=v=>T+ph-(v/yLMax)*ph, yR=v=>T+ph-(v/yRMax)*ph;
    const draw=(key,color,yFn)=>{
      g.strokeStyle=color;g.lineWidth=2.6;g.beginPath();
      data.forEach((d,i)=>{ const X=x(i),Y=yFn(d[key]); if(i===0)g.moveTo(X,Y); else g.lineTo(X,Y); });g.stroke();
    };
    draw('rabbit','#24a55b',yL); draw('wolf','#e24f5b',yR);
    if(this.params.thirdInitial>0) draw('third','#8b58a5',yR);
    if(this.params.foxInitial>0) draw('fox','#ef852e',yR);
    g.fillStyle='#49574e';g.font='12px system-ui';g.textAlign='center';g.fillText('STEP',L+pw/2,cssH-9);
    g.save();g.translate(16,T+ph/2);g.rotate(-Math.PI/2);g.fillText('피식자 개체수',0,0);g.restore();
    g.save();g.translate(cssW-10,T+ph/2);g.rotate(Math.PI/2);g.fillText('포식자 개체수',0,0);g.restore();
  }
}
function updatePyramid(prefix,s){
  const total=Math.max(1,s.veg,s.rabbit,s.wolf,s.third);
  const set=(id,val,min=12)=>{ const el=document.getElementById(prefix+id); if(el) el.style.width=Math.max(min,Math.min(100,val/total*100))+'%'; };
  set('Plant',s.veg,35); set('Rabbit',s.rabbit,24); set('Wolf',s.wolf,18); set('Third',s.third,14);
  const ids={PlantCount:s.veg,RabbitCount:s.rabbit,WolfCount:s.wolf,ThirdCount:s.third,FoxCount:s.fox};
  Object.entries(ids).forEach(([k,v])=>{const el=document.getElementById(prefix+k);if(el)el.textContent=Math.round(v);});
}
const RECORDS_KEY='rw_experiment_records_v2';
const MAX_LOCAL_RECORDS=6;

function getExperimentRecords(){
  try{
    const data=JSON.parse(localStorage.getItem(RECORDS_KEY)||'[]');
    return Array.isArray(data)?data:[];
  }catch(e){ return []; }
}
function setExperimentRecords(records){
  localStorage.setItem(RECORDS_KEY,JSON.stringify(records.slice(-MAX_LOCAL_RECORDS)));
}
function makeRecordId(){
  return 'rec_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
}
async function captureCompressed(targetId){
  if(typeof html2canvas!=='function') throw new Error('캡처 도구를 불러오지 못했습니다.');
  const source=document.getElementById(targetId);
  const raw=await html2canvas(source,{backgroundColor:'#edf3ed',scale:1,useCORS:true,logging:false});
  const maxW=1200;
  const ratio=Math.min(1,maxW/raw.width);
  const out=document.createElement('canvas');
  out.width=Math.max(1,Math.round(raw.width*ratio));
  out.height=Math.max(1,Math.round(raw.height*ratio));
  out.getContext('2d').drawImage(raw,0,0,out.width,out.height);
  return out.toDataURL('image/jpeg',0.68);
}
async function saveExperimentRecord(targetId,meta){
  try{
    const imageData=await captureCompressed(targetId);
    const records=getExperimentRecords();
    const record={
      id:makeRecordId(),
      savedAt:new Date().toISOString(),
      type:meta.type||'모의실험',
      title:meta.title||'실험 기록',
      step:Number(meta.step||0),
      score:Number(meta.score||0),
      params:meta.params||{},
      finalCounts:meta.finalCounts||{},
      imageData
    };
    records.push(record);
    while(records.length>MAX_LOCAL_RECORDS) records.shift();
    setExperimentRecords(records);
    alert(`실험 기록에 저장되었습니다. (${records.length}/${MAX_LOCAL_RECORDS})
제출 페이지에서 여러 기록을 선택해 비교할 수 있습니다.`);
    return record;
  }catch(err){
    alert('기록 저장 중 문제가 발생했습니다: '+err.message);
    return null;
  }
}
