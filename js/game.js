/* =====================================================================
   PrevenCraft · MOTOR DEL JOC
   Mundo 3D (Three.js r128), personaje, cámara, HUD, ventanas, informe,
   PDF (jsPDF 2.5.1) y envío opcional del informe.
   El contenido didáctico está en js/content.js y los parámetros en
   js/config.js: normalmente no hace falta tocar este archivo.
   ===================================================================== */
(()=>{
'use strict';
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;};

/* ---------------- Renderer ---------------- */
const canvas=$('#c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
const scene=new THREE.Scene();
const SKY=0x8fc7f0;
scene.background=new THREE.Color(SKY);
scene.fog=new THREE.Fog(SKY,45,130);
const camera=new THREE.PerspectiveCamera(60,1,.1,400);
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
addEventListener('resize',resize);resize();
scene.add(new THREE.HemisphereLight(0xeef6ff,0x6b7358,.62));scene.add(new THREE.AmbientLight(0xffffff,.1));
const sunL=new THREE.DirectionalLight(0xffffff,.6);sunL.position.set(30,60,25);scene.add(sunL);

/* ---------------- Pixel textures ---------------- */
function hexRGB(h){const n=parseInt(h.slice(1),16);return[n>>16&255,n>>8&255,n&255];}
function tex(draw,S=16){const c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');draw(g,S);const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}
function noisy(g,S,base,amt){const[r,gg,b]=hexRGB(base);for(let y=0;y<S;y++)for(let x=0;x<S;x++){const k=(Math.random()-.5)*amt;g.fillStyle=`rgb(${r+k|0},${gg+k|0},${b+k|0})`;g.fillRect(x,y,1,1);}}
const planksDraw=base=>(g,S)=>{noisy(g,S,base,22);g.fillStyle='rgba(55,28,8,.45)';for(let y=3;y<S;y+=4)g.fillRect(0,y,S,1);[[5,0],[12,4],[3,8],[10,12]].forEach(([x,y])=>g.fillRect(x,y,1,3));};
const T={
  grass:tex((g,S)=>{noisy(g,S,'#5f9e3c',34);g.fillStyle='rgba(30,70,20,.35)';for(let i=0;i<10;i++)g.fillRect(Math.random()*S|0,Math.random()*S|0,1,1);}),
  concrete:tex((g,S)=>{noisy(g,S,'#959a9f',16);g.fillStyle='rgba(0,0,0,.09)';g.fillRect(0,15,16,1);g.fillRect(15,0,1,16);}),
  planks:tex(planksDraw('#b07f4c')),
  office:tex(planksDraw('#caa477')),
  wood:tex(planksDraw('#6b4526')),
  stone:tex((g,S)=>{noisy(g,S,'#82858d',20);g.fillStyle='#5c5f67';for(let y=0;y<S;y+=4){g.fillRect(0,y,S,1);const off=(y/4)%2?4:0;for(let x=off;x<S;x+=8)g.fillRect(x,y,1,4);}}),
  metal:tex((g,S)=>{noisy(g,S,'#8f99a3',10);g.fillStyle='#c6cdd4';g.fillRect(0,0,S,1);g.fillStyle='#5f6872';g.fillRect(0,S-1,S,1);[[2,2],[13,2],[2,13],[13,13]].forEach(([x,y])=>g.fillRect(x,y,1,1));}),
  water:tex((g,S)=>{noisy(g,S,'#2f70a7',16);g.fillStyle='rgba(255,255,255,.28)';for(let i=0;i<6;i++)g.fillRect(Math.random()*13|0,Math.random()*16|0,3,1);}),
  stripes:tex((g,S)=>{for(let y=0;y<S;y++)for(let x=0;x<S;x++){g.fillStyle=((x+y)>>2)%2?'#1b1b1b':'#f2c230';g.fillRect(x,y,1,1);}}),
  sand:tex((g,S)=>noisy(g,S,'#d8b675',26)),
  hull:tex((g,S)=>noisy(g,S,'#eeeee8',8)),
  hullBlue:tex((g,S)=>{noisy(g,S,'#22508c',14);g.fillStyle='#e9e9e3';g.fillRect(0,0,S,2);}),
  chest:tex((g,S)=>{noisy(g,S,'#8a5a2b',18);g.fillStyle='#4a2c12';g.fillRect(0,0,S,1);g.fillRect(0,S-1,S,1);g.fillRect(0,0,1,S);g.fillRect(S-1,0,1,S);}),
};
const M={};for(const k in T)M[k]=new THREE.MeshLambertMaterial({map:T[k]});
const CM={};const cm=c=>CM[c]||(CM[c]=new THREE.MeshLambertMaterial({color:c}));
const BM={};const bm=c=>BM[c]||(BM[c]=new THREE.MeshBasicMaterial({color:c}));
const matOf=m=>typeof m==='string'?(m[0]==='#'?cm(m):M[m]):m;

/* ---------------- World helpers ---------------- */
const BOX=new THREE.BoxGeometry(1,1,1);
const SB={};const solid=new Set();const K=(x,z)=>x+','+z;
const setSolid=(x,z,v=true)=>v?solid.add(K(x,z)):solid.delete(K(x,z));
const tall=new Set();
function blk(x,y,z,m){(SB[m]||(SB[m]=[])).push([x,y,z]);if(y>=0&&y<2)setSolid(x,z);if(y>=2)tall.add(K(x,z));}
function flushBlocks(){const d=new THREE.Object3D();for(const m in SB){const a=SB[m];const im=new THREE.InstancedMesh(BOX,M[m],a.length);a.forEach((p,i)=>{d.position.set(p[0]+.5,p[1]+.5,p[2]+.5);d.updateMatrix();im.setMatrixAt(i,d.matrix);});scene.add(im);}}
function mbox(w,h,d,mat,x,y,z,parent=scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),matOf(mat));m.position.set(x,y,z);parent.add(m);return m;}
function mcyl(r,h,mat,x,y,z,parent=scene,seg=16){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg),matOf(mat));m.position.set(x,y,z);parent.add(m);return m;}
function ground(x0,z0,x1,z1,key,y=.002){const w=x1-x0,d=z1-z0;const t=T[key].clone();t.needsUpdate=true;t.repeat.set(w,d);const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshLambertMaterial({map:t}));m.rotation.x=-Math.PI/2;m.position.set(x0+w/2,y,z0+d/2);scene.add(m);return m;}
function hull(x0,z0,len,wid,y0,stands=true){
  for(let i=0;i<len;i++){const bow=Math.max(0,i-(len-4));let w=Math.max(1,wid-2*bow);const off=(wid-w)/2;
    for(let j=0;j<w;j++){const z=z0+off+j,edge=j===0||j===w-1;
      if(!(edge&&w>2))blk(x0+i,y0,z,'hull');
      blk(x0+i,y0+1,z,'hull');
      blk(x0+i,y0+2,z,(edge||w<3)?'hullBlue':'planks');}}
  if(stands)for(let i=1;i<len-2;i+=4)blk(x0+i,y0-1,z0+Math.floor(wid/2),'wood');
}
function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t;}
function wallBoard(w,h,texture,x,y,z,rotY=0){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture}));m.position.set(x,y,z);m.rotation.y=rotY;scene.add(m);return m;}

/* ---------------- Safety signs (RD 485/1997) ----------------
   Catalogue SIGNS and CAT_HELP live in js/content.js; here only the drawing. */
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();g.fill();}
function picto(g,p,fg,bg){
  g.fillStyle=fg;g.strokeStyle=fg;g.lineWidth=.16;g.lineCap='round';g.lineJoin='round';
  const P=pts=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();};
  const C=(x,y,r)=>{g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();};
  const L=(...pts)=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();};
  switch(p){
    case 'bolt':P([[.3,-1],[-.5,.15],[-.02,.15],[-.3,1],[.55,-.25],[.08,-.25],[.4,-1]]);break;
    case 'exclam':g.fillRect(-.14,-.95,.28,1.2);C(0,.7,.17);break;
    case 'fall':g.fillRect(-1,.35,1.05,.65);C(.55,-.65,.18);L([.47,-.42],[.2,.12]);L([.42,-.28],[.88,-.5]);L([.4,-.22],[-.02,-.5]);L([.2,.12],[.62,.42]);L([.2,.12],[.12,.66]);break;
    case 'skull':C(0,-.3,.58);g.fillRect(-.32,.12,.64,.32);g.fillStyle=bg;C(-.23,-.32,.16);C(.23,-.32,.16);g.fillRect(-.12,.2,.07,.24);g.fillRect(.05,.2,.07,.24);g.fillStyle=fg;L([-.85,.55],[.85,.95]);L([.85,.55],[-.85,.95]);break;
    case 'flame':g.beginPath();g.moveTo(0,1);g.bezierCurveTo(-.85,1,-.8,.1,-.3,-.35);g.bezierCurveTo(-.32,.05,-.12,.2,0,-.1);g.bezierCurveTo(.12,-.5,0,-.8,.12,-1);g.bezierCurveTo(.85,-.4,.85,1,0,1);g.fill();break;
    case 'radio':C(0,.55,.17);L([0,.55],[0,1]);g.lineWidth=.13;for(const r of[.42,.72,1]){g.beginPath();g.arc(0,.55,r,-Math.PI*.8,-Math.PI*.2);g.stroke();}break;
    case 'ear':C(0,.25,.45);g.lineWidth=.2;g.beginPath();g.arc(0,.15,.7,Math.PI,0);g.stroke();rr(g,-.92,-.05,.36,.7,.12);rr(g,.56,-.05,.36,.7,.12);break;
    case 'goggles':g.lineWidth=.14;L([-1,-.05],[1,-.05]);C(-.38,0,.32);C(.38,0,.32);g.fillStyle=bg;C(-.38,0,.16);C(.38,0,.16);break;
    case 'shield':C(0,-.05,.48);g.fillRect(-.72,-.78,1.44,.18);g.globalAlpha=.5;g.fillRect(-.64,-.62,1.28,1.3);g.globalAlpha=1;break;
    case 'glove':rr(g,-.45,-.05,.9,1,.15);for(let i=0;i<4;i++)rr(g,-.45+i*.235,-.88,.19,.95,.09);g.save();g.translate(.42,.28);g.rotate(-.7);rr(g,0,-.1,.5,.22,.1);g.restore();break;
    case 'helmet':g.beginPath();g.arc(0,.28,.72,Math.PI,0);g.fill();g.fillRect(-.95,.22,1.9,.2);g.fillStyle=bg;g.fillRect(-.07,-.4,.14,.55);break;
    case 'boot':P([[-.45,-.9],[.12,-.9],[.12,.15],[.85,.3],[.92,.82],[-.45,.82]]);break;
    case 'cig':g.fillRect(-.85,.15,1.35,.26);g.fillRect(.56,.15,.26,.26);g.lineWidth=.1;g.beginPath();g.moveTo(.68,.02);g.bezierCurveTo(.48,-.3,.88,-.5,.68,-.85);g.stroke();break;
    case 'drop':g.beginPath();g.moveTo(0,-.9);g.bezierCurveTo(.15,-.5,.6,-.1,.6,.3);g.arc(0,.3,.6,0,Math.PI);g.bezierCurveTo(-.6,-.1,-.15,-.5,0,-.9);g.fill();break;
    case 'ext':rr(g,-.3,-.35,.6,1.3,.2);g.fillRect(-.12,-.62,.24,.3);g.fillRect(-.12,-.7,.55,.14);g.lineWidth=.12;L([.42,-.62],[.62,-.2],[.56,.42]);break;
    case 'cross':g.fillRect(-.22,-.75,.44,1.5);g.fillRect(-.75,-.22,1.5,.44);break;
  }
}
function drawSign(g,id,S){
  const s=SIGNS[id];g.clearRect(0,0,S,S);g.save();g.translate(S/2,S/2);const R=S*.46;let fg='#111',k=R*.5,oy=0,bg='#fff';
  const tri=(sc)=>{const cy=.187*R;const pts=[[0,-R],[R*.98,R*.78],[-R*.98,R*.78]].map(([x,y])=>[x*sc,cy+(y-cy)*sc]);g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();};
  const circ=r=>{g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();};
  if(s.c==='adv'){g.fillStyle='#111';tri(1);g.fillStyle='#f6c400';tri(.8);bg='#f6c400';k=R*.34;oy=R*.22;}
  else if(s.c==='obl'){g.fillStyle='#fff';circ(R);g.fillStyle='#1663b5';circ(R*.92);fg='#fff';bg='#1663b5';k=R*.56;}
  else if(s.c==='proh'){g.fillStyle='#d21f26';circ(R);g.fillStyle='#fff';circ(R*.8);k=R*.48;}
  else{bg=s.c==='salv'?'#16884a':'#cf1f2e';g.fillStyle='#fff';g.fillRect(-R,-R,R*2,R*2);g.fillStyle=bg;g.fillRect(-R*.93,-R*.93,R*1.86,R*1.86);fg='#fff';k=R*.6;}
  g.save();g.translate(0,oy);g.scale(k,k);picto(g,s.p,fg,bg);g.restore();
  if(s.c==='proh'){g.strokeStyle='#d21f26';g.lineWidth=R*.15;g.beginPath();g.moveTo(-R*.57,-R*.57);g.lineTo(R*.57,R*.57);g.stroke();}
  g.restore();
}
const SIGNURL={};
function signCanvas(id,S=160){const c=document.createElement('canvas');c.width=c.height=S;drawSign(c.getContext('2d'),id,S);return c;}
const signURL=id=>SIGNURL[id]||(SIGNURL[id]=signCanvas(id).toDataURL());
function placeSign(id,x,z,fx,fz){
  const g=new THREE.Group();mbox(.08,1.4,.08,'#59606a',0,.7,0,g);
  const t=new THREE.CanvasTexture(signCanvas(id,256));t.anisotropy=4;
  const p=new THREE.Mesh(new THREE.PlaneGeometry(.85,.85),new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.DoubleSide}));p.position.set(0,1.75,.06);g.add(p);
  g.position.set(x,0,z);g.rotation.y=Math.atan2(fx-x,fz-z);scene.add(g);
}

/* ---------------- Characters ---------------- */
function makeHuman(o){
  const root=new THREE.Group();const L={root};
  const box=(w,h,d,c,x,y,z,p)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),cm(c));m.position.set(x,y,z);p.add(m);return m;};
  const leg=sx=>{const g=new THREE.Group();g.position.set(sx*.13,.8,0);root.add(g);box(.22,.68,.24,o.pants,0,-.34,0,g);box(.24,.13,.34,o.shoes,0,-.72,.045,g);box(.25,.04,.35,o.sole,0,-.79,.045,g);return g;};
  L.legL=leg(-1);L.legR=leg(1);
  const up=new THREE.Group();up.position.y=.8;root.add(up);L.upper=up;
  box(.5,.62,.28,o.top,0,.31,0,up);
  if(o.vest){box(.54,.5,.33,o.vest,0,.27,0,up);for(const yy of[.11,.25,.39])box(.545,.022,.335,o.vestLine,0,yy,0,up);box(.022,.48,.012,'#0d1427',0,.27,.168,up);}
  if(o.hivis){box(.51,.05,.29,'#e8f04c',0,.38,0,up);box(.51,.05,.29,'#e8f04c',0,.2,0,up);}
  if(o.hood){box(.38,.14,.12,o.top,0,.62,-.13,up);box(.02,.13,.02,'#f2f2f2',-.06,.5,.172,up);box(.02,.13,.02,'#f2f2f2',.06,.5,.172,up);}
  const arm=sx=>{const g=new THREE.Group();g.position.set(sx*.335,.58,0);up.add(g);box(.16,.52,.18,o.top,0,-.24,0,g);box(.13,.12,.14,o.skin,0,-.56,0,g);return g;};
  L.armL=arm(-1);L.armR=arm(1);
  const hd=new THREE.Group();hd.position.y=.62;up.add(hd);L.head=hd;
  box(.44,.44,.42,o.skin,0,.23,0,hd);
  box(.04,.1,.08,o.skin,-.24,.22,0,hd);box(.04,.1,.08,o.skin,.24,.22,0,hd);
  for(const sx of[-1,1]){box(.1,.08,.02,'#ffffff',sx*.1,.25,.212,hd);box(.055,.075,.02,o.eye||'#3b2a20',sx*.1,.245,.222,hd);box(.11,.025,.02,o.hair,sx*.1,.318,.212,hd);}
  box(.09,.022,.02,'#b5705a',0,.12,.212,hd);
  box(.48,.12,.46,o.hair,0,.47,0,hd);
  box(.48,.32,.07,o.hair,0,.3,-.21,hd);
  box(.05,.2,.4,o.hair,-.245,.36,-.02,hd);box(.05,.2,.4,o.hair,.245,.36,-.02,hd);
  if(o.style==='spiky'){
    const sp=(x,y,z,w,h,rz)=>{const m=box(w,h,.08,o.hair,x,y,z,hd);m.rotation.z=rz;};
    sp(-.15,.41,.215,.15,.12,.45);sp(-.02,.39,.22,.13,.15,-.12);sp(.12,.41,.215,.15,.12,-.5);sp(.205,.36,.2,.06,.15,-.2);
    const tp=(x,z,rz,rx)=>{const m=box(.12,.16,.12,o.hair,x,.56,z,hd);m.rotation.z=rz;m.rotation.x=rx;};
    tp(-.12,.05,.5,.2);tp(.08,-.05,-.4,-.2);tp(-.02,.14,.1,.5);tp(.17,.12,-.6,.3);tp(-.18,-.12,.6,-.3);tp(.0,-.16,0,-.5);
  }
  if(o.long){box(.48,.5,.08,o.hair,0,.15,-.22,hd);}
  if(o.helmet){box(.5,.16,.5,o.helmet,0,.5,0,hd);box(.54,.03,.58,o.helmet,0,.42,.03,hd);}
  return L;
}
function animWalk(L,t,amt){const s=Math.sin(t*9)*.6*amt;L.legL.rotation.x=s;L.legR.rotation.x=-s;L.armL.rotation.x=-s*.8;L.armR.rotation.x=s*.8;}
const LOOK_PLAYER={skin:'#f2dac6',hair:'#4b3122',top:'#9fa1a6',vest:'#1f2a4c',vestLine:'#161f3a',pants:'#a9abaf',shoes:'#1a1a1c',sole:'#f2f2f2',eye:'#5f7893',style:'spiky',hood:true};
const WORKER=(top,helmet,skin='#e0b597',hair='#2a1f17')=>({skin,hair,top,pants:'#2f3d5a',shoes:'#3b2b1e',sole:'#1d1d1d',helmet,hivis:true});
const OFFICE=(top,hair,skin='#ecc7a8',pants='#3a3f4b',long=false)=>({skin,hair,top,pants,shoes:'#24242a',sole:'#111',long});
function npc(look,x,z,rotY,y=0){const L=makeHuman(look);L.root.position.set(x,y,z);L.root.rotation.y=rotY;scene.add(L.root);setSolid(Math.floor(x),Math.floor(z));return L;}

/* ---------------- Particles ---------------- */
const emitters=[];
const PCFG={sparks:{n:26,cols:['#fff6b0','#ffd23f','#ffffff']},fire:{n:36,cols:['#ff4b1f','#ff8c1a','#ffd23f']},vapor:{n:18,cols:['#9be37a','#7fcf5e']},dust:{n:22,cols:['#efe3c6','#d4c39c']},heat:{n:34,cols:['#fff1c9','#ffc97a']}};
function emitter(type,x,y,z,spread=.3){
  const cfg=PCFG[type];const e={type,x,y,z,spread,active:true,parts:[]};
  for(let i=0;i<cfg.n;i++){const m=new THREE.Mesh(BOX,new THREE.MeshBasicMaterial({color:cfg.cols[i%cfg.cols.length],transparent:true,depthWrite:false}));scene.add(m);const p={m,life:0,max:1};resetP(e,p,true);e.parts.push(p);}
  emitters.push(e);return e;
}
function resetP(e,p,init){
  const sp=e.spread,R=Math.random;p.m.visible=true;
  p.m.position.set(e.x+(R()-.5)*sp*2,e.y+(e.type==='heat'?R()*.2:(R()-.5)*sp*.5),e.z+(R()-.5)*sp*2);
  switch(e.type){
    case'sparks':p.vx=(R()-.5)*3.5;p.vz=R()*3;p.vy=R()*2.5+1;p.max=.3+R()*.4;p.s=.05+R()*.04;break;
    case'fire':p.vx=(R()-.5)*.4;p.vz=(R()-.5)*.4;p.vy=1+R()*1.2;p.max=.5+R()*.6;p.s=.12+R()*.14;break;
    case'vapor':p.vx=(R()-.5)*.2;p.vz=(R()-.5)*.2;p.vy=.3+R()*.3;p.max=1.6+R();p.s=.1+R()*.1;break;
    case'dust':p.vx=(R()-.5)*1.2;p.vz=(R()-.5)*1.2;p.vy=R()*.6;p.max=.8+R()*.6;p.s=.04+R()*.05;break;
    case'heat':p.vx=0;p.vz=0;p.vy=.4+R()*.5;p.max=1.5+R()*1.5;p.s=.06+R()*.06;break;
  }
  p.life=init?R()*p.max:0;p.m.scale.setScalar(p.s);
}
function updEmitters(dt){
  for(const e of emitters){if(e.dead)continue;let alive=0;
    for(const p of e.parts){if(!p.m.visible)continue;p.life+=dt;
      if(p.life>=p.max){if(e.active){resetP(e,p,false);}else{p.m.visible=false;continue;}}
      alive++;const m=p.m;m.position.x+=p.vx*dt;m.position.y+=p.vy*dt;m.position.z+=p.vz*dt;
      if(e.type==='sparks')p.vy-=9*dt;const k=p.life/p.max;m.material.opacity=1-k;
      if(e.type==='fire')m.scale.setScalar(p.s*(1-k*.7));if(e.type==='vapor')m.scale.setScalar(p.s*(1+k*2));m.rotation.y+=dt*2;}
    if(!e.active&&!alive)e.dead=true;}
}

/* ---------------- Markers ---------------- */
function markerTex(kind){
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
  g.fillStyle='#000';g.fillRect(8,8,48,48);g.fillStyle=kind==='done'?'#4cc46a':kind==='quiz'?'#f2c230':'#e5533d';g.fillRect(12,12,40,40);
  g.fillStyle=kind==='quiz'?'#111':'#fff';
  if(kind==='done'){[[18,32],[24,38],[30,32],[36,26],[42,20]].forEach(([x,y])=>g.fillRect(x,y,6,6));}
  else if(kind==='quiz'){[[24,16,16,5],[37,20,5,9],[29,28,10,5],[29,32,5,6],[29,42,5,5]].forEach(r=>g.fillRect(...r));}
  else{g.fillRect(28,17,8,20);g.fillRect(28,41,8,6);}
  const t=new THREE.CanvasTexture(c);t.magFilter=t.minFilter=THREE.NearestFilter;return t;
}
const MT={warn:markerTex('warn'),done:markerTex('done'),quiz:markerTex('quiz')};
const markers=[];
function marker(x,y,z,kind){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:MT[kind]}));s.position.set(x,y,z);s.scale.set(.7,.7,.7);s.userData.by=y;scene.add(s);markers.push(s);return s;}
function textSprite(txt,col='#fff'){const t=canvasTex(128,64,(g)=>{g.fillStyle='rgba(0,0,0,.75)';g.fillRect(8,10,112,44);g.fillStyle=col;g.font='bold 34px "Pixelify Sans",monospace';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,64,33);});t.magFilter=THREE.NearestFilter;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t}));s.scale.set(1,.5,1);scene.add(s);return s;}

/* ---------------- Zones (ZONES in js/content.js) ---------------- */
const zoneAt=x=>{for(let i=ZONES.length-1;i>=0;i--)if(x>=ZONES[i].x0)return i;return 0;};

const FINAL={x:100,z:6.6,at:[100,8.5],r:2.4,done:false,step:0,tries:0};

/* ---------------- Hazard scenes ----------------
   Text of each hazard (HZ) lives in js/content.js. Here, for each hazard id:
   build = props in the 3D world, tick = animation, fix = how it looks once solved.
   A hazard added in content.js with an id not listed here gets GENERIC_SCENE. */
const HZ_SCENES={

/* ===== Zona 1 · Condicions de seguretat ===== */
bastida:{
 build(h){for(let x=16;x<=21;x++)for(let z=7;z<=8;z++)blk(x,2,z,'planks');for(const x of[16,21])for(const z of[7,8])for(let y=0;y<2;y++)blk(x,y,z,'metal');
   h.w=makeHuman(WORKER('#ff8a1f','#f2c230'));h.w.root.position.set(18.6,3,7.6);h.w.root.rotation.y=Math.PI;scene.add(h.w.root);},
 tick(h,t){h.w.armR.rotation.x=-1.3+Math.sin(t*6)*.25;},
 fix(h){const y=3;mbox(6,.08,.06,'#f2c230',19,y+.95,8.95);mbox(6,.06,.05,'#f2c230',19,y+.5,8.95);mbox(6,.15,.04,'#d99a18',19,y+.08,8.97);
   for(const x of[16.05,19,21.95])mbox(.07,1,.07,'#c99a1e',x,y+.5,8.95);
   for(const x of[16.03,21.97]){mbox(.06,.08,2,'#f2c230',x,y+.95,8);mbox(.05,.06,2,'#f2c230',x,y+.5,8);}}},
quadre:{
 build(h){for(let y=0;y<3;y++)blk(14,y,14,'stone');
   mbox(.8,1,.25,'#c7ccd2',14.5,1.4,15.12);mbox(.7,.9,.02,'#2b2f36',14.5,1.4,15.25);for(let i=0;i<5;i++)mbox(.08,.14,.04,'#e8e8e8',14.25+i*.12,1.55,15.27);
   h.door=new THREE.Group();h.door.position.set(14.1,1.4,15.26);scene.add(h.door);mbox(.8,1,.04,'#b9bec5',.4,0,0,h.door);h.door.rotation.y=-1.9;
   h.cab=new THREE.Group();scene.add(h.cab);mbox(.05,.7,.05,'#151515',14.72,.85,15.32,h.cab);mbox(.06,.08,.06,'#d9822b',14.72,.47,15.32,h.cab);
   h.em=[emitter('sparks',14.72,.45,15.36,.04)];},
 fix(h){h.door.rotation.y=0;scene.remove(h.cab);mbox(.05,.05,.03,'#3dff6a',14.82,1.82,15.3);}},
radial:{
 build(h){mbox(2,.9,.9,'planks',25,.45,15.5);setSolid(24,15);setSolid(25,15);mbox(.35,.3,.3,'#3a6ea5',25,1.05,15.5);
   h.disc=mcyl(.3,.03,'#bfc4ca',25,1.25,15.72,scene,20);h.disc.rotation.x=Math.PI/2;
   h.w=npc(WORKER('#2f6db3','#f2c230'),25.2,16.6,Math.PI);h.w.armL.rotation.x=-1.1;h.w.armR.rotation.x=-1.1;
   h.em=[emitter('sparks',25,1.05,15.9,.04)];},
 fix(h){mbox(.7,.12,.38,'#7d858e',25,1.6,15.6);const s=new THREE.Mesh(new THREE.PlaneGeometry(1,.7),new THREE.MeshBasicMaterial({color:'#aee3ff',transparent:true,opacity:.35,side:THREE.DoubleSide}));s.position.set(25,1.35,16.05);scene.add(s);mbox(.4,.08,.04,'#222',0,.25,.23,h.w.head);}},
foc:{
 build(h){mbox(2,.75,.8,'planks',30,.375,18.5);setSolid(29,18);setSolid(30,18);
   h.mon=mbox(.65,.42,.06,'#20242c',29.7,1.0,18.4);mbox(.08,.2,.08,'#333',29.7,.82,18.4);mbox(.22,.45,.45,'#2a2e36',30.6,.98,18.5);
   h.light=new THREE.PointLight(0xff7a2a,1.5,6);h.light.position.set(30,1.6,18.8);scene.add(h.light);
   h.em=[emitter('fire',30,1.0,18.5,.35)];},
 tick(h,t){if(!h.done)h.light.intensity=1.2+Math.sin(t*20)*.4+Math.random()*.3;},
 fix(h){scene.remove(h.light);h.mon.material=cm('#0c0c0c');mcyl(.12,.5,'#c8202c',28.7,.25,19.3);}},

/* ===== Zona 2 · Condicions mediambientals ===== */
soroll:{
 build(h){h.body=mbox(2,1.2,1.4,'#b8352b',36,.6,5);const tk=mcyl(.35,1.8,'#c9473b',36,1.55,5);tk.rotation.z=Math.PI/2;mbox(.4,.35,.4,'#333',35.3,1.4,5.5);
   for(const x of[35,36])for(const z of[4,5])setSolid(x,z);
   h.rings=[0,1,2].map(i=>{const m=new THREE.Mesh(new THREE.TorusGeometry(1,.035,6,40),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.5,depthWrite:false}));m.rotation.x=Math.PI/2;m.position.set(36,1,5);m.userData.ph=i/3;scene.add(m);return m;});},
 tick(h,t){if(h.done)return;h.body.position.x=36+Math.sin(t*70)*.012;for(const m of h.rings){const ph=(t*.6+m.userData.ph)%1;const s=1+ph*4;m.scale.set(s,s,s);m.material.opacity=.55*(1-ph);}},
 fix(h){h.rings.forEach(m=>scene.remove(m));h.body.position.x=36;mbox(2.6,1.9,2,'metal',36,.95,5);mbox(.9,.5,.02,'#2b2f36',36,1.25,6.01);}},
quimic:{
 build(h){h.bar=mcyl(.38,1,'#3e7a3a',44.5,.5,4.5);mcyl(.395,.06,'#2b5a28',44.5,.22,4.5);mcyl(.395,.06,'#2b5a28',44.5,.8,4.5);setSolid(44,4);
   h.pud=new THREE.Mesh(new THREE.CircleGeometry(.75,20),new THREE.MeshBasicMaterial({color:'#5aa04a',transparent:true,opacity:.55}));h.pud.rotation.x=-Math.PI/2;h.pud.position.set(45,.02,5);scene.add(h.pud);
   h.em=[emitter('vapor',44.5,1.05,4.5,.2)];},
 fix(h){scene.remove(h.pud);mcyl(.4,.05,'#22321f',44.5,1.02,4.5);
   const lt=canvasTex(64,64,(g)=>{g.fillStyle='#fff';g.fillRect(0,0,64,64);g.save();g.translate(32,32);g.rotate(Math.PI/4);g.fillStyle='#d21f26';g.fillRect(-19,-19,38,38);g.fillStyle='#fff';g.fillRect(-15,-15,30,30);g.restore();g.save();g.translate(32,33);g.scale(10,10);picto(g,'skull','#111','#fff');g.restore();});
   const lp=new THREE.Mesh(new THREE.PlaneGeometry(.38,.38),new THREE.MeshBasicMaterial({map:lt}));lp.position.set(44.5,.55,4.89);scene.add(lp);
   mbox(1,.35,1,'metal',44.5,2.3,4.5);mbox(.3,1.2,.3,'metal',44.5,3.05,4.5);}},
soldadura:{
 build(h){mbox(2,.9,.8,'metal',48,.45,15.5);setSolid(47,15);setSolid(48,15);mbox(.6,.1,.3,'#9aa3ad',48,.95,15.5);
   h.w=npc(WORKER('#556b2f',null,'#d9a98a','#191512'),48,16.45,Math.PI);h.w.armR.rotation.x=-1.2;h.w.armL.rotation.x=-.9;
   h.light=new THREE.PointLight(0xcfe6ff,0,7);h.light.position.set(48,1.2,15.9);scene.add(h.light);
   h.fl=new THREE.Mesh(BOX,bm('#ffffff'));h.fl.scale.setScalar(.09);h.fl.position.set(48,1.02,15.62);scene.add(h.fl);
   emitter('sparks',48,1.0,15.62,.03);},
 tick(h){const on=Math.random()<.5;h.light.intensity=on?Math.random()*(h.done?1.5:3):0;h.fl.visible=on;},
 fix(h){const mat=new THREE.MeshBasicMaterial({color:'#c0392b',transparent:true,opacity:.55,side:THREE.DoubleSide});
   for(const x of[46.75,49.25]){const m=new THREE.Mesh(new THREE.BoxGeometry(.06,1.7,1.9),mat);m.position.set(x,.85,16);scene.add(m);}
   const f=new THREE.Mesh(new THREE.BoxGeometry(2.56,1.7,.06),mat);f.position.set(48,.85,17.35);scene.add(f);
   mbox(.46,.42,.08,'#262a31',0,.24,.25,h.w.head);}},
calor:{
 build(h){ground(33.5,15,41.5,22,'sand',.012);hull(34,19,7,3,1);
   h.w=npc(WORKER('#ff8a1f','#ffffff'),37.4,17.9,0);h.w.armR.rotation.x=-1.6;h.w2=npc(WORKER('#2f6db3','#f2c230','#c99474'),39.6,17.4,.3);
   h.em=[emitter('heat',37.5,.05,17.6,3)];},
 tick(h,t){if(!h.done)h.w.armR.rotation.x=-1.6+Math.sin(t*5)*.3;},
 fix(h){const at=canvasTex(64,64,(g)=>{for(let i=0;i<8;i++){g.fillStyle=i%2?'#ffffff':'#2a6fb5';g.fillRect(i*8,0,8,64);}});at.magFilter=THREE.NearestFilter;
   const a=new THREE.Mesh(new THREE.PlaneGeometry(7,3.6),new THREE.MeshLambertMaterial({map:at,side:THREE.DoubleSide}));a.rotation.x=-Math.PI/2;a.position.set(37.5,3.1,17.05);scene.add(a);
   for(const x of[34.2,40.8])for(const z of[15.4,18.7])mbox(.08,3.1,.08,'#dddddd',x,1.55,z);
   mbox(.4,.9,.4,'#2f7fd1',41.4,.45,16);mcyl(.14,.35,'#bfe6ff',41.4,1.07,16);h.w.armR.rotation.x=0;}},

/* ===== Zona 3 · Càrrega de treball ===== */
motor:{
 build(h){const lt=canvasTex(64,64,(g)=>{g.fillStyle='#b07f4c';g.fillRect(0,0,64,64);g.fillStyle='#f1ead8';g.fillRect(6,16,52,32);g.fillStyle='#111';g.font='bold 15px "Pixelify Sans",monospace';g.textAlign='center';g.fillText('MOTOR',32,30);g.fillStyle='#c0392b';g.font='bold 17px "Pixelify Sans",monospace';g.fillText('35 kg',32,46);});
   h.crate=new THREE.Mesh(BOX,[M.planks,M.planks,M.planks,M.planks,new THREE.MeshLambertMaterial({map:lt}),M.planks]);h.crate.scale.set(1,.9,1);h.crate.position.set(56.5,.45,5.5);scene.add(h.crate);setSolid(56,5);
   h.w=npc(WORKER('#2f6db3','#f2c230','#c99474'),56.5,6.45,Math.PI);h.w.upper.rotation.x=.75;h.w.armL.rotation.x=-.4;h.w.armR.rotation.x=-.4;},
 fix(h){h.w.upper.rotation.x=0;h.w.armR.rotation.x=-.6;h.w.armL.rotation.x=0;h.w.root.position.z=7;setSolid(56,6,false);setSolid(56,7);
   mbox(.6,.22,1.1,'#f2b705',56.5,.11,5.5);const hd=mbox(.06,1,.06,'#222',56.5,.62,6.25);hd.rotation.x=-.35;h.crate.position.y=.67;}},
pvd:{
 build(h){wallBoard(3,1.2,canvasTex(4,4,(g)=>{g.fillStyle='#d5f0ff';g.fillRect(0,0,4,4);}),64.5,1.7,1.03);
   mbox(2.4,.75,.8,'planks',64.5,.375,3.4);for(const x of[63,64,65])setSolid(x,3);
   h.books=mbox(.45,.45,.3,'#8a3b2e',64.5,.975,3.3);
   h.mon=new THREE.Group();h.mon.position.set(64.5,1.43,3.3);scene.add(h.mon);mbox(.75,.46,.06,'#1c1f26',0,0,0,h.mon);const sc=new THREE.Mesh(new THREE.PlaneGeometry(.68,.39),bm('#bfe6ff'));sc.position.z=.035;h.mon.add(sc);
   h.w=npc(OFFICE('#7a4fa3','#2a1a10','#f0cdb0','#2c2f3a',true),64.5,4.6,Math.PI);h.w.head.rotation.x=-.35;h.w.armL.rotation.x=-.9;h.w.armR.rotation.x=-.9;},
 fix(h){scene.remove(h.books);h.mon.position.y=1.08;h.w.head.rotation.x=0;for(let i=0;i<6;i++)mbox(3,.07,.04,'#ece5d6',64.5,1.2+i*.2,1.1);}},
polir:{
 build(h){hull(61,15,7,3,1);h.w=npc(WORKER('#ff8a1f','#f2c230'),64,18.4,Math.PI);h.em=[emitter('dust',64,1.6,17.95,.35)];},
 tick(h,t){h.w.armR.rotation.x=-1.4+Math.sin(t*(h.done?3:16))*(h.done?.15:.3);},
 fix(h){h.w2=npc(WORKER('#2f6db3','#f2c230','#c99474'),66.6,19.2,-2.4);}},

/* ===== Zona 4 · Organització del treball ===== */
torns:{
 build(h){h.w=npc(OFFICE('#4a8a6a','#3a2618'),77.5,6.6,Math.PI);h.boss=npc(OFFICE('#b23a3a','#20160f','#e3b493','#2a2a30'),77.5,5.1,0);},
 tick(h,t){if(h.done)return;h.boss.armL.rotation.x=-2.3+Math.sin(t*8)*.35;h.boss.armR.rotation.x=-2.3-Math.sin(t*8)*.35;h.w.head.rotation.x=.25;},
 fix(h){h.boss.armL.rotation.x=0;h.boss.armR.rotation.x=0;h.w.head.rotation.x=0;
   const tt=canvasTex(256,128,(g,w,hh)=>{g.fillStyle='#f4f1e8';g.fillRect(0,0,w,hh);g.fillStyle='#3b2a6b';g.fillRect(0,0,w,26);g.fillStyle='#fff';g.font='bold 18px "Pixelify Sans",monospace';g.fillText('TORNS · PROPERES 4 SETMANES',10,19);const c=['#9b7fe0','#4fa3e0','#f2b134'];for(let r=0;r<4;r++)for(let d=0;d<7;d++){g.fillStyle=d>4?'#d8d4c8':c[(r+d)%3];g.fillRect(10+d*34,34+r*22,30,18);}});
   wallBoard(3.6,1.8,tt,77.5,1.8,1.03);}},
mobbing:{
 build(h){h.m=npc(OFFICE('#d26a8a','#5a3420','#f1cfb4','#2c2f3a',true),86.5,16.4,Math.PI);h.m.head.rotation.x=.35;
   h.a=npc(OFFICE('#3d6fb0','#1f1a14'),89.5,15.6,0);h.b=npc(OFFICE('#c9893a','#6b4a2a','#e8c3a2','#2c2f3a',true),89.5,16.9,Math.PI);
   h.dots=textSprite('...','#ffffff');h.dots.position.set(89.5,2.45,16.25);},
 fix(h){h.m.head.rotation.x=0;h.a.root.rotation.y=-Math.PI/2;h.b.root.rotation.y=-Math.PI/2;scene.remove(h.dots);}},
};
const GENERIC_SCENE={
 build(h){if(!h.mk)h.mk=[h.at[0],2.4,h.at[1]];const x=h.mk[0],z=h.mk[2];
   h.bar=mcyl(.38,1,'#e5533d',x,.5,z);mcyl(.395,.12,'#1b1b1b',x,.35,z);mcyl(.395,.12,'#1b1b1b',x,.7,z);setSolid(Math.floor(x),Math.floor(z));},
 fix(h){h.bar.material=cm('#4cc46a');}};
HZ.forEach(h=>{const s=HZ_SCENES[h.id]||GENERIC_SCENE;h.build=s.build;h.tick=s.tick;h.fix=s.fix;});
const EVAL_N=CONFIG.EVAL_N;

/* ---------------- Build the world ---------------- */
function buildWorld(){
  ground(-60,-60,170,24,'grass',0);
  ZONES.forEach((z,i)=>ground(z.x0,0,z.x1+(i===ZONES.length-1?1:0),23,i===4?'office':'concrete',.01));
  const wt=T.water.clone();wt.needsUpdate=true;wt.repeat.set(230,90);G.waterTex=wt;
  const wm=new THREE.Mesh(new THREE.PlaneGeometry(230,90),new THREE.MeshLambertMaterial({map:wt}));wm.rotation.x=-Math.PI/2;wm.position.set(55,-.45,69);scene.add(wm);
  mbox(230,.5,.15,'#6f727a',55,-.22,24.02);
  for(let x=0;x<=108;x++){for(let y=0;y<3;y++)blk(x,y,0,'stone');blk(x,0,23,'stone');}
  for(let z=1;z<23;z++)for(let y=0;y<3;y++){blk(0,y,z,'stone');blk(108,y,z,'stone');}
  [12,32,52,72,92].forEach(x=>{for(let z=1;z<23;z++){if(z>=10&&z<=12)continue;for(let y=0;y<3;y++)blk(x,y,z,'stone');}});
  // gates
  ZONES.forEach((zn,i)=>{if(!zn.gate)return;zn.gateMeshes=[];for(let z=10;z<=12;z++){for(let y=0;y<3;y++){const m=new THREE.Mesh(BOX,M.stripes);m.position.set(zn.gate+.5,y+.5,z+.5);scene.add(m);zn.gateMeshes.push(m);}setSolid(zn.gate,z);tall.add(K(zn.gate,z));}});
  // boats & scenery
  hull(14,2,12,5,1);
  hull(15,28,10,5,-1,false);hull(55,30,8,3,-1,false);hull(86,27,11,5,-1,false);
  for(const [x,z] of[[4,22],[30,22],[60,22],[100,22]]){mcyl(.18,.5,'#2b2f36',x+.5,.25,z+.5);}
  // office desks zone 4
  for(const x of[75,80,84]){mbox(1.8,.75,.8,'office',x+.9,.375,13.4);setSolid(x,13);setSolid(x+1,13);mbox(.6,.38,.05,'#1c1f26',x+.9,1.0,13.3);}
  // zone 5 board + technician
  const mt=canvasTex(1024,384,(g,w,h)=>{g.fillStyle='#f4f1e8';g.fillRect(0,0,w,h);g.fillStyle='#173a5e';g.fillRect(0,0,w,64);g.fillStyle='#fff';g.font='bold 40px "Pixelify Sans",monospace';g.fillText('AVALUACIÓ DE RISCOS · MÈTODE INSST',24,46);
    const cols=['Lleugerament nociu','Nociu','Extremadament nociu'],rows=['Baixa','Mitjana','Alta'],cl=[['#5cc777','#a6d96a','#f4c542'],['#a6d96a','#f4c542','#f08a3c'],['#f4c542','#f08a3c','#d9412f']],lv=[['Trivial','Tolerable','Moderat'],['Tolerable','Moderat','Important'],['Moderat','Important','Intolerable']];
    g.font='bold 24px Inter,sans-serif';g.fillStyle='#173a5e';cols.forEach((c,i)=>g.fillText(c,230+i*262,104));
    rows.forEach((r,j)=>{g.fillStyle='#173a5e';g.fillText(r,40,160+j*76);cols.forEach((c,i)=>{g.fillStyle=cl[j][i];g.fillRect(220+i*262,122+j*76,250,64);g.fillStyle='#111';g.fillText(lv[j][i],236+i*262,162+j*76);});});});
  wallBoard(8,3,mt,100,1.9,1.03);
  FINAL.npc=npc({...WORKER('#2a6fb5','#ffffff','#e8c0a0','#3a2618'),hivis:false},FINAL.x,FINAL.z,0);
  FINAL.mk=marker(FINAL.x,2.9,FINAL.z,'quiz');
  // start board
  const st=canvasTex(1024,320,(g,w,h)=>{g.fillStyle='#132036';g.fillRect(0,0,w,h);g.fillStyle='#f2c230';g.font='bold 92px "Pixelify Sans",monospace';g.fillText('PREVENCRAFT',36,104);
    g.fillStyle='#e9eef7';g.font='600 30px Inter,sans-serif';g.fillText("Drassana escola · Factors de risc i la seva prevenció",40,158);
    g.font='26px Inter,sans-serif';g.fillStyle='#a3b2cc';g.fillText('1. Detecta el perill   2. Tria la mesura   3. Senyalitza   4. Obre el cofre',40,214);
    g.fillStyle='#4cc46a';g.fillText("Ordre: evitar a l'origen  >  protecció col·lectiva  >  EPI",40,268);});
  wallBoard(8,2.5,st,6,1.8,1.03);
  // zone banners above the openings
  [12,32,52,72,92].forEach((x,i)=>{const z=ZONES[i+1];const bt=canvasTex(512,128,(g,w,h)=>{g.fillStyle='#111';g.fillRect(0,0,w,h);g.fillStyle=z.hex;g.fillRect(6,6,w-12,h-12);g.fillStyle='#111';g.font='bold 30px "Pixelify Sans",monospace';g.fillText('ZONA '+(i+1),22,48);g.font='bold 34px "Pixelify Sans",monospace';g.fillText(z.name.toUpperCase(),22,96);});
    wallBoard(3.2,.8,bt,x-.02,4.7,11.5,-Math.PI/2);});
  // chests
  CHESTS.forEach(c=>{const g=new THREE.Group();g.position.set(c.x+.5,0,c.z+.5);scene.add(g);mbox(.9,.55,.65,'chest',0,.275,0,g);
    c.lid=new THREE.Group();c.lid.position.set(0,.55,-.325);g.add(c.lid);mbox(.92,.2,.67,'chest',0,.1,.335,c.lid);mbox(.12,.16,.04,'#f2c230',0,0,.68,c.lid);
    setSolid(c.x,c.z);c.mk=marker(c.x+.5,1.6,c.z+.5,'quiz');c.at=[c.x+.5,c.z+.5];c.r=1.9;});
  // hazards
  HZ.forEach(h=>{h.em=h.em||[];h.build(h);h.mkS=marker(h.mk[0],h.mk[1],h.mk[2],'warn');});
  flushBlocks();
  // clouds
  G.clouds=[];for(let i=0;i<16;i++){const c=mbox(6+Math.random()*10,1.2,4+Math.random()*6,'#ffffff',-40+Math.random()*190,34+Math.random()*6,-40+Math.random()*110);G.clouds.push(c);}
}

/* ---------------- Game state ---------------- */
const G={mode:'intro',name:'',score:0,zs:{},health:100,baixes:0,log:[],t0:0,hurtT:0,badges:{},attempt:1};
const P={x:6,z:11.5,y:0,vy:0,rot:Math.PI/2,walk:0};
const cam={yaw:-Math.PI/2,pitch:.42,dist:6.5};
const MAX=(()=>{const zm={};HZ.forEach(h=>zm[h.zone]=(zm[h.zone]||0)+100+(h.sign?25:0));CHESTS.forEach(c=>zm[c.zone]+=50);zm[5]=EVAL_N*50;let t=0;for(const k in zm)t+=zm[k];return{zm,t};})();

/* ---------------- HUD ---------------- */
const hpEl=$('#hp');for(let i=0;i<10;i++)hpEl.appendChild(document.createElement('i'));
let lastHP=-1,lastZone=-1;
function drawHP(){const n=Math.ceil(G.health/10);if(n===lastHP)return;lastHP=n;[...hpEl.children].forEach((e,i)=>e.classList.toggle('off',i>=n));}
function refreshHUD(){
  const zi=zoneAt(P.x),z=ZONES[zi];lastZone=zi;
  $('#hzNum').textContent=zi;$('#hzName').textContent=z.name;$('#hudZone').style.setProperty('--zc',z.hex);
  const ul=$('#hzList');let html='';
  if(zi===0)html='<li class="note">Entra pel portal de la dreta per començar.</li>';
  else if(zi===5)html=`<li class="${FINAL.done?'done':''}">Avalua els riscos amb la tècnica de prevenció (${Math.min(FINAL.step,EVAL_N)}/${EVAL_N})</li>`;
  else{HZ.filter(h=>h.zone===zi).forEach(h=>html+=`<li class="${h.done?'done':''}">${h.title}</li>`);const c=CHESTS.find(c=>c.zone===zi);html+=`<li class="${c.done?'done':''}">Cofre de coneixement</li>`;if(z.open)html+='<li class="note" style="color:var(--good)">Porta oberta. Continua cap a la dreta.</li>';}
  ul.innerHTML=html;
}
function toast(txt,col){const d=document.createElement('div');d.className='toast';if(col)d.style.setProperty('--tc',col);d.textContent=txt;$('#toasts').appendChild(d);setTimeout(()=>d.remove(),3400);}
function addScore(n,z){G.score+=n;G.zs[z]=(G.zs[z]||0)+n;const s=$('#score');s.textContent=G.score;s.classList.remove('bump');void s.offsetWidth;s.classList.add('bump');}
function hurt(n){G.health=Math.max(0,G.health-n);G.hurtT=.5;}
function logEntry(zone,item,q,choice,fb){G.log.push({zone,item,q,choice,fb});}

/* ---------------- Modals ---------------- */
const overlay=$('#overlay'),modal=$('#modal');
function openModal(html,acc='#f2c230',closable=true){if(G.mode!=='modal')G.prev=G.mode;G.mode='modal';G.closable=closable;for(const k in keys)keys[k]=false;joyReset();modal.style.setProperty('--acc',acc);modal.innerHTML=html;overlay.hidden=false;modal.scrollTop=0;
  const f=modal.querySelector('[data-focus]')||modal.querySelector('button');f&&f.focus({preventScroll:true});}
function closeModal(){overlay.hidden=true;modal.innerHTML='';if(G.mode==='modal')G.mode=G.prev||'play';canvas.focus({preventScroll:true});refreshHUD();}
modal.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&G.handler)G.handler(b);});
const head=(tag,title)=>`<div class="m-head"><span class="m-tag">${tag}</span><h2>${title}</h2></div>`;
const foot=(btn,act,ghost)=>`<div class="m-foot">${ghost?`<button class="btn ghost" data-act="close">Tanca (Esc)</button>`:''}${btn?`<button class="btn" data-act="${act}" data-focus>${btn}</button>`:''}</div>`;
const verdict=(cls,label,pts)=>`<div class="verdict ${cls}"><span class="pill">${label}</span>${pts}</div>`;

function hazardView(h){
  const z=ZONES[h.zone];if(!h.order)h.order=shuffle(h.opts.map((_,i)=>i));
  openModal(`${head(z.name+' · '+h.factor,h.title)}<div class="m-body"><p class="sit">${h.sit}</p><p class="dmg"><span>Danys possibles</span>${h.danys}</p><h3 class="m-h3">Tria la mesura del teu inventari</h3>
   <div class="opts">${h.order.map((oi,i)=>`<button class="opt" data-act="opt" data-i="${oi}"><span class="slot">${'ABCD'[i]}</span><span>${h.opts[oi].t}</span></button>`).join('')}</div></div>${foot('', '', true)}`,z.hex,true);
  G.handler=b=>{if(b.dataset.act==='close')return closeModal();if(b.dataset.act==='opt')chooseHazard(h,h.opts[+b.dataset.i]);};
}
function chooseHazard(h,o){
  const z=ZONES[h.zone];h.tries=(h.tries||0)+1;let pts=0,cls,label;
  if(o.q==='best'){pts=h.tries===1?100:50;cls='good';label='Òptim';}
  else if(o.q==='ok'){pts=h.tries===1?60:30;cls='ok';label='Vàlid, però millorable';}
  else{cls='bad';label='Incorrecte';hurt(20);}
  if(h.tries===1&&o.q!=='best')logEntry(h.zone,h.title,o.q,o.t,o.fb);
  if(pts)addScore(pts,h.zone);
  const next=o.q==='bad'?'retry':(h.sign?'sign':'finish');
  const best=h.opts.find(x=>x.q==='best');
  openModal(`${head(z.name+' · '+h.factor,h.title)}<div class="m-body">${verdict(cls,label,pts?`<span class="pts">+${pts} punts</span>`:`<span class="pts neg">−20 salut laboral</span>`)}
   <p class="chosen">«${o.t}»</p><p class="fb">${o.fb}</p>${o.q==='ok'?`<p class="better"><span>Millor opció</span>${best.t}</p>`:''}</div>
   ${foot(next==='retry'?'Torna-ho a provar':next==='sign'?'Ara, senyalitza la zona':'Continua',next,false)}`,z.hex,false);
  G.handler=b=>{const a=b.dataset.act;if(a==='retry')hazardView(h);else if(a==='sign')signView(h);else if(a==='finish')finishHazard(h);};
}
function signView(h){
  const z=ZONES[h.zone];if(!h.sorder)h.sorder=shuffle(h.sign.opts);
  openModal(`${head('Senyalització de seguretat · RD 485/1997',h.title)}<div class="m-body"><p class="sit">${h.sign.q}</p>
   <div class="signs">${h.sorder.map(id=>`<button class="sgn" data-act="sgn" data-id="${id}"><img alt="" src="${signURL(id)}"><span>${SIGNS[id].l}</span></button>`).join('')}</div></div><div class="m-foot"></div>`,z.hex,false);
  G.handler=b=>{if(b.dataset.act!=='sgn')return;const id=b.dataset.id;h.stries=(h.stries||0)+1;
    if(id===h.sign.ok){const pts=h.stries===1?25:10;addScore(pts,h.zone);h.placed=id;
      openModal(`${head('Senyalització de seguretat',h.title)}<div class="m-body">${verdict('good','Senyal correcte',`<span class="pts">+${pts} punts</span>`)}<p class="fb">${h.sign.fb} La senyalització complementa la prevenció, però no elimina el risc.</p></div>${foot('Col·loca el senyal','finish')}`,z.hex,false);
      G.handler=b2=>{if(b2.dataset.act==='finish')finishHazard(h);};}
    else{hurt(10);if(h.stries===1)logEntry(h.zone,'Senyal · '+h.title,'bad',SIGNS[id].l,`El senyal adequat era «${SIGNS[h.sign.ok].l}». ${CAT_HELP}`);
      openModal(`${head('Senyalització de seguretat',h.title)}<div class="m-body">${verdict('bad','Senyal incorrecte','<span class="pts neg">−10 salut laboral</span>')}<p class="fb">«${SIGNS[id].l}» no és el senyal adequat per a aquest risc.</p><p class="dmg">${CAT_HELP}</p></div>${foot('Torna-ho a provar','retry')}`,z.hex,false);
      G.handler=b2=>{if(b2.dataset.act==='retry')signView(h);};}};
}
function finishHazard(h){
  h.done=true;closeModal();h.fix&&h.fix(h);(h.em||[]).forEach(e=>e.active=false);
  h.mkS.material.map=MT.done;h.mkS.material.needsUpdate=true;
  if(h.placed)placeSign(h.placed,h.sign.at[0],h.sign.at[1],P.x,P.z);
  toast('Risc controlat: '+h.title,ZONES[h.zone].hex);refreshHUD();checkZone(h.zone);
}
function chestView(c){
  const z=ZONES[c.zone],pool=QUIZ[c.zone];c.used=c.used||shuffle(pool.map((_,i)=>i));c.qi=c.qi||0;const q=pool[c.used[c.qi%pool.length]];const order=shuffle(q.a.map((_,i)=>i));
  openModal(`${head('Cofre de coneixement · '+z.name,'Respon per obrir-lo')}<div class="m-body"><p class="q">${q.q}</p><div class="opts one">${order.map((ai,i)=>`<button class="opt" data-act="ans" data-i="${ai}"><span class="slot">${'ABCD'[i]}</span><span>${q.a[ai]}</span></button>`).join('')}</div></div>${foot('','',true)}`,z.hex,true);
  G.handler=b=>{if(b.dataset.act==='close')return closeModal();if(b.dataset.act!=='ans')return;c.tries=(c.tries||0)+1;const ok=+b.dataset.i===0;
    if(ok){const pts=c.tries===1?50:25;addScore(pts,c.zone);
      openModal(`${head('Cofre de coneixement · '+z.name,'Cofre obert')}<div class="m-body">${verdict('good','Correcte',`<span class="pts">+${pts} punts</span>`)}<p class="fb">${q.x}</p></div>${foot('Continua','done')}`,z.hex,false);
      G.handler=b2=>{if(b2.dataset.act==='done'){c.done=true;closeModal();c.mk.material.map=MT.done;c.mk.material.needsUpdate=true;c.opening=0;toast('Cofre obert',z.hex);refreshHUD();checkZone(c.zone);}};}
    else{hurt(15);if(c.tries===1)logEntry(c.zone,'Cofre · '+q.q,'bad',q.a[+b.dataset.i],q.x);c.qi++;
      openModal(`${head('Cofre de coneixement · '+z.name,'Resposta incorrecta')}<div class="m-body">${verdict('bad','Incorrecte','<span class="pts neg">−15 salut laboral</span>')}<p class="chosen">«${q.a[+b.dataset.i]}»</p><p class="fb">${q.x}</p></div>${foot('Una altra pregunta','again')}`,z.hex,false);
      G.handler=b2=>{if(b2.dataset.act==='again')chestView(c);};}};
}
function finalView(){
  const z=ZONES[5];if(!G.evalSet)G.evalSet=shuffle(EVAL).slice(0,EVAL_N);const it=G.evalSet[FINAL.step];
  openModal(`${head('Avaluació de riscos · Mètode INSST',`Situació ${FINAL.step+1} de ${EVAL_N}`)}<div class="m-body"><p class="sit">Combina la probabilitat i les conseqüències. Quin és el nivell de risc?</p><p class="q">${it.q}</p>
   <div class="opts">${LEVELS.map((l,i)=>`<button class="opt" data-act="lv" data-l="${l}"><span class="slot">${i+1}</span><span>${l}</span></button>`).join('')}</div>
   <details class="mxw"><summary>Consulta la matriu de l'INSST</summary><div class="mxwrap">${MATRIX}</div></details></div>${foot('','',true)}`,z.hex,true);
  G.handler=b=>{if(b.dataset.act==='close')return closeModal();if(b.dataset.act!=='lv')return;FINAL.tries++;
    if(b.dataset.l===it.ok){const pts=FINAL.tries===1?50:25;addScore(pts,5);FINAL.tries=0;FINAL.step++;const last=FINAL.step>=EVAL_N;
      openModal(`${head('Avaluació de riscos · Mètode INSST','Correcte')}<div class="m-body">${verdict('good',it.ok,`<span class="pts">+${pts} punts</span>`)}<p class="fb">${it.x}</p></div>${foot(last?'Acaba el torn':'Següent situació',last?'end':'next')}`,z.hex,false);
      G.handler=b2=>{if(b2.dataset.act==='next')finalView();else if(b2.dataset.act==='end'){FINAL.done=true;closeModal();awardBadge(5);setTimeout(showEnd,900);}};}
    else{hurt(10);if(FINAL.tries===1)logEntry(5,'Avaluació · '+it.q.replace(/<[^>]+>/g,''),'bad',b.dataset.l,it.x.replace(/<[^>]+>/g,''));
      openModal(`${head('Avaluació de riscos · Mètode INSST','Torna-ho a mirar')}<div class="m-body">${verdict('bad','Incorrecte','<span class="pts neg">−10 salut laboral</span>')}<p class="fb">«${b.dataset.l}» no és el nivell correcte. Creua la fila de la probabilitat amb la columna de les conseqüències.</p><div class="mxwrap">${MATRIX}</div></div>${foot('Torna-ho a provar','retry')}`,z.hex,false);
      G.handler=b2=>{if(b2.dataset.act==='retry')finalView();};}};
}
function helpView(){
  openModal(`${head('Ajuda','Com es juga')}<div class="m-body">
   <p><b>Objectiu.</b> A cada zona hi ha perills marcats amb <b style="color:var(--bad)">!</b>. Apropa-t'hi, prem <kbd>E</kbd> i tria la mesura. Després senyalitza i obre el cofre (<b style="color:var(--gold)">?</b>). Quan la zona està controlada, s'obre la porta.</p>
   <p><b>Puntuació.</b> Òptim (+100): evites el risc a l'origen o apliques protecció col·lectiva. Vàlid però millorable (+60): sovint un EPI quan hi havia una opció millor. Incorrecte: perds salut laboral. Senyal correcte: +25. Cofre: +50. Els reintents puntuen menys.</p>
   <p><b>Insígnies i nota.</b> En acabar cada zona reps una insígnia segons el percentatge de punts: Or (${BG.gold.min}% o més) = ${num(BG.gold.value)} punts, Plata (${BG.silver.min}%) = ${num(BG.silver.value)}, Bronze (${BG.bronze.min}%) = ${num(BG.bronze.value)}. La nota final (1-10) és la suma de les cinc insígnies, menys ${num(PEN)} per cada baixa laboral.</p>
   <p><b>Salut laboral.</b> Baixa amb els errors i quan et quedes exposat al soroll o a la calor. Si arriba a zero, tens una baixa laboral: −100 punts i tornes a l'entrada de la zona.</p>
   <p class="dmg">${CAT_HELP}</p>
   <p class="ctrl"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> o fletxes: moure · arrossega: girar la càmera · roda: zoom · <kbd>E</kbd>: actuar · <kbd>Espai</kbd>: saltar · <kbd>Maj</kbd>: córrer</p></div>${foot('Tornar al joc','close')}`,'#f2c230',true);
  G.handler=b=>{if(b.dataset.act==='close')closeModal();};
}
function baixa(){
  G.baixes++;G.score=Math.max(0,G.score-100);$('#score').textContent=G.score;G.health=100;lastHP=-1;
  const zi=zoneAt(P.x);P.x=zi===0?6:ZONES[zi].x0+1.7;P.z=11.5;P.y=0;
  openModal(`${head('Salut laboral esgotada','Baixa laboral')}<div class="m-body"><p class="sit">Has acumulat massa exposició al risc. Tornes a l'entrada de la zona amb −100 punts.</p><p class="fb">Controla el risc abans de quedar-t'hi exposat: el soroll i la calor fan mal encara que no ho notis a l'instant.</p></div>${foot('Torna a la feina','close')}`,'#e5533d',true);
  G.handler=b=>{if(b.dataset.act==='close')closeModal();};
}
function checkZone(zi){
  const z=ZONES[zi];if(!z.gate||z.open)return;
  if(HZ.filter(h=>h.zone===zi).every(h=>h.done)&&CHESTS.find(c=>c.zone===zi).done){
    z.open=true;z.gateAnim=0;for(let k=10;k<=12;k++){setSolid(z.gate,k,false);tall.delete(K(z.gate,k));}
    toast(`Zona superada. S'obre el pas cap a: ${ZONES[zi+1].name}`,'#4cc46a');awardBadge(zi);refreshHUD();}
}
/* ---------------- Badges, grade, report ---------------- */
const BG=CONFIG.BADGES,PEN=CONFIG.PENALTY_PER_BAIXA;
const TIERS=[{min:BG.gold.min,k:'g',name:'Or',v:BG.gold.value,c:[242,194,48]},{min:BG.silver.min,k:'s',name:'Plata',v:BG.silver.value,c:[201,209,219]},{min:BG.bronze.min,k:'b',name:'Bronze',v:BG.bronze.value,c:[201,138,75]},{min:0,k:'n',name:'Sense insígnia',v:0,c:[90,99,120]}];
const num=v=>v.toLocaleString('ca-ES');
const zonePct=i=>Math.round((G.zs[i]||0)/MAX.zm[i]*100);
const tierOf=p=>TIERS.find(t=>p>=t.min);
const fmt1=v=>v.toLocaleString('ca-ES',{minimumFractionDigits:1,maximumFractionDigits:1});
function awardBadge(i){if(G.badges[i])return;const p=zonePct(i),t=tierOf(p);G.badges[i]=t;renderBadges();
  toast(t.v?`Insígnia ${t.name} · ${ZONES[i].name} (${p}%)`:`${ZONES[i].name}: ${p}%, sense insígnia`,`rgb(${t.c.join(',')})`);}
function renderBadges(){$('#badges').innerHTML=[1,2,3,4,5].map(i=>{const t=G.badges[i];return t?`<span class="bdg ${t.k}" title="${ZONES[i].name}: ${t.name}">${i}</span>`:`<span class="bdg empty" title="${ZONES[i].name}">${i}</span>`;}).join('');}
function calcNota(){const sum=[1,2,3,4,5].reduce((a,i)=>a+(G.badges[i]?G.badges[i].v:0),0);const pen=G.baixes*PEN;return{sum,pen,nota:clamp(sum-pen,1,10)};}
/* Verification code: deters edited reports (the salt is in the page, so it is a deterrent, not cryptography) */
const SALT=CONFIG.SALT;
function fnv(str){let h=0x811c9dc5;for(const ch of str){h^=ch.codePointAt(0);h=Math.imul(h,16777619)>>>0;}let h2=h;for(const ch of str.split('').reverse().join('')){h2^=ch.codePointAt(0);h2=Math.imul(h2,2246822519)>>>0;}return((h.toString(36)+h2.toString(36)).toUpperCase()).slice(-7).padStart(7,'0');}
const normName=x=>x.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
function makeCode(r){const body=`${r.date}-${r.score}-${Math.round(r.nota*10)}-${r.baixes}`;return body+'-'+fnv(normName(r.name)+'|'+body+'|'+SALT);}
function verifyView(){
  openModal(`${head('Professorat','Verificar un informe')}<div class="m-body"><p class="sit">Escriu el nom tal com surt a l'informe i el codi de verificació.</p>
   <div class="field"><label for="vName">Nom de l'alumne/a</label><input id="vName" type="text" autocomplete="off"></div>
   <div class="field"><label for="vCode">Codi de verificació</label><input id="vCode" type="text" autocomplete="off" placeholder="20261112-1640-85-0-XXXXXXX"></div>
   <div id="vRes" hidden></div></div><div class="m-foot"><button class="btn ghost" data-act="close">Tanca (Esc)</button><button class="btn" data-act="verify">Verifica</button></div>`,'#4fa3e0',true);
  $('#vName').focus();
  G.handler=b=>{if(b.dataset.act==='close')return closeModal();if(b.dataset.act!=='verify')return;
    const name=$('#vName').value,code=$('#vCode').value.trim().toUpperCase().replace(/\s/g,''),out=$('#vRes');out.hidden=false;
    const m=code.match(/^(\d{8})-(\d+)-(\d+)-(\d+)-([0-9A-Z]{7})$/);
    let ok=false;if(m&&name.trim()){const r={date:m[1],score:+m[2],nota:+m[3]/10,baixes:+m[4],name};ok=makeCode(r)===code;
      if(ok){out.className='vres ok';out.innerHTML=`<b>Informe vàlid.</b><br>Data: ${m[1].slice(6,8)}/${m[1].slice(4,6)}/${m[1].slice(0,4)} · Nota: <b>${fmt1(r.nota)}</b> · Punts: ${r.score} · Baixes: ${r.baixes}`;return;}}
    out.className='vres bad';out.innerHTML="<b>El codi no coincideix.</b> Revisa que el nom estigui escrit igual que a l'informe. Si coincideix i el codi falla, l'informe s'ha modificat.";};
}
/* Optional automatic report: if CONFIG.RESULTS_ENDPOINT is set (Power Automate flow or
   Google Apps Script web app, see README.md), the report + the PDF in base64 are POSTed there. */
const pdfFileName=R=>`PrevenCraft_${normName(R.name).replace(/[^a-z0-9]+/g,'_')}_${R.date}.pdf`;
async function sendResults(R){
  const url=CONFIG.RESULTS_ENDPOINT;if(!url)return;
  const st=$('#sendStatus');st.hidden=false;st.className='vres';st.textContent="Enviant l'informe al professorat…";
  try{
    let pdfBase64='';try{if(window.jspdf)pdfBase64=buildPDF().output('datauristring').split(',')[1];}catch(e){}
    const gas=/script\.google(usercontent)?\.com/.test(url); // Apps Script: text/plain avoids the CORS preflight it does not support
    const res=await fetch(url,{method:'POST',headers:{'Content-Type':gas?'text/plain;charset=utf-8':'application/json'},body:JSON.stringify({...R,pdfName:pdfFileName(R),pdfBase64})});
    if(!res.ok)throw new Error('HTTP '+res.status);
    st.className='vres ok';st.textContent='Informe enviat al professorat.';
  }catch(e){st.className='vres bad';st.innerHTML="<b>No s'ha pogut enviar l'informe al professorat.</b> Descarrega el PDF i lliura'l a la tasca que t'indiqui el professorat.";}
}
function showEnd(){
  G.mode='end';const secs=Math.round((performance.now()-G.t0)/1000);const n=calcNota();const d=new Date();
  const date=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const optimal=HZ.filter(h=>!G.log.some(l=>l.item===h.title)).length;
  const R=G.report={name:G.name,date,dateTxt:d.toLocaleDateString('ca-ES'),timeTxt:d.toLocaleTimeString('ca-ES',{hour:'2-digit',minute:'2-digit'}),secs,attempt:G.attempt,score:G.score,max:MAX.t,nota:n.nota,sum:n.sum,pen:n.pen,baixes:G.baixes,optimal,
    zones:[1,2,3,4,5].map(i=>({name:ZONES[i].name,pts:G.zs[i]||0,max:MAX.zm[i],pct:zonePct(i),badge:G.badges[i].name,value:G.badges[i].v})),errors:G.log.map(l=>({item:l.item,type:l.q,choice:l.choice,fb:l.fb}))};
  R.code=makeCode(R);
  const rows=R.zones.map((z,k)=>{const t=G.badges[k+1];return`<tr><td>${z.name}</td><td class="n">${z.pts}/${z.max}</td><td class="n">${z.pct}%</td><td><span class="bdg ${t.k}">${k+1}</span> ${t.name}</td><td class="n">${fmt1(t.v)}</td></tr>`;}).join('');
  const errs=G.log.map(l=>`<li style="--ec:${l.q==='ok'?'var(--ok)':'var(--bad)'}"><b>${l.item}</b>Vas triar: «${l.choice}». ${l.fb}</li>`).join('');
  $('#endCard').innerHTML=`<div class="eyebrow">Informe del torn · ${R.dateTxt} ${R.timeTxt} · ${Math.floor(secs/60)} min ${secs%60} s · intent ${R.attempt}</div>
   <h2 class="logo" style="font-size:40px">Drassana segura</h2>
   <p><b>${escapeHtml(G.name)}</b> ha controlat tots els riscos de la UT3.</p>
   <div class="notabox"><div class="nota"><b>${fmt1(n.nota)}</b><span>NOTA (1-10)</span></div>
    <div><div class="big" style="font-size:30px">${G.score}</div><div class="hs-lbl">punts de ${MAX.t}</div></div>
    <div><div class="big" style="font-size:30px;color:var(--text)">${optimal}/${HZ.length}</div><div class="hs-lbl">òptimes al primer intent</div></div>
    <div><div class="big" style="font-size:30px;color:${G.baixes?'var(--bad)':'var(--good)'}">${G.baixes}</div><div class="hs-lbl">baixes (−${fmt1(n.pen)})</div></div></div>
   <div class="tblwrap"><table class="btable"><thead><tr><th>Zona</th><th class="n">Punts</th><th class="n">%</th><th>Insígnia</th><th class="n">Valor</th></tr></thead><tbody>${rows}</tbody>
    <tfoot><tr><td colspan="4">Suma d'insígnies − ${num(PEN)} per baixa</td><td class="n">${fmt1(n.sum)} − ${fmt1(n.pen)}</td></tr></tfoot></table></div>
   ${errs?`<div><div class="eyebrow" style="margin-bottom:8px">Per repassar</div><ul class="errs">${errs}</ul></div>`:'<p style="color:var(--good)">Cap error: totes les mesures han estat òptimes al primer intent.</p>'}
   <div><div class="eyebrow" style="margin-bottom:6px">Codi de verificació</div><span class="code">${R.code}</span></div>
   <p id="sendStatus" aria-live="polite" hidden></p>
   <p class="dmg" id="dlStatus" aria-live="polite">Descarrega l'informe en PDF i lliura'l a la tasca que t'indiqui el professorat.</p>
   <div class="endbtns"><button class="btn ghost" id="againBtn" type="button">Torna a jugar</button><button class="btn" id="pdfBtn" type="button">Descarrega l'informe (PDF)</button></div>`;
  $('#endScreen').hidden=false;['#hudZone','#hudStats','#prompt','#warn','#joy'].forEach(x=>$(x).hidden=true);
  $('#againBtn').onclick=()=>location.reload();$('#pdfBtn').onclick=downloadPDF;
  sendResults(R);
}
const pdfText=x=>String(x).replace(/<[^>]+>/g,'').replace(/₂/g,'2').replace(/[−–—]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/…/g,'...');
function buildPDF(){
  const R=G.report;const{jsPDF}=window.jspdf;const doc=new jsPDF({unit:'mm',format:'a4'});const W=210,Mg=16;let y;
  const line=(txt,size=10,style='normal',color=[20,24,32],indent=0)=>{doc.setFont('helvetica',style);doc.setFontSize(size);doc.setTextColor(...color);for(const l of doc.splitTextToSize(pdfText(txt),W-2*Mg-indent)){if(y>283){doc.addPage();y=18;}doc.text(l,Mg+indent,y);y+=size*.43;}};
  doc.setFillColor(19,32,54);doc.rect(0,0,W,30,'F');doc.setTextColor(242,194,48);doc.setFont('helvetica','bold');doc.setFontSize(22);doc.text('PrevenCraft',Mg,15);
  doc.setFontSize(10);doc.setTextColor(233,238,247);doc.setFont('helvetica','normal');doc.text(pdfText('Informe del torn · UT3 Factors de risc i la seva prevenció'),Mg,23);
  y=40;line('Alumne/a: '+R.name,13,'bold');line(`Data: ${R.dateTxt} ${R.timeTxt} · Durada: ${Math.floor(R.secs/60)} min ${R.secs%60} s · Intent nº ${R.attempt} en aquest navegador`,9.5,'normal',[80,86,98]);
  y+=4;doc.setFillColor(242,194,48);doc.setDrawColor(0);doc.setLineWidth(.6);doc.rect(Mg,y,38,24,'FD');doc.setTextColor(17,17,17);doc.setFont('helvetica','bold');doc.setFontSize(26);doc.text(fmt1(R.nota),Mg+19,y+14,{align:'center'});doc.setFontSize(8);doc.text('NOTA (1-10)',Mg+19,y+20.5,{align:'center'});
  doc.setFont('helvetica','normal');doc.setFontSize(11);doc.text(`Punts: ${R.score} de ${R.max}`,Mg+46,y+7);doc.text(pdfText(`Mesures òptimes al primer intent: ${R.optimal} de ${HZ.length}`),Mg+46,y+13.5);doc.text(pdfText(`Baixes laborals: ${R.baixes} (-${fmt1(R.pen)} punts de nota)`),Mg+46,y+20);
  y+=34;const cx=[Mg,Mg+86,Mg+108,Mg+124,Mg+168];doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(90,96,110);['ZONA','PUNTS','%',pdfText('INSÍGNIA'),'VALOR'].forEach((h,i)=>doc.text(h,cx[i],y));y+=2;doc.setDrawColor(180);doc.setLineWidth(.2);doc.line(Mg,y,W-Mg,y);y+=6;
  R.zones.forEach((z,k)=>{const t=G.badges[k+1];doc.setFont('helvetica','normal');doc.setFontSize(10.5);doc.setTextColor(20,24,32);doc.text(pdfText(z.name),cx[0],y);doc.text(`${z.pts}/${z.max}`,cx[1],y);doc.text(`${z.pct}%`,cx[2],y);doc.setFillColor(...t.c);doc.circle(cx[3]+2,y-1.3,2.2,'F');doc.text(pdfText(t.name),cx[3]+6,y);doc.text(fmt1(t.v),cx[4],y);y+=3;doc.line(Mg,y,W-Mg,y);y+=6;});
  doc.setFont('helvetica','bold');doc.text(pdfText(`Suma d'insígnies ${fmt1(R.sum)} - penalització ${fmt1(R.pen)} = ${fmt1(R.nota)}`),Mg,y);y+=7;
  line(`Càlcul: Or (${BG.gold.min}% o més) = ${num(BG.gold.value)} · Plata (${BG.silver.min}%) = ${num(BG.silver.value)} · Bronze (${BG.bronze.min}%) = ${num(BG.bronze.value)} · Sense insígnia = 0. Nota = suma de les 5 insígnies - ${num(PEN)} per baixa laboral (mínim 1, màxim 10). Els reintents puntuen menys.`,8.5,'normal',[90,96,110]);
  y+=5;line(R.errors.length?'Per repassar':'Cap error: totes les mesures han estat òptimes al primer intent.',12,'bold');y+=1;
  R.errors.forEach(e=>{line((e.type==='ok'?'[Millorable] ':'[Error] ')+e.item,10,'bold',e.type==='ok'?[160,110,0]:[190,50,40]);line(`Va triar: «${e.choice}». ${e.fb}`,9.5,'normal',[30,34,42],3);y+=2;});
  y+=4;line('Codi de verificació: '+R.code,11,'bold');line("El professorat pot comprovar el codi amb l'opció «Professorat: verificar un informe» de la pantalla d'inici del joc.",8.5,'normal',[90,96,110]);
  return doc;
}
function downloadPDF(){
  const st=$('#dlStatus'),R=G.report;if(!window.jspdf){st.textContent="No s'ha pogut generar el PDF. Fes una captura d'aquest informe.";return;}
  const blob=buildPDF().output('blob');const fn=pdfFileName(R);
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fn;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),10000);st.textContent='Informe descarregat: '+fn;
}
const escapeHtml=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------------- Input ---------------- */
const keys={};
addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'){if(e.code==='Enter'&&e.target.id==='nameIn')start();return;}
  if(G.mode==='play'){keys[e.code]=true;
    if(e.code==='KeyE'||e.code==='Enter'){interact();e.preventDefault();}
    else if(e.code==='KeyH')helpView();
    else if(e.code==='Space'){if(P.y<=.001)P.vy=6;e.preventDefault();}
    else if(e.code.startsWith('Arrow'))e.preventDefault();}
  else if(G.mode==='modal'){
    if(e.code==='Escape'&&G.closable){closeModal();return;}
    const map={KeyA:0,KeyB:1,KeyC:2,KeyD:3,Digit1:0,Digit2:1,Digit3:2,Digit4:3,Digit5:4};
    if(e.code in map){const bs=modal.querySelectorAll('.opt,.sgn');const b=bs[map[e.code]];if(b){b.click();e.preventDefault();}}}
});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
let drag=null;
canvas.addEventListener('pointerdown',e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||G.mode==='intro')return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;cam.yaw-=dx*.006;cam.pitch=clamp(cam.pitch+dy*.004,.1,1.25);});
const endDrag=e=>{if(drag&&drag.id===e.pointerId)drag=null;};
canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
canvas.addEventListener('wheel',e=>{cam.dist=clamp(cam.dist+e.deltaY*.005,3.5,12);e.preventDefault();},{passive:false});
const joy={x:0,y:0,id:null},joyEl=$('#joy'),knob=$('#knob');
function joyReset(){joy.x=joy.y=0;joy.id=null;knob.style.transform='';}
joyEl.addEventListener('pointerdown',e=>{joy.id=e.pointerId;joyEl.setPointerCapture(e.pointerId);joyMove(e);});
joyEl.addEventListener('pointermove',e=>{if(joy.id===e.pointerId)joyMove(e);});
joyEl.addEventListener('pointerup',joyReset);joyEl.addEventListener('pointercancel',joyReset);
function joyMove(e){const r=joyEl.getBoundingClientRect();let dx=(e.clientX-r.left-r.width/2)/(r.width/2),dy=(e.clientY-r.top-r.height/2)/(r.height/2);const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}joy.x=dx;joy.y=dy;knob.style.transform=`translate(${dx*34}px,${dy*34}px)`;}
const isTouch=matchMedia('(pointer:coarse)').matches;
$('#prompt').addEventListener('click',()=>{if(G.mode==='play')interact();});
$('#helpBtn').addEventListener('click',()=>{if(G.mode==='play')helpView();});

/* ---------------- Interaction & movement ---------------- */
function interactables(){const a=[];HZ.forEach(h=>{if(!h.done)a.push({k:'h',o:h,at:h.at,r:h.r,label:h.title});});CHESTS.forEach(c=>{if(!c.done)a.push({k:'c',o:c,at:c.at,r:c.r,label:'Obre el cofre de coneixement'});});if(!FINAL.done)a.push({k:'f',o:FINAL,at:FINAL.at,r:FINAL.r,label:'Parla amb la tècnica de prevenció'});return a;}
function nearest(){let best=null,bd=1e9;for(const it of interactables()){const d=Math.hypot(P.x-it.at[0],P.z-it.at[1]);if(d<it.r&&d<bd){bd=d;best=it;}}return best;}
function interact(){const n=G.near;if(!n)return;if(n.k==='h')hazardView(n.o);else if(n.k==='c')chestView(n.o);else finalView();}
const R=.3;
const free=(x,z)=>![[-R,-R],[R,-R],[-R,R],[R,R]].some(([ox,oz])=>solid.has(K(Math.floor(x+ox),Math.floor(z+oz))));
function lerpAngle(a,b,t){let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;return a+d*t;}
let player;
function updatePlayer(dt,t){
  const f=((keys.KeyW||keys.ArrowUp)?1:0)-((keys.KeyS||keys.ArrowDown)?1:0)-joy.y;
  const s=(keys.KeyD?1:0)-(keys.KeyA?1:0)+joy.x;
  if(keys.ArrowLeft)cam.yaw+=dt*1.9;if(keys.ArrowRight)cam.yaw-=dt*1.9;
  const sy=Math.sin(cam.yaw),cy=Math.cos(cam.yaw);
  let mx=-sy*f+cy*s,mz=-cy*f-sy*s;const len=Math.hypot(mx,mz);let amt=0;
  if(len>.08){const k=Math.min(len,1)/len;mx*=k;mz*=k;amt=Math.min(len,1);const sp=(keys.ShiftLeft||keys.ShiftRight)?7:4.4;
    const dx=mx*sp*dt,dz=mz*sp*dt;
    // If a solved hazard placed a solid cell where the player stands (e.g. the worker moved by "motor"), let them walk out instead of freezing.
    const stuck=!free(P.x,P.z);if(stuck||free(P.x+dx,P.z))P.x+=dx;if(stuck||free(P.x,P.z+dz))P.z+=dz;P.rot=lerpAngle(P.rot,Math.atan2(mx,mz),Math.min(1,dt*12));}
  P.vy-=18*dt;P.y+=P.vy*dt;if(P.y<0){P.y=0;P.vy=0;}
  P.walk+=dt*amt*(keys.ShiftLeft||keys.ShiftRight?1.5:1);
  player.root.position.set(P.x,P.y,P.z);player.root.rotation.y=P.rot;animWalk(player,P.walk,amt);
  if(!amt){player.upper.position.y=.8+Math.sin(t*2)*.008;}
  G.shadow.position.set(P.x,.025,P.z);
}
function updateCamera(dt,t){
  if(G.mode==='intro'){cam.yaw+=dt*.22;const d=4.4,tx=P.x,ty=1.05,tz=P.z;camera.position.set(tx+Math.sin(cam.yaw)*d*.97,ty+.6,tz+Math.cos(cam.yaw)*d*.97);camera.lookAt(tx+(innerWidth>640?-1.1*Math.cos(cam.yaw):0),ty,tz+(innerWidth>640?1.1*Math.sin(cam.yaw):0));return;}
  const tx=P.x,ty=P.y+1.35,tz=P.z,cp=Math.cos(cam.pitch),dx=Math.sin(cam.yaw)*cp,dy=Math.sin(cam.pitch),dz=Math.cos(cam.yaw)*cp;
  let want=cam.dist;for(let d=.4;d<=cam.dist;d+=.15){const y=ty+dy*d;if(y<3.15&&tall.has(K(Math.floor(tx+dx*d),Math.floor(tz+dz*d)))){want=Math.max(1.1,d-.35);break;}}
  cam.cur=cam.cur==null?want:(want<cam.cur?want:cam.cur+(want-cam.cur)*Math.min(1,dt*4));const D=cam.cur;
  camera.position.set(tx+dx*D,ty+dy*D,tz+dz*D);camera.lookAt(tx,ty,tz);
}

/* ---------------- Main loop ---------------- */
let last=performance.now(),warnShown=false;
function loop(now){
  requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;const t=now/1000;
  if(G.mode==='play')updatePlayer(dt,t);else if(player)animWalk(player,0,0);
  updateCamera(dt,t);updEmitters(dt);
  HZ.forEach(h=>h.tick&&h.tick(h,t,dt));
  markers.forEach(s=>{s.position.y=s.userData.by+Math.sin(t*2.2+s.position.x)*.12;});
  CHESTS.forEach(c=>{if(c.done&&c.lid.rotation.x>-1.2)c.lid.rotation.x=Math.max(-1.2,c.lid.rotation.x-dt*3);});
  ZONES.forEach(z=>{if(z.open&&z.gateMeshes&&z.gateMeshes.length){z.gateAnim+=dt;z.gateMeshes.forEach(m=>{m.position.y-=dt*2.4;});if(z.gateAnim>1.4){z.gateMeshes.forEach(m=>scene.remove(m));z.gateMeshes=[];}}});
  if(G.waterTex)G.waterTex.offset.x=(G.waterTex.offset.x+dt*.04)%1;
  if(G.clouds)G.clouds.forEach(c=>{c.position.x+=dt*.7;if(c.position.x>160)c.position.x=-50;});
  if(G.mode==='play'){
    let drain=null;for(const h of HZ){if(h.done||!h.drain)continue;if(Math.hypot(P.x-h.drain.x,P.z-h.drain.z)<h.drain.r){drain=h.drain;break;}}
    if(drain){G.health=Math.max(0,G.health-drain.rate*dt);if(!warnShown){$('#warn').textContent=drain.msg;$('#warn').hidden=false;warnShown=true;}}
    else{if(warnShown){$('#warn').hidden=true;warnShown=false;}if(G.hurtT<=0)G.health=Math.min(100,G.health+1.5*dt);}
    G.hurtT-=dt;$('#vignette').style.opacity=(drain||G.hurtT>0)?.6:0;
    if(G.health<=0){baixa();}
    const n=nearest();if(n!==G.near&&(!n||!G.near||n.o!==G.near.o)){G.near=n;$('#prompt').hidden=!n;if(n)$('#promptTxt').textContent=n.label;}
    if(zoneAt(P.x)!==lastZone)refreshHUD();
  }else{$('#vignette').style.opacity=G.mode==='modal'&&G.hurtT>0?.5:0;G.hurtT-=dt;}
  drawHP();
  renderer.render(scene,camera);
}

/* ---------------- Start ---------------- */
function start(){
  if(G.mode!=='intro')return;G.name=($('#nameIn').value||'').trim()||'Alumne/a';
  $('#intro').hidden=true;['#hudZone','#hudStats'].forEach(s=>$(s).hidden=false);if(isTouch)$('#joy').hidden=false;
  try{G.attempt=(+localStorage.getItem('prevencraft_intents')||0)+1;localStorage.setItem('prevencraft_intents',G.attempt);}catch(e){}renderBadges();
  G.mode='play';G.t0=performance.now();cam.yaw=-Math.PI/2;cam.pitch=.42;P.rot=Math.PI/2;refreshHUD();canvas.focus({preventScroll:true});
  toast(isTouch?'Mou-te amb el joystick i toca el rètol inferior per actuar':'Camina cap al portal de la dreta. Els senyals ! marquen perills.');
}
$('#startBtn').addEventListener('click',start);
$('#verifyBtn').addEventListener('click',verifyView);

async function init(){
  try{await Promise.race([document.fonts.load('700 30px "Pixelify Sans"'),new Promise(r=>setTimeout(r,1500))]);}catch(e){}
  buildWorld();
  player=makeHuman(LOOK_PLAYER);scene.add(player.root);
  G.shadow=new THREE.Mesh(new THREE.CircleGeometry(.38,20),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.25,depthWrite:false}));G.shadow.rotation.x=-Math.PI/2;scene.add(G.shadow);
  player.root.position.set(P.x,0,P.z);player.root.rotation.y=P.rot;
  requestAnimationFrame(loop);
}
init();
})();
