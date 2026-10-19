const {Sim,R,mulberry32}=require('../src/sim.js');
const W=360,H=640;let ENDP=+process.env.ENDP||0.7;
function positions(s){const a=new Float32Array(s.N*3);for(let i=0;i<s.N;i++){a[i*3]=s.px[i];a[i*3+1]=s.py[i];a[i*3+2]=s.pz[i];}return a;}
function make(spec,seed,frames){
  const s=new Sim(W,H,spec,seed);
  const rnd=mulberry32(seed*7+1);
  const P=s.pocket; const TIGHT=+(process.env.TIGHT||0.85); s.box={cx:P.cx,cy:P.cy,r:P.r*TIGHT,z:P.z*TIGHT};
  const K=spec.chains.length+2, agents=[];
  for(let f=0;f<frames;f++){
    for(let k=0;k<K;k++){
      let a=agents[k];
      if(!a||a.t<=0){ if(a&&a.g){s.release(a.g)} 
        let i;
        if(rnd()<ENDP){const c=s.chains[(rnd()*s.chains.length)|0];const off=(rnd()*3)|0;i=rnd()<0.5?c.start+off:c.start+c.n-1-off;}
        else i=(rnd()*s.N)|0;
        if(s.held[i])i=(rnd()*s.N)|0;
        const g=s.setGrab(i,s.px[i],s.py[i],s.pz[i]); g.step=0.6;
        a=agents[k]={g,t:120+rnd()*160,next:0}; }
      a.t--; a.next--;
      if(a.next<=0){const an=rnd()*6.283,rr=Math.sqrt(rnd())*s.box.r*0.9;
        a.g.tx=P.cx+Math.cos(an)*rr;a.g.ty=P.cy+Math.sin(an)*rr;a.g.tz=R+rnd()*(P.z-R);a.next=25+rnd()*40;}
    }
    s.step();
  }
  s.releaseAll(); s.box=null;
  for(let f=0;f<220;f++)s.step();
  return s;
}
function pullScore(spec,pos){
  let total=0,detail=[];
  const base=new Sim(W,H,spec,1,pos);
  for(let c=0;c<base.chains.length;c++){
    const s=new Sim(W,H,spec,1,pos);
    const ch=s.chains[c],e0=ch.start,e1=ch.start+ch.n-1;
    const g0=s.setGrab(e0,s.px[e0],s.py[e0]),g1=s.setGrab(e1,s.px[e1],s.py[e1]);
    const y=H/2;
    for(let f=0;f<420;f++){
      const t=Math.min(1,f/300);
      g0.tx=s.px[e0]+(20-s.px[e0])*0.02;g0.ty=s.py[e0]+(y-s.py[e0])*0.02;
      g1.tx=s.px[e1]+(340-s.px[e1])*0.02;g1.ty=s.py[e1]+(y-s.py[e1])*0.02;
      s.step();
    }
    s.crossings();
    let cc=0;const cf=s.crossFlag;for(let k=0;k<s.S;k++)if(cf[k]&&s.sc[k]===c)cc++;
    const span=Math.hypot(s.px[e1]-s.px[e0],s.py[e1]-s.py[e0])/((ch.n-1)*8);
    detail.push(cc+'/'+span.toFixed(2)); total+=cc;
  }
  return {total,detail};
}
module.exports={make,pullScore,positions};
if(require.main===module){
  const spec=JSON.parse(process.argv[2]); const seeds=process.argv[3].split(',').map(Number); const frames=+process.argv[4]||900;
  for(const sd of seeds){const t=Date.now();const s=make(spec,sd,frames);const pos=positions(s);const sc=pullScore(spec,pos);
    console.log('seed',sd,'cross',s.crossings(),'pull',sc.total,sc.detail.join(' '),'ms',Date.now()-t);}
}
