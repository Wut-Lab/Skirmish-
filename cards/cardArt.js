/* Card artwork: paints any of the 52 faces, or the dragon back, onto a 2D canvas.
   The 3D page turns these canvases into textures ("stickers") for the card models.
   Everything is drawn on a 300 x 420 grid (the 63 x 88 mm shape of a real card) and scaled to the canvas size. */
(function(){
"use strict";
const W=300,H=420;
const INK={red:"#c8102e",black:"#151515",gold:"#e0a91b",blue:"#1f4f9e",skin:"#f7dcbc",paper:"#fbf9f3",back:"#9b1b27",cream:"#f5ead2"};
const RANKS=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const SUITS="SHDC"; // spades, hearts, diamonds, clubs
const suitColor=s=>s==="H"||s==="D"?INK.red:INK.black;

/* ---------- suit symbols, each drawn in a 100 x 100 box ---------- */
const SYM={
  H:new Path2D("M50 94C22 68 3 52 3 30C3 14 15 4 29 4C39 4 46 10 50 19C54 10 61 4 71 4C85 4 97 14 97 30C97 52 78 68 50 94Z"),
  D:new Path2D("M50 2Q68 28 88 50Q68 72 50 98Q32 72 12 50Q32 28 50 2Z"),
  S:new Path2D("M50 3C78 30 97 45 97 63C97 77 86 85 74 85C64 85 56 80 52 72C53 84 58 92 67 98H33C42 92 47 84 48 72C44 80 36 85 26 85C14 85 3 77 3 63C3 45 22 30 50 3Z"),
  C:(()=>{const p=new Path2D();for(const[x,y]of[[50,27],[27,59],[73,59]]){p.moveTo(x+22,y);p.arc(x,y,22,0,Math.PI*2)}
    p.moveTo(62,56);p.arc(50,56,12,0,Math.PI*2);p.addPath(new Path2D("M46 60C46 80 41 91 32 98H68C59 91 54 80 54 60Z"));return p})(),
};
// draw a suit symbol centred on (x,y), `size` wide; flip turns it upside down (pips in the lower half of a card)
function suit(ctx,s,x,y,size,flip,color){
  ctx.save();ctx.translate(x,y);if(flip)ctx.rotate(Math.PI);ctx.scale(size/100,size/100);ctx.translate(-50,-50);
  ctx.fillStyle=color||suitColor(s);ctx.fill(SYM[s]);ctx.restore();
}

/* ---------- faces ---------- */
// the rank and a small suit in the top-left corner, repeated upside down in the bottom-right
function corners(ctx,rank,s){
  for(const flip of[false,true]){
    ctx.save();if(flip){ctx.translate(W,H);ctx.rotate(Math.PI)}
    ctx.fillStyle=suitColor(s);ctx.textAlign="center";ctx.textBaseline="alphabetic";
    ctx.font=`bold 40px Georgia,"Times New Roman",serif`;
    ctx.save();ctx.translate(27,52);if(rank==="10")ctx.scale(.74,1);ctx.fillText(rank,0,0);ctx.restore();
    suit(ctx,s,27,74,25);
    ctx.restore();
  }
}
// where the pips go on number cards: [column, row] with columns 0..2 and rows 0..1 (top to bottom)
const L=.25,C=.5,R=.75;
const PIPS={
  2:[[C,0],[C,1]],3:[[C,0],[C,.5],[C,1]],4:[[L,0],[R,0],[L,1],[R,1]],
  5:[[L,0],[R,0],[C,.5],[L,1],[R,1]],6:[[L,0],[R,0],[L,.5],[R,.5],[L,1],[R,1]],
  7:[[L,0],[R,0],[C,.25],[L,.5],[R,.5],[L,1],[R,1]],8:[[L,0],[R,0],[C,.25],[L,.5],[R,.5],[C,.75],[L,1],[R,1]],
  9:[[L,0],[R,0],[L,1/3],[R,1/3],[C,.5],[L,2/3],[R,2/3],[L,1],[R,1]],
  10:[[L,0],[R,0],[C,1/6],[L,1/3],[R,1/3],[L,2/3],[R,2/3],[C,5/6],[L,1],[R,1]],
};
function pips(ctx,n,s){
  const size=n===10?48:52;
  for(const[cx,cy]of PIPS[n])suit(ctx,s,60+cx*180,90+cy*240,size,cy>.5);
}
function ace(ctx,s){
  if(s!=="S")return suit(ctx,s,W/2,H/2,118);
  // the ace of spades is traditionally the fancy one: a big spade in a ring, with the deck's name
  ctx.save();ctx.strokeStyle=INK.black;ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(W/2,H/2-4,92,0,Math.PI*2);ctx.stroke();
  ctx.lineWidth=1;ctx.beginPath();ctx.arc(W/2,H/2-4,86,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;ctx.save();ctx.translate(W/2+Math.cos(a)*89,H/2-4+Math.sin(a)*89);ctx.rotate(a);ctx.fillStyle=INK.black;ctx.beginPath();ctx.ellipse(0,0,2,5,0,0,Math.PI*2);ctx.fill();ctx.restore()}
  ctx.restore();
  suit(ctx,"S",W/2,H/2-6,132);
  ctx.fillStyle=INK.black;ctx.font=`italic 15px Georgia,serif`;ctx.textAlign="center";ctx.fillText("Dragon Deck",W/2,H/2+118);
}

/* ---------- court cards (J, Q, K): a double-ended figure, mirrored top to bottom like real cards ---------- */
function court(ctx,rank,s){
  const red=suitColor(s)===INK.red,main=red?INK.red:INK.blue,second=red?INK.blue:INK.red;
  const fx=52,fy=62,fw=196,fh=296;
  ctx.save();ctx.beginPath();ctx.rect(fx,fy,fw,fh);ctx.clip();
  ctx.fillStyle="#fffdf6";ctx.fillRect(fx,fy,fw,fh);
  for(const flip of[false,true]){
    ctx.save();ctx.translate(W/2,H/2);if(flip)ctx.rotate(Math.PI);
    ctx.beginPath();ctx.rect(-fw/2,-fh/2,fw,fh/2);ctx.clip();
    figure(ctx,rank,s,main,second);
    ctx.restore();
  }
  ctx.restore();
  ctx.strokeStyle=INK.black;ctx.lineWidth=2;ctx.strokeRect(fx,fy,fw,fh);
  ctx.strokeStyle=INK.gold;ctx.lineWidth=1.5;ctx.strokeRect(fx+4,fy+4,fw-8,fh-8);
  ctx.strokeStyle=INK.black;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(fx,H/2);ctx.lineTo(fx+fw,H/2);ctx.stroke();
}
// one half-figure, drawn with its waist at (0,0) and head toward -y
function figure(ctx,rank,s,main,second){
  const line=(w=2)=>{ctx.lineWidth=w;ctx.strokeStyle=INK.black;ctx.lineJoin="round";ctx.lineCap="round"};
  const shape=(d,fill)=>{const p=new Path2D(d);ctx.fillStyle=fill;ctx.fill(p);line();ctx.stroke(p)};
  const hair=rank==="K"?"#9a6a1c":INK.gold;
  ctx.translate(0,4);ctx.scale(.9,.9);

  // the item they hold, behind the body: K a sword, Q a flower, J a halberd
  if(rank==="K"){shape("M62 -6L58 -132L64 -146L70 -132L66 -6Z","#dfe4ea");shape("M46 -30H82V-24H46Z",INK.gold)}
  if(rank==="J"){shape("M-66 -2L-63 -120L-59 -120L-62 -2Z","#8a5a2b");shape("M-61 -146C-44 -138 -40 -122 -46 -110L-61 -114Z",'#dfe4ea');shape("M-61 -146C-78 -138 -82 -122 -76 -110L-61 -114Z",'#dfe4ea')}

  // robe: shoulders, a centre panel, and a gold collar
  shape("M-92 0C-90 -32 -78 -54 -40 -62H40C78 -54 90 -32 92 0Z",main);
  shape("M-22 0V-60H22V0Z",INK.gold);
  ctx.fillStyle=INK.black;for(let y=-50;y<0;y+=12)for(const x of[-10,0,10]){ctx.beginPath();ctx.arc(x+(y/12&1?5:0),y,1.6,0,7);ctx.fill()}
  shape("M-92 0C-90 -32 -80 -52 -60 -58L-52 0Z",second);
  shape("M92 0C90 -32 80 -52 60 -58L52 0Z",second);
  shape("M-44 -64C-30 -48 30 -48 44 -64C30 -72 -30 -72 -44 -64Z",INK.gold);
  ctx.fillStyle=main;for(let x=-30;x<=30;x+=15){ctx.beginPath();ctx.arc(x,-60,3,0,7);ctx.fill()}

  // hands holding the item
  if(rank==="K")shape("M54 -40C54 -50 74 -50 74 -40C74 -30 54 -30 54 -40Z",INK.skin);
  if(rank==="J")shape("M-74 -50C-74 -60 -54 -60 -54 -50C-54 -40 -74 -40 -74 -50Z",INK.skin);
  if(rank==="Q"){
    shape("M-56 -20C-58 -50 -52 -80 -48 -96","none");
    for(let i=0;i<5;i++){const a=i/5*Math.PI*2;ctx.save();ctx.translate(-48,-104);ctx.rotate(a);shape("M0 0C-6 -6 -6 -14 0 -16C6 -14 6 -6 0 0Z",second);ctx.restore()}
    ctx.fillStyle=INK.gold;ctx.beginPath();ctx.arc(-48,-104,4,0,7);ctx.fill();
    shape("M-64 -44C-64 -54 -44 -54 -44 -44C-44 -34 -64 -34 -64 -44Z",INK.skin);
  }

  // long hair (queen) goes behind the head
  if(rank==="Q")shape("M-30 -96C-40 -80 -40 -64 -32 -58H32C40 -64 40 -80 30 -96Z",hair);
  // neck and head
  shape("M-9 -70V-60H9V-70Z",INK.skin);
  shape("M0 -122C17 -122 24 -110 24 -96C24 -80 14 -70 0 -70C-14 -70 -24 -80 -24 -96C-24 -110 -17 -122 0 -122Z",INK.skin);
  // face: eyes, brows, nose, mouth
  ctx.fillStyle=INK.black;for(const x of[-9,9]){ctx.beginPath();ctx.ellipse(x,-98,2.4,1.8,0,0,7);ctx.fill()}
  line(1.4);ctx.beginPath();ctx.moveTo(-14,-104);ctx.quadraticCurveTo(-9,-107,-4,-104);ctx.moveTo(4,-104);ctx.quadraticCurveTo(9,-107,14,-104);
  ctx.moveTo(0,-98);ctx.lineTo(-3,-88);ctx.lineTo(1,-87);ctx.moveTo(-6,-80);ctx.quadraticCurveTo(0,-77,6,-80);ctx.stroke();
  ctx.fillStyle="rgba(214,90,90,.35)";for(const x of[-14,14]){ctx.beginPath();ctx.arc(x,-86,4,0,7);ctx.fill()}
  // beard (king), side curls (jack)
  if(rank==="K")shape("M-22 -92C-22 -70 -12 -60 0 -56C12 -60 22 -70 22 -92C16 -82 10 -78 0 -78C-10 -78 -16 -82 -22 -92Z",hair);
  if(rank==="K")shape("M-12 -84C-6 -88 6 -88 12 -84C6 -82 -6 -82 -12 -84Z",hair);
  if(rank==="J")for(const x of[-22,22])shape(`M${x} -112C${x*1.35} -104 ${x*1.35} -88 ${x} -80C${x*.9} -90 ${x*.9} -104 ${x} -112Z`,hair);

  // headwear: crown (king), tiara (queen), feathered cap (jack)
  if(rank==="K"){
    shape("M-26 -118L-30 -146L-16 -132L0 -150L16 -132L30 -146L26 -118Z",INK.gold);
    for(const[x,c]of[[-15,second],[0,main],[15,second]]){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,-124,3.5,0,7);ctx.fill()}
  }
  if(rank==="Q"){
    shape("M-24 -112C-26 -122 -18 -128 0 -128C18 -128 26 -122 24 -112C14 -118 -14 -118 -24 -112Z",hair);
    shape("M-22 -120L-18 -138L-8 -128L0 -142L8 -128L18 -138L22 -120Z",INK.gold);
    ctx.fillStyle=main;ctx.beginPath();ctx.arc(0,-130,3,0,7);ctx.fill();
  }
  if(rank==="J"){
    shape("M-28 -110C-30 -132 30 -132 28 -110C14 -116 -14 -116 -28 -110Z",main);
    shape("M-30 -110H30V-104H-30Z",INK.gold);
    shape("M18 -126C30 -144 50 -146 56 -140C44 -138 32 -132 22 -120Z",second);
  }
  // the suit, tucked into the top corner of the frame
  suit(ctx,s,-78,-126,24);
}

/* ---------- the back: two dragons chasing a pearl, the same both ways up ---------- */
function back(ctx){
  ctx.fillStyle=INK.paper;ctx.fillRect(0,0,W,H);
  const m=13;
  ctx.save();ctx.beginPath();ctx.roundRect(m,m,W-2*m,H-2*m,10);ctx.clip();
  ctx.fillStyle=INK.back;ctx.fillRect(0,0,W,H);
  // fine diamond lattice with a dot at each crossing
  ctx.strokeStyle="rgba(255,226,200,.28)";ctx.lineWidth=1;
  for(let i=-H;i<W+H;i+=14){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i+H,H);ctx.moveTo(i,0);ctx.lineTo(i-H,H);ctx.stroke()}
  ctx.fillStyle="rgba(255,226,200,.35)";
  for(let y=0;y<H;y+=7)for(let x=(y/7&1)*7;x<W;x+=14){ctx.beginPath();ctx.arc(x,y,1,0,7);ctx.fill()}
  ctx.restore();
  // double cream border lines and corner fans
  ctx.strokeStyle=INK.cream;ctx.lineWidth=1.6;ctx.beginPath();ctx.roundRect(m+6,m+6,W-2*m-12,H-2*m-12,6);ctx.stroke();
  ctx.lineWidth=.8;ctx.beginPath();ctx.roundRect(m+10,m+10,W-2*m-20,H-2*m-20,4);ctx.stroke();
  for(const[x,y,a]of[[m+10,m+10,0],[W-m-10,m+10,Math.PI/2],[W-m-10,H-m-10,Math.PI],[m+10,H-m-10,-Math.PI/2]]){
    ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.lineWidth=1.2;
    for(let r=10;r<=34;r+=8){ctx.beginPath();ctx.arc(0,0,r,0,Math.PI/2);ctx.stroke()}
    for(let i=0;i<=4;i++){const t=i/4*Math.PI/2;ctx.beginPath();ctx.moveTo(Math.cos(t)*10,Math.sin(t)*10);ctx.lineTo(Math.cos(t)*34,Math.sin(t)*34);ctx.stroke()}
    ctx.restore();
  }
  // the medallion
  const cx=W/2,cy=H/2,R=114;
  ctx.fillStyle=INK.cream;ctx.beginPath();ctx.arc(cx,cy,R,0,7);ctx.fill();
  ctx.strokeStyle=INK.back;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(cx,cy,R-6,0,7);ctx.stroke();
  ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,R-10,0,7);ctx.stroke();
  ctx.save();ctx.translate(cx,cy);
  pearl(ctx);
  dragon(ctx);ctx.rotate(Math.PI);dragon(ctx);
  ctx.restore();
}
function pearl(ctx){
  ctx.fillStyle=INK.back;
  for(let i=0;i<6;i++){ctx.save();ctx.rotate(i/6*Math.PI*2);ctx.beginPath();ctx.moveTo(-5,-14);ctx.quadraticCurveTo(0,-30,8,-26);ctx.quadraticCurveTo(2,-22,5,-14);ctx.fill();ctx.restore()}
  ctx.beginPath();ctx.arc(0,0,15,0,7);ctx.fill();
  ctx.strokeStyle=INK.cream;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*1.4);ctx.stroke();ctx.beginPath();ctx.arc(0,0,5,Math.PI,Math.PI*2.4);ctx.stroke();
}
// one dragon: a scaly body curving clockwise around the pearl, head turned in toward it
function dragon(ctx){
  const N=90,a0=-2.55,span=2.95;
  const at=t=>{const a=a0+t*span,r=76+6*Math.sin(t*Math.PI*2.2);return{x:Math.cos(a)*r,y:Math.sin(a)*r,a}};
  const width=t=>3.5+21*Math.pow(1-t,1.2)*Math.min(1,(t+.1)/.16);
  const S=[...Array(N+1)].map((_,i)=>{const t=i/N,p=at(t),q=at(Math.min(1,t+.001)),o=at(Math.max(0,t-.001));
    let tx=q.x-o.x,ty=q.y-o.y;const l=Math.hypot(tx,ty);tx/=l;ty/=l;
    return{...p,t,w:width(t),tx,ty,nx:ty,ny:-tx}}); // n = the outer side of the curve
  const ink=INK.back,cream=INK.cream;

  // wing: a bat wing fanning outward from the shoulders
  const wingBase=[S[8],S[36]],tips=[[.02,100],[.07,92],[.11,108],[.16,95],[.21,110],[.27,97],[.33,106]];
  const polar=(t,r)=>{const p=at(t),k=r/Math.hypot(p.x,p.y);return[p.x*k,p.y*k]};
  ctx.fillStyle=ink;ctx.beginPath();ctx.moveTo(wingBase[0].x,wingBase[0].y);
  for(const[t,r]of tips){const[x,y]=polar(t,r);ctx.lineTo(x,y)}
  ctx.lineTo(wingBase[1].x,wingBase[1].y);ctx.fill();
  ctx.strokeStyle=cream;ctx.lineWidth=1;ctx.lineJoin="round";ctx.stroke();
  ctx.strokeStyle=cream;ctx.lineWidth=1;
  ctx.lineWidth=1.4;for(const i of[0,2,4,6]){const[x,y]=polar(tips[i][0],tips[i][1]-3);ctx.beginPath();ctx.moveTo(S[18].x,S[18].y);ctx.lineTo(x,y);ctx.stroke()}

  // legs: bent, with three claws, reaching in toward the pearl
  for(const i of[16,52]){
    const p=S[i],kx=p.x-p.nx*(p.w/2+10)-p.tx*6,ky=p.y-p.ny*(p.w/2+10)-p.ty*6,fx=kx-p.nx*4+p.tx*9,fy=ky-p.ny*4+p.ty*9;
    ctx.strokeStyle=ink;ctx.lineCap="round";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(kx,ky);ctx.lineTo(fx,fy);ctx.stroke();
    ctx.lineWidth=2.6;for(const k of[-1,0,1]){ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx+p.tx*6-p.nx*(4+k*4)+k*2,fy+p.ty*6-p.ny*(4+k*4));ctx.stroke()}
  }

  // dorsal spikes along the outer edge, swept back toward the tail
  ctx.fillStyle=ink;
  for(let i=4;i<N-4;i+=3){const p=S[i],e=p.w/2,h=3+6*(1-p.t);
    ctx.beginPath();ctx.moveTo(p.x+p.nx*e-p.tx*3,p.y+p.ny*e-p.ty*3);ctx.lineTo(p.x+p.nx*(e+h)+p.tx*4,p.y+p.ny*(e+h)+p.ty*4);ctx.lineTo(p.x+p.nx*e+p.tx*4,p.y+p.ny*e+p.ty*4);ctx.fill()}

  // the body itself
  ctx.beginPath();
  S.forEach((p,i)=>ctx[i?"lineTo":"moveTo"](p.x+p.nx*p.w/2,p.y+p.ny*p.w/2));
  for(let i=N;i>=0;i--){const p=S[i];ctx.lineTo(p.x-p.nx*p.w/2,p.y-p.ny*p.w/2)}
  ctx.fill();
  // scales on the back, plates on the belly
  ctx.strokeStyle=cream;ctx.lineWidth=.9;
  for(let i=3;i<N-6;i+=2){const p=S[i],r=Math.max(1.5,p.w*.2);
    ctx.beginPath();ctx.arc(p.x+p.nx*p.w*.12,p.y+p.ny*p.w*.12,r,Math.atan2(p.ty,p.tx)+Math.PI*.5,Math.atan2(p.ty,p.tx)+Math.PI*1.5);ctx.stroke();
    ctx.beginPath();ctx.moveTo(p.x-p.nx*p.w*.45,p.y-p.ny*p.w*.45);ctx.lineTo(p.x-p.nx*p.w*.25,p.y-p.ny*p.w*.25);ctx.stroke()}

  // tail tip: a little spade, for a playing-card dragon
  const T=S[N];ctx.save();ctx.translate(T.x,T.y);ctx.rotate(Math.atan2(T.ty,T.tx)+Math.PI/2);ctx.scale(.16,.16);ctx.translate(-50,-96);ctx.fillStyle=ink;ctx.fill(SYM.S);ctx.restore();

  // head: facing back along the body and turned toward the pearl, top of the head on the outside
  const h=S[0];ctx.save();ctx.translate(h.x,h.y);ctx.rotate(Math.atan2(-h.ty,-h.tx)-.75);ctx.scale(1.45,-1.45);
  ctx.fillStyle=ink;
  ctx.fill(new Path2D("M-2 -8C6 -11 12 -14 18 -13L24 -9L36 -8L41 -4L39 -1L25 0L25 3L37 7L35 11L19 10L4 9L-2 6Z")); // head and open jaw
  ctx.fill(new Path2D("M12 -12C6 -20 -4 -26 -14 -24C-6 -22 2 -18 6 -11Z"));       // horn
  ctx.fill(new Path2D("M6 -10C0 -16 -8 -16 -12 -12C-6 -12 -2 -10 0 -7Z"));        // second horn
  ctx.fillStyle=cream;ctx.beginPath();ctx.arc(19,-7,2.4,0,7);ctx.fill();          // eye
  ctx.fillStyle=ink;ctx.beginPath();ctx.arc(19.6,-7,1.1,0,7);ctx.fill();
  ctx.fillStyle=cream;for(const x of[28,32,36])ctx.fill(new Path2D(`M${x} 0L${x+1.5} 2.6L${x+3} 0Z`)); // teeth
  ctx.strokeStyle=ink;ctx.lineWidth=1.2;ctx.lineCap="round";                      // whiskers
  ctx.beginPath();ctx.moveTo(38,-6);ctx.bezierCurveTo(46,-16,40,-26,50,-30);ctx.moveTo(34,9);ctx.bezierCurveTo(44,16,38,26,48,30);ctx.stroke();
  ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(30,4);ctx.bezierCurveTo(40,4,44,0,50,3);ctx.lineTo(54,0);ctx.moveTo(50,3);ctx.lineTo(54,6);ctx.stroke(); // forked tongue
  ctx.restore();
}

/* ---------- public helpers ---------- */
// returns a canvas `px` pixels wide showing the card (rank "A".."K", suit "S","H","D","C"), or the back when rank is null
function canvas(rank,s,px=360){
  const c=document.createElement("canvas");c.width=px;c.height=Math.round(px*H/W);
  const ctx=c.getContext("2d");ctx.scale(px/W,px/W);
  if(rank==null){back(ctx);return c}
  ctx.fillStyle=INK.paper;ctx.fillRect(0,0,W,H);
  corners(ctx,rank,s);
  if(rank==="A")ace(ctx,s);else if("JQK".includes(rank))court(ctx,rank,s);else pips(ctx,+rank,s);
  return c;
}
window.CardArt={W,H,RANKS,SUITS,canvas};
})();
