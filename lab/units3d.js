/* Skirmish 3D units. A classic script (so it also works when the page is opened from file://):
   defines window.Units3D. Builders take the THREE namespace, so the page decides which three.js it loads.
   Models are built in metres (a 1.8 m knight) and scaled down to board units by the page. */
(function(){
"use strict";

/* ---------- seeded randomness + canvas textures, shared by every unit and prop ---------- */
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const cache={};
// draw(ctx,w,h,rand) paints the canvas once; color:true marks colour data (sRGB), otherwise it is data (roughness / bump)
function canvasTex(THREE,key,size,draw,{color=true,repeat=[1,1]}={}){
  const k=key+"|"+repeat;
  if(cache[k])return cache[k];
  let base=cache[key+"|canvas"];
  if(!base){base=document.createElement("canvas");base.width=base.height=size;draw(base.getContext("2d"),size,size,rng([...key].reduce((h,ch)=>Math.imul(h^ch.charCodeAt(0),16777619),2166136261)));cache[key+"|canvas"]=base}
  const t=new THREE.CanvasTexture(base);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat[0],repeat[1]);t.anisotropy=8;
  if(color)t.colorSpace=THREE.SRGBColorSpace;
  return cache[k]=t;
}
function noise(ctx,w,h,r,amp){ // per-pixel grey jitter on whatever is already painted
  const d=ctx.getImageData(0,0,w,h),a=d.data;
  for(let i=0;i<a.length;i+=4){const n=(r()-.5)*amp;a[i]+=n;a[i+1]+=n;a[i+2]+=n}
  ctx.putImageData(d,0,0);
}
const TEX={
  // brushed, scratched steel: used as roughness and bump map
  scratch:(T,rep)=>canvasTex(T,"scratch",256,(c,w,h,r)=>{
    c.fillStyle="#808080";c.fillRect(0,0,w,h);noise(c,w,h,r,22);
    for(let i=0;i<500;i++){c.strokeStyle=`rgba(${r()<.5?255:0},${r()<.5?255:0},${r()<.5?255:0},.06)`;c.lineWidth=1;const x=r()*w,y=r()*h;c.beginPath();c.moveTo(x,y);c.lineTo(x+20+r()*70,y+(r()-.5)*3);c.stroke()}
    for(let i=0;i<60;i++){c.strokeStyle="rgba(255,255,255,.35)";const x=r()*w,y=r()*h,a=r()*Math.PI,l=6+r()*30;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);c.stroke()}
  },{color:false,repeat:rep}),
  // riveted chainmail rings
  mail:(T,rep)=>canvasTex(T,"mail",64,(c,w,h)=>{
    c.fillStyle="#1a1a1a";c.fillRect(0,0,w,h);
    for(let y=-1;y<=8;y++)for(let x=-1;x<=8;x++){
      const cx=x*8+(y&1?4:0),cy=y*8;
      c.lineWidth=2.2;c.strokeStyle="#8a8a8a";c.beginPath();c.arc(cx,cy,3.6,0,Math.PI*2);c.stroke();
      c.lineWidth=1.2;c.strokeStyle="#e0e0e0";c.beginPath();c.arc(cx,cy,3.6,Math.PI*1.1,Math.PI*1.7);c.stroke();
    }
  },{repeat:rep}),
  // neutral woven wool, tinted by the material colour (so team colour changes are free)
  cloth:(T,rep)=>canvasTex(T,"cloth",256,(c,w,h,r)=>{
    c.fillStyle="#ececec";c.fillRect(0,0,w,h);
    for(let i=0;i<w;i+=2){c.fillStyle=`rgba(0,0,0,${.035+r()*.03})`;c.fillRect(i,0,1,h);c.fillRect(0,i,w,1)}
    noise(c,w,h,r,26);
    for(let i=0;i<14;i++){const x=r()*w,y=h*(.55+r()*.45),g=c.createRadialGradient(x,y,0,x,y,10+r()*30);g.addColorStop(0,"rgba(70,50,30,.22)");g.addColorStop(1,"rgba(70,50,30,0)");c.fillStyle=g;c.fillRect(0,0,w,h)}
  },{repeat:rep}),
  // painted wood with chips and scuffs, tinted by the material colour
  paint:(T)=>canvasTex(T,"paint",256,(c,w,h,r)=>{
    c.fillStyle="#f2f2f2";c.fillRect(0,0,w,h);noise(c,w,h,r,14);
    for(let i=0;i<22;i++){c.fillStyle=`rgba(150,120,90,${.35+r()*.3})`;const e=r()<.6,x=e?(r()<.5?r()*20:w-r()*20):r()*w,y=r()*h,s=1+r()*3.5;c.beginPath();for(let k=0;k<7;k++){const a=k/7*Math.PI*2,rr=s*(.5+r());c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}c.fill()}
    for(let i=0;i<70;i++){c.strokeStyle="rgba(255,255,255,.4)";const x=r()*w,y=r()*h,a=r()*Math.PI;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*(5+r()*25),y+Math.sin(a)*(5+r()*25));c.stroke()}
  }),
  grain:(T,rep)=>canvasTex(T,"grain",128,(c,w,h,r)=>{c.fillStyle="#bdbdbd";c.fillRect(0,0,w,h);noise(c,w,h,r,40);for(let i=0;i<30;i++){c.strokeStyle="rgba(0,0,0,.12)";const y=r()*h;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(w*.3,y+(r()-.5)*12,w*.7,y+(r()-.5)*12,w,y);c.stroke()}},{repeat:rep}),
};

/* ---------- geometry helpers ---------- */
// lathe from [[radius,y],...]; the seam is turned to the back (-z) where it is least visible
const lathe=(T,pts,seg=32,start=Math.PI,len=Math.PI*2)=>new T.LatheGeometry(pts.map(([r,y])=>new T.Vector2(r,y)),seg,start,len);
function warp(geo,f){ // f(v) edits a {x,y,z} vertex in place
  const p=geo.attributes.position,v={x:0,y:0,z:0};
  for(let i=0;i<p.count;i++){v.x=p.getX(i);v.y=p.getY(i);v.z=p.getZ(i);f(v,i);p.setXYZ(i,v.x,v.y,v.z)}
  geo.computeVertexNormals();return geo;
}

/* ---------- the knight ---------- */
function makeKnight(T,{team=0x2f6fb5}={}){
  const scratch=TEX.scratch(T),M={
    steel:new T.MeshStandardMaterial({color:0xadb4bc,metalness:1,roughness:.5,roughnessMap:scratch,bumpMap:scratch,bumpScale:.6}),
    blade:new T.MeshStandardMaterial({color:0xe2e6ea,metalness:1,roughness:.22,roughnessMap:scratch}),
    mail:new T.MeshStandardMaterial({color:0xb0b6bc,metalness:.9,roughness:.55,map:TEX.mail(T,[14,5]),bumpMap:TEX.mail(T,[14,5]),bumpScale:2}),
    cloth:new T.MeshStandardMaterial({color:team,roughness:.92,map:TEX.cloth(T,[2,2]),side:T.DoubleSide}),
    paint:new T.MeshStandardMaterial({color:team,roughness:.6,map:TEX.paint(T)}),
    trim:new T.MeshStandardMaterial({color:0xe8dbb3,roughness:.55,map:TEX.paint(T)}),
    brass:new T.MeshStandardMaterial({color:0xdcb66c,metalness:1,roughness:.35,roughnessMap:scratch}),
    leather:new T.MeshStandardMaterial({color:0x6a4426,roughness:.75,map:TEX.grain(T,[1,3])}),
    wood:new T.MeshStandardMaterial({color:0x7a5532,roughness:.8,map:TEX.grain(T,[1,1])}),
    void:new T.MeshStandardMaterial({color:0x050505,roughness:1}),
  };
  const add=(parent,geo,mat,x=0,y=0,z=0)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m};
  const group=(parent,x=0,y=0,z=0)=>{const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g};
  const cyl=(rt,rb,h,s=20,open=false)=>new T.CylinderGeometry(rt,rb,h,s,1,open);

  const root=new T.Group(),model=group(root),body=group(model);
  model.scale.setScalar(.5); // 1.8 m knight -> 0.9 board units

  /* legs: hip -> knee -> foot pivots so walking can bend them */
  const legs=[-1,1].map(s=>{
    const hip=group(body,s*.1,.92,0);
    add(hip,cyl(.072,.062,.42),M.steel,0,-.2,.005);                        // cuisse
    const knee=group(hip,0,-.43,0);
    add(knee,new T.SphereGeometry(.064,20,12),M.steel,0,0,.012).scale.set(1,.9,1.15); // poleyn
    add(knee,cyl(.03,.03,.012,16),M.steel,s*.06,0,.01).rotation.z=Math.PI/2;           // knee fan
    add(knee,cyl(.055,.043,.36),M.steel,0,-.2,0);                           // greave
    const foot=group(knee,0,-.4,0);
    const sab=add(foot,new T.CapsuleGeometry(.045,.15,6,14),M.steel,0,-.035,.055);sab.rotation.x=Math.PI/2;sab.scale.set(1,1,.7);
    return {hip,knee};
  });

  /* torso: mail hauberk, shaped breastplate with a centre ridge, gorget, belt, surcoat skirt */
  add(body,cyl(.16,.165,.16,28),M.mail,0,.98,0);
  add(body,warp(lathe(T,[[.16,.98],[.175,1.04],[.19,1.16],[.2,1.28],[.19,1.38],[.15,1.46],[.09,1.5],[.07,1.52]],48),v=>{
    if(v.z>0){v.z*=.82;if(v.y>1.06&&v.y<1.45)v.z+=.016*Math.exp(-((v.x/.035)**2))}else v.z*=.66;
  }),M.steel);
  add(body,lathe(T,[[.088,1.46],[.092,1.5],[.078,1.56]],28),M.steel);        // gorget
  add(body,warp(lathe(T,[[.178,1.06],[.178,1.0]],40),v=>{v.z*=v.z>0?.84:.7}),M.leather); // belt
  add(body,new T.BoxGeometry(.05,.05,.02),M.brass,0,1.03,.155);
  add(body,warp(lathe(T,[[.17,1.02],[.2,.9],[.235,.75],[.255,.6]],48),v=>{    // surcoat skirt with folds
    const a=Math.atan2(v.x,v.z),d=(1.02-v.y)/.42,k=1+.05*Math.sin(a*9)*d;v.x*=k;v.z*=k*(v.z>0?.9:.8);
  }),M.cloth);

  /* scabbard on the left hip */
  const scab=group(body,.2,1.0,-.06);scab.rotation.set(.55,0,.1);
  add(scab,cyl(.02,.017,.72,10),M.leather,0,-.37,0);
  add(scab,new T.ConeGeometry(.02,.06,10),M.brass,0,-.76,0).rotation.x=Math.PI;
  add(scab,cyl(.024,.024,.04,10),M.brass,0,-.03,0);

  /* cape hanging from the shoulders, flaring and folding toward the hem */
  const cape=group(body,0,1.47,0);
  const capeGeo=new T.PlaneGeometry(1,1,14,16),uv=capeGeo.attributes.uv;
  add(cape,warp(capeGeo,(v,i)=>{
    const u=uv.getX(i)*2-1,w=1-uv.getY(i);
    v.x=u*.25*(1+w*.45);v.y=-w*1.02;v.z=-(.15+.17*w)-.05*(1-u*u)+.018*Math.sin(u*Math.PI*3.5)*w;
  }),M.cloth);

  /* helm: sugarloaf great helm, brass cross over the eye slits, breaths, torse and plume */
  const head=group(body,0,1.5,0);
  const helmPts=[[.112,0],[.126,.05],[.131,.14],[.129,.2],[.116,.25],[.082,.29],[.032,.31],[.001,.315]];
  add(head,lathe(T,helmPts,40),M.steel);
  add(head,lathe(T,helmPts.slice(1,6).map(([r,y])=>[r*1.03,y]),16,-.1,.2),M.brass);       // vertical strip
  add(head,cyl(.1335,.1335,.022,40,true),M.brass,0,.2,0);                                  // brow band
  for(const s of[-1,1])add(head,new T.BoxGeometry(.075,.013,.03),M.void,s*.05,.172,.118).rotation.y=s*.4; // eye slits
  for(let row=0;row<3;row++)for(let j=0;j<3;j++){const a=-.45-j*.13-row*.04,r=.131;add(head,new T.SphereGeometry(.0065,6,4),M.void,Math.sin(a)*r,.06+row*.028,Math.cos(a)*r)}
  add(head,new T.TorusGeometry(.108,.014,8,28),M.cloth,0,.262,0).rotation.x=Math.PI/2;      // torse
  for(let i=0;i<5;i++){
    const f=add(head,new T.SphereGeometry(1,10,8),i%2?M.trim:M.cloth,0,.36-i*.012,-.02-i*.035);
    f.scale.set(.016,.12,.03);f.rotation.x=-.35-i*.28;
  }

  /* arms: shoulder -> elbow -> hand pivots; mail sleeves under plate */
  const arm=s=>{
    const sh=group(body,s*.235,1.42,0);
    add(sh,new T.SphereGeometry(.105,24,12,0,Math.PI*2,0,Math.PI*.55),M.steel,0,.02,0).scale.set(1.05,.85,1.1); // pauldron
    for(let i=1;i<3;i++)add(sh,cyl(.1-i*.008,.104-i*.008,.035,24,true),M.steel,0,.01-i*.035,0);              // lames
    add(sh,cyl(.052,.046,.28,16),M.mail,0,-.15,0);
    const el=group(sh,0,-.3,0);
    add(el,new T.SphereGeometry(.052,16,10),M.steel);
    add(el,cyl(.045,.045,.01,16),M.steel,s*.045,0,0).rotation.z=Math.PI/2;                                   // couter fan
    add(el,cyl(.045,.038,.24,16),M.steel,0,-.13,0);                                                         // vambrace
    const hand=group(el,0,-.28,0);
    add(hand,cyl(.05,.042,.07,16,true),M.steel,0,.03,0);                                                    // gauntlet cuff
    add(hand,new T.CapsuleGeometry(.036,.04,4,10),M.steel,0,-.03,.005).scale.set(1,1,.85);                  // fist
    return {sh,el,hand};
  };
  const R=arm(-1),L=arm(1);

  /* longsword in the right hand: wheel pommel, leather grip, cross, tapered blade with a fuller */
  const sword=group(R.hand,0,-.02,.01);sword.rotation.x=1.6;
  add(sword,cyl(.016,.018,.22,10),M.leather,0,-.01,0);
  add(sword,cyl(.032,.032,.018,16),M.brass,0,-.135,0).rotation.x=Math.PI/2;
  add(sword,new T.CapsuleGeometry(.011,.2,4,8),M.brass,0,.11,0).rotation.z=Math.PI/2;
  const bs=new T.Shape();bs.moveTo(-.024,0);bs.lineTo(-.02,.68);bs.lineTo(0,.84);bs.lineTo(.02,.68);bs.lineTo(.024,0);bs.closePath();
  add(sword,new T.ExtrudeGeometry(bs,{depth:.002,bevelEnabled:true,bevelThickness:.003,bevelSize:.006,bevelSegments:1}),M.blade,0,.12,-.001);
  for(const s of[-1,1])add(sword,new T.BoxGeometry(.01,.5,.002),M.steel,0,.42,s*.0045);

  /* heater shield strapped to the left forearm: curved, painted, iron rim, cream cross */
  const mount=group(L.el,0,-.17,.03);mount.rotation.x=Math.PI/2;
  const shield=group(mount);shield.rotation.y=.3;
  const ss=new T.Shape();ss.moveTo(-.27,.28);ss.lineTo(.27,.28);ss.lineTo(.27,.02);ss.quadraticCurveTo(.25,-.25,0,-.42);ss.quadraticCurveTo(-.25,-.25,-.27,.02);ss.closePath();
  const bend=v=>{v.z-=v.x*v.x*.9};
  const faceGeo=warp(new T.ExtrudeGeometry(ss,{depth:.02,bevelEnabled:true,bevelThickness:.008,bevelSize:.012,bevelSegments:2,curveSegments:10}),bend);
  M.paint.map=M.paint.map.clone();M.paint.map.repeat.set(1/.54,1/.7);M.paint.map.offset.set(.5,.6);
  add(shield,faceGeo,[M.paint,M.steel],0,0,-.03);
  const cross=new T.Shape(),cw=.045;
  [[-cw,.25],[cw,.25],[cw,.07],[.22,.07],[.22,-.02],[cw,-.02],[cw,-.34],[-cw,-.34],[-cw,-.02],[-.22,-.02],[-.22,.07],[-cw,.07]].forEach(([x,y],i)=>i?cross.lineTo(x,y):cross.moveTo(x,y));
  add(shield,warp(new T.ExtrudeGeometry(cross,{depth:.004,bevelEnabled:false}),bend),M.trim,0,0,.0);
  add(shield,new T.SphereGeometry(.03,16,8,0,Math.PI*2,0,Math.PI/2),M.steel,0,.025,.004).rotation.x=Math.PI/2; // boss

  /* ---------- poses and animation ---------- */
  const REST={rsx:-.3,rsz:-.12,rex:-1.0,lsx:-.2,lsz:.15,lex:-1.35,tw:0,lean:0,lunge:0};
  // attack keyframes: wind the sword up over the head, cut down and forward with a step, recover
  const ATTACK=[[0,REST],[.35,{rsx:-2.75,rsz:-.25,rex:-1.3,lsx:-.5,lsz:.2,lex:-1.4,tw:-.35,lean:.05,lunge:-.03}],
    [.55,{rsx:-.55,rsz:-.05,rex:-.15,lsx:-.1,lsz:.25,lex:-1.2,tw:.3,lean:.2,lunge:.18}],[1,REST]];
  const ease=x=>x<.5?2*x*x:1-(2-2*x)**2/2;
  const pose=(frames,p)=>{let i=0;while(i<frames.length-2&&p>frames[i+1][0])i++;const[a,A]=frames[i],[b,B]=frames[i+1],k=ease(Math.min(1,Math.max(0,(p-a)/(b-a)))),o={};for(const key in A)o[key]=A[key]+(B[key]-A[key])*k;return o};
  const flashMats=[M.steel,M.cloth,M.mail];
  let anim=null,walkPhase=0,walkAmt=0;

  root.walking=false;root.dead=false;
  root.setTeam=c=>{M.cloth.color.set(c);M.paint.color.set(c)};
  // kind: "attack" | "hit" | "die"; resolves when the animation finishes
  root.play=kind=>new Promise(done=>{anim={kind,t:0,dur:{attack:.9,hit:.55,die:1.1}[kind],done}});
  root.update=(t,dt)=>{
    walkAmt+=((root.walking?1:0)-walkAmt)*Math.min(1,dt*10);
    walkPhase+=dt*9*walkAmt;
    const s=Math.sin(walkPhase)*walkAmt,c=Math.cos(walkPhase);
    let P=REST,hitK=0;
    if(anim){
      anim.t+=dt;const p=Math.min(1,anim.t/anim.dur);
      if(anim.kind==="attack")P=pose(ATTACK,p);
      else if(anim.kind==="hit")hitK=Math.sin(p*Math.PI)*(1-p*.5);
      if(p>=1){const d=anim.done;if(anim.kind==="die")root.dead=true;anim=null;d()}
    }
    if(root.dead||anim&&anim.kind==="die"){
      const p=root.dead?1:ease(anim.t/anim.dur);
      body.rotation.set(-p*Math.PI/2,0,p*.3);body.position.set(0,p*.06,-p*.15);
      R.sh.rotation.set(-1.4*p,0,-.4*p);L.sh.rotation.set(-1.2*p,0,.6*p);
      return;
    }
    body.position.set(0,Math.sin(t*2)*.006+Math.abs(c)*.035*walkAmt,P.lunge-hitK*.12);
    body.rotation.set(P.lean-hitK*.35,P.tw,0);
    head.rotation.set(0,Math.sin(t*.6)*.15*(1-walkAmt),0);
    legs[0].hip.rotation.x=-s*.55;legs[1].hip.rotation.x=s*.55;
    legs[0].knee.rotation.x=Math.max(0,c)*.9*walkAmt;legs[1].knee.rotation.x=Math.max(0,-c)*.9*walkAmt;
    R.sh.rotation.set(P.rsx+s*.15,0,P.rsz);R.el.rotation.x=P.rex;
    L.sh.rotation.set(P.lsx-s*.1,0,P.lsz);L.el.rotation.x=P.lex;
    cape.rotation.x=.04+walkAmt*.22+Math.sin(t*1.4)*.025;
    for(const m of flashMats)m.emissive.setRGB(hitK*.9,hitK*.12,hitK*.08);
  };
  root.update(0,0);
  return root;
}

window.Units3D={makeKnight,canvasTex,noise,rng,warp,lathe,TEX};
})();
