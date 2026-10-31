const {Sim}=require('../src/sim.js');const fs=require('fs');
// usage: node resettle.js [levels file, default levels.json] [only these ids, e.g. L101,L102]
const PHONE=JSON.parse(fs.readFileSync('../src/levels.json','utf8'));
const LV=JSON.parse(fs.readFileSync('../src/'+(process.argv[2]||'levels.json'),'utf8')).map(L=>({...PHONE.find(P=>P.id===L.id),...L}));
const ONLY=process.argv[3]?process.argv[3].split(','):null;
for(const [f,ch] of LV.filter(L=>!ONLY||ONLY.includes(L.id)).map(L=>[L.id,L.chains])){
 const b=Buffer.from(fs.readFileSync('../src/levels/'+f+'.b64','utf8'),'base64');const i16=new Int16Array(b.buffer,b.byteOffset,b.length/2);
 const s=new Sim(360,640,{chains:ch.map(([kind,links,stones])=>({kind,links,stones}))},1,Float32Array.from(i16,v=>v/20));
 const c0=s.crossings();for(let k=0;k<1200;k++)s.step();
 const o=new Int16Array(s.N*3);for(let i=0;i<s.N;i++){o[i*3]=Math.round(s.px[i]*20);o[i*3+1]=Math.round(s.py[i]*20);o[i*3+2]=Math.round(s.pz[i]*20);}
 fs.writeFileSync('../src/levels/'+f+'.b64',Buffer.from(o.buffer).toString('base64'));
 // check: reload and measure drift over 5s
 const t=new Sim(360,640,{chains:ch.map(([kind,links,stones])=>({kind,links,stones}))},1,Float32Array.from(o,v=>v/20));const x0=Float32Array.from(t.px),y0=Float32Array.from(t.py);
 for(let k=0;k<300;k++)t.step();let tot=0;for(let i=0;i<t.N;i++)tot+=Math.hypot(t.px[i]-x0[i],t.py[i]-y0[i]);
 console.log(f,'交差',c0,'→',s.crossings(),'読み込み後5秒の平均移動',(tot/t.N).toFixed(2),'ほどけている',t.chains.map((_,c)=>t.tangleCheck(c).free?1:0).join(''));
}
