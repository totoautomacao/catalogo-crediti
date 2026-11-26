const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
test('Supabase empty-name multipart becomes photo bytes with session and CSRF intact',async()=>{
 const calls=[];const origin='https://catalogo.creditisolucoes.com.br';
 const native=async(input,init)=>{calls.push({input,init});return new Response(JSON.stringify(String(input).includes('/auth/session')?{authenticated:true,csrf:'test-csrf',email:'test@example.invalid'}:{ok:true}),{headers:{'Content-Type':'application/json'}})};
 const context={FormData,Blob,URL,URLSearchParams,Headers,Request,Response,Promise,location:{origin,href:origin+'/admin',search:''},window:{fetch:native},document:{head:{appendChild(){}},createElement(){return{}},getElementById(id){return id==='crediti-admin-tools'?{}:null},documentElement:{classList:{add(){},remove(){}}}},localStorage:{removeItem(){}},indexedDB:{deleteDatabase(){}}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/admin-auth.js','utf8'),context);
 const form=new FormData();form.append('',new Blob(['image-bytes'],{type:'image/jpeg'}),'photo.jpg');
 await context.window.fetch(origin+'/backend/storage/v1/object/fotos/123/test.jpg',{method:'POST',body:form});
 let call=calls.at(-1);assert.match(call.input,/\/api.php\?route=storage%2Fv1%2Fobject%2Ffotos%2F123%2Ftest.jpg$/);assert.ok(call.init.body instanceof Blob);assert.equal(await call.init.body.text(),'image-bytes');assert.equal(call.init.headers.get('Content-Type'),'image/jpeg');assert.equal(call.init.headers.get('X-Crediti-CSRF'),'test-csrf');assert.equal(call.init.credentials,'same-origin');
 const input=new Request(origin+'/backend/storage/v1/object/fotos/123/second.jpg',{method:'POST',body:form});
 await context.window.fetch(input);call=calls.at(-1);assert.equal(call.input.method,'POST');assert.match(call.input.url,/api.php/);assert.ok(call.init.body instanceof Blob);assert.equal(await call.init.body.text(),'image-bytes');
 await context.window.fetch(origin+'/backend/rest/v1/veiculos');assert.equal(calls.at(-1).input,origin+'/backend/rest/v1/veiculos');
});
