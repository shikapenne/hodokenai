const {Sim}=require('../src/sim.js');const {make,positions}=require('./gen.js');
const W=360,H=640;
function pullTest(spec,pos){
  const res=[];
  for(let c=0;c<spec.chains.length;c++){
    const s=new Sim(W,H,spec,1,pos);const ch=s.chains[c],e0=ch.start,e1=ch.start+ch.n-1;
    const flip=s.px[e0]>s.px[e1];
    const A=flip?[352,632]:[8,8],B=flip?[8,8]:[352,632];
    const g0=s.setGrab(e0,s.px[e0],s.py[e0]),g1=s.setGrab(e1,s.px[e1],s.py[e1]);
    for(let f=0;f<700;f++){g0.tx+=(A[0]-g0.tx)*0.01;g0.ty+=(A[1]-g0.ty)*0.01;g1.tx+=(B[0]-g1.tx)*0.01;g1.ty+=(B[1]-g1.ty)*0.01;s.step();}
    s.crossings();let self=0,other=0;
    // count crossings involving chain c
    const {px,py,sa,sb,sc,sk}=s;
    for(let i=0;i<s.S;i++){if(sc[i]!==c)continue;for(let j=0;j<s.S;j++){if(j===i||(sc[j]===c&&Math.abs(sk[j]-sk[i])<=1))continue;if(sc[j]===c&&j<i)continue;
      const o=(ax,ay,bx,by,cx,cy)=>(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);
      const a0=sa[i],a1=sb[i],b0=sa[j],b1=sb[j];
      if(o(px[a0],py[a0],px[a1],py[a1],px[b0],py[b0])*o(px[a0],py[a0],px[a1],py[a1],px[b1],py[b1])<0&&o(px[b0],py[b0],px[b1],py[b1],px[a0],py[a0])*o(px[b0],py[b0],px[b1],py[b1],px[a1],py[a1])<0){if(sc[j]===c)self++;else other++;}}}
    res.push({self,other});
  }
  return res;
}
module.exports={pullTest};
if(require.main===module){
  const spec=JSON.parse(process.argv[2]);const seeds=process.argv[3].split(',').map(Number);const frames=+process.argv[4]||2500;
  for(const sd of seeds){const t=Date.now();const s=make(spec,sd,frames);const pos=positions(s);const pt=pullTest(spec,pos);
    const score=pt.reduce((a,r)=>a+(r.self>0?10:0)+r.self+r.other,0);
    console.log(JSON.stringify({seed:sd,score,cross:s.crossings(),pt:pt.map(r=>r.self+'/'+r.other).join(' '),sec:((Date.now()-t)/1000).toFixed(1)}));}
}
