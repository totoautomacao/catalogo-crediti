import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
function setup(share){
 const buttons={};let html='';const panel={style:{},remove(){},set innerHTML(s){html=s},querySelector(s){return buttons[s]??={}}};
 const context={window:{},document:{createElement:()=>panel,body:{appendChild(){}}},navigator:{share,canShare:()=>true,clipboard:{writeText:async()=>{}}},fetch:()=>{throw Error('No server publication calls allowed')}};
 vm.runInNewContext(fs.readFileSync(new URL('../instagram-client.js',import.meta.url),'utf8'),context);
 const files=[{name:'car.jpg'}];context.window.CreditiInstagram.open({photos:[{url:'/media/car.jpg'}],files,caption:'Crediti',format:'stories'});
 return {buttons,files,html:()=>html};
}
test('opening editor never publishes; tap hands off only files synchronously',async()=>{
 let data,calls=0,resolve;const f=setup(d=>{data=d;calls++;return new Promise(r=>resolve=r)});
 assert.equal(calls,0);assert.match(f.html(),/não consegue escolher ou verificar a conta/);
 f.buttons['#ig-send'].onclick();assert.equal(calls,1);assert.deepEqual(Object.keys(data),['files']);assert.equal(data.files,f.files);
 f.buttons['#ig-send'].onclick();assert.equal(calls,1);resolve();await new Promise(r=>setImmediate(r));
 assert.match(f.html(),/não confirma a publicação/);assert.doesNotMatch(f.html(),/Publicar agora/);
});
test('cancel and sync failures keep the editor usable and do not claim publication',async()=>{
 let calls=0;const f=setup(()=>{calls++;throw Object.assign(Error('cancel'),{name:'AbortError'})});
 f.buttons['#ig-send'].onclick();assert.match(f.html(),/Envio cancelado/);f.buttons['#ig-send'].onclick();assert.equal(calls,2);
});
