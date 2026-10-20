// Make candidate tangles for one level and score them with the real "untangled?" test.
// usage: node pick.js '<spec json>' <seeds a,b,c> <frames> [out.b64]
// A good tangle: right after it's made, no necklace counts as untangled; and simply pulling a necklace's two ends
// apart still leaves it tangled (so there is real work to do).
const {Sim}=require('../src/sim.js');const {make,positions}=require('./gen.js');const fs=require('fs');
const W=360,H=640;
function pullFree(spec,pos){
  const res=[];
  for(let c=0;c<spec.chains.length;c++){
    const s=new Sim(W,H,spec,1,pos);const ch=s.chains[c],e0=ch.start,e1=ch.start+ch.n-1;
    const flip=s.px[e0]>s.px[e1];const A=flip?[352,632]:[8,8],B=flip?[8,8]:[352,632];
    const g0=s.setGrab(e0,s.px[e0],s.py[e0]),g1=s.setGrab(e1,s.px[e1],s.py[e1]);
    for(let f=0;f<700;f++){g0.tx+=(A[0]-g0.tx)*0.01;g0.ty+=(A[1]-g0.ty)*0.01;g1.tx+=(B[0]-g1.tx)*0.01;g1.ty+=(B[1]-g1.ty)*0.01;s.step();}
    s.releaseAll();for(let f=0;f<60;f++)s.step();
    s.crossings();let k=0;for(let q=0;q<s.S;q++)if(s.crossFlag[q]&&s.sc[q]===c)k++;
    res.push({free:s.tangleCheck(c).free,left:k});
  }
  return res;
}
if(require.main===module){
  const spec=JSON.parse(process.argv[2]);const seeds=process.argv[3].split(',').map(Number);const frames=+process.argv[4]||2500;const out=process.argv[5];
  let best=null;
  for(const sd of seeds){const t=Date.now();const s=make(spec,sd,frames);const pos=positions(s);
    const start=s.chains.map((_,c)=>s.tangleCheck(c).free);const pf=pullFree(spec,pos);
    const left=pf.reduce((a,r)=>a+r.left,0);const score=start.filter(x=>!x).length*100+pf.filter(r=>!r.free).length*100+left;
    const r={seed:sd,score:+score.toFixed(1),cross:s.crossings(),startFree:start.map(x=>x?1:0).join(''),pullFree:pf.map(r=>r.free?1:0).join(''),left,sec:((Date.now()-t)/1000).toFixed(0)};
    console.log(JSON.stringify(r));
    if(!best||score>best.score)best={score,pos,sd};
  }
  if(out){const i16=new Int16Array(best.pos.length);for(let i=0;i<best.pos.length;i++)i16[i]=Math.round(best.pos[i]*20);fs.writeFileSync(out,Buffer.from(i16.buffer).toString('base64'));console.log('wrote',out,'seed',best.sd);}
}
