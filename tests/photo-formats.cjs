// Run against the local static server; fixtures are generated outside the repository.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:8098/photo-normalizer.js');
 const bundle=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),end='window.heic2any=A4.default;';
 await page.addScriptTag({content:bundle.slice(0,bundle.indexOf(end)+end.length)+'})();'});
 await page.addScriptTag({url:'http://127.0.0.1:8098/photo-normalizer.js'});
 const fixtures=path.join(__dirname,'../../photo-fixtures'),out=path.join(fixtures,'converted');fs.mkdirSync(out,{recursive:true});
 for(const name of fs.readdirSync(fixtures).filter(n=>fs.statSync(path.join(fixtures,n)).isFile())){
  const result=await page.evaluate(async({name,b64})=>{try{const file=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],name,{type:'application/octet-stream'});const converted=await window.CreditiPhoto.normalize(file),bmp=await createImageBitmap(converted);const bytes=new Uint8Array(await converted.arrayBuffer());return {type:converted.type,w:bmp.width,h:bmp.height,head:Array.from(bytes.slice(0,3)),b64:btoa(Array.from(bytes,c=>String.fromCharCode(c)).join(''))}}catch(e){return {error:e.message}}},{name,b64:fs.readFileSync(path.join(fixtures,name)).toString('base64')});
  if(name==='broken.jpg'){assert.ok(result.error);console.log('PASS rejected corrupt image');continue}
  assert.equal(result.error,undefined,`${name}: ${result.error}`);assert.equal(result.type,'image/jpeg');assert.deepEqual(result.head,[255,216,255]);assert.ok(Math.max(result.w,result.h)<=1800);if(name==='rotated.jpg')assert.deepEqual([result.w,result.h],[80,120]);
  fs.writeFileSync(path.join(out,name+'.jpg'),Buffer.from(result.b64,'base64'));console.log('PASS',name,result.w,result.h);
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
