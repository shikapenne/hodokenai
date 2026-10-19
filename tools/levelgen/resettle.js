const {Sim}=require('../src/sim.js');const fs=require('fs');
for(const [f,ch] of [['L1',[['gold',160]]],['L2',[['gold',150],['silver',150]]],['L3',[['pearl',130],['gold',140]]],['L4',[['kihei',90],['silver',150],['rose',120]]],['L5',[['kihei',70],['gold',100],['pearl',95],['silver',100]]]]){
 const b=Buffer.from(fs.readFileSync('../src/levels/'+f+'.b64','utf8'),'base64');const i16=new Int16Array(b.buffer,b.byteOffset,b.length/2);
 const s=new Sim(360,640,{chains:ch.map(([kind,links])=>({kind,links}))},1,Float32Array.from(i16,v=>v/20));
 const c0=s.crossings();for(let k=0;k<1200;k++)s.step();
 const o=new Int16Array(s.N*3);for(let i=0;i<s.N;i++){o[i*3]=Math.round(s.px[i]*20);o[i*3+1]=Math.round(s.py[i]*20);o[i*3+2]=Math.round(s.pz[i]*20);}
 fs.writeFileSync('../src/levels/'+f+'.b64',Buffer.from(o.buffer).toString('base64'));
 // check: reload and measure drift over 5s
 const t=new Sim(360,640,{chains:ch.map(([kind,links])=>({kind,links}))},1,Float32Array.from(o,v=>v/20));const x0=Float32Array.from(t.px),y0=Float32Array.from(t.py);
 for(let k=0;k<300;k++)t.step();let tot=0;for(let i=0;i<t.N;i++)tot+=Math.hypot(t.px[i]-x0[i],t.py[i]-y0[i]);
 console.log(f,'交差',c0,'→',s.crossings(),'読み込み後5秒の平均移動',(tot/t.N).toFixed(2));
}
