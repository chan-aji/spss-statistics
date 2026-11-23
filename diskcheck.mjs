import fs from 'node:fs';
const p='C:/Users/USER/AppData/Local/Temp';
for(const d of fs.readdirSync(p,{withFileTypes:true})){
  if(!d.isDirectory()) continue;
  if(!/^(craft-browser-|agent-browser-chrome-)/.test(d.name)) continue;
  try{fs.rmSync(p+'/'+d.name,{recursive:true,force:true});console.log('removed',d.name)}catch(e){console.log('skip',d.name,e.code)}
}
