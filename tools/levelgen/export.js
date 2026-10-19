const {make,positions}=require('./gen.js');const fs=require('fs');
const [specJ,seed,frames,out]=process.argv.slice(2);
const spec=JSON.parse(specJ);const s=make(spec,+seed,+frames);const p=positions(s);
const i16=new Int16Array(p.length);for(let i=0;i<p.length;i++)i16[i]=Math.round(p[i]*20);
fs.writeFileSync(out,Buffer.from(i16.buffer).toString('base64'));console.log(out,'cross',s.crossings());
