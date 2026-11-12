// Browser lifecycle contract tests. These do not claim real Safari device coverage.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),script=html.split('<script>')[1].split('</script>')[0];
const id='12345678-1234-4234-8234-123456789abc';
function storage(initial={}){const map=new Map(Object.entries(initial));return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),map}}
function browser({pending=null,fetcher}={}){
 const nodes=new Map(),listeners={};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,value:'',hidden:true,textContent:'',style:{},events:{},addEventListener(type,fn){this.events[type]=fn},load(){},pause(){},focus(){},removeAttribute(){},click(){}});return nodes.get(id)};
 for(const [id,value] of Object.entries({story:'A man reads a message.',language:'en-US',voice:'male',styleMode:'vector',aspect:'16:9',targetDuration:'30'}))node(id).value=value;
 const localStorage=storage(pending?{'shorts-studio-pending-v1':JSON.stringify(pending)}:{}),sessionStorage=storage({'shorts-studio-session-key':'private-test-key'});
 const zip={files:{'final.mp4':{name:'final.mp4',dir:false,async:async()=>new Uint8Array([1,2,3])},'render-report.json':{name:'render-report.json',dir:false,async:async()=>JSON.stringify({visualSource:'vector',aiImageCount:0,timingSource:'edge-word-boundary'})}}};
 const sandbox={document:{hidden:false,getElementById:node,addEventListener:(event,fn)=>listeners[event]=fn},window:{addEventListener:(event,fn)=>listeners[event]=fn,JSZip:{}},localStorage,sessionStorage,crypto:webcrypto,fetch:fetcher,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},Blob,File,Date,setTimeout:fn=>{fn();return 0},console,navigator:{},JSZip:{loadAsync:async()=>zip}};
 const context=vm.createContext(sandbox);vm.runInContext(script,context);
 return {context,node,localStorage,sessionStorage,listeners,run:code=>vm.runInContext(code,context)};
}
const response=data=>new Response(JSON.stringify(data));
function completedFetch(calls){return async(url,options)=>{calls.push({url,options});if(url.includes('/health'))return response({contract_version:2,configured:true});if(url.includes('/status'))return response({status:'completed',conclusion:'success',run_id:42});if(url.includes('metadata=1'))return response({size_in_bytes:100});return new Response(new Uint8Array([1]))}}
test('reload resumes a persisted job and reads provenance without another dispatch',async()=>{
 const calls=[],b=browser({pending:{job_id:id,signature:'old',aspect:'16:9',createdAt:Date.now()},fetcher:completedFetch(calls)});
 await b.run('generate(true,true)');assert.equal(calls.filter(c=>c.url.endsWith('/render')).length,0);assert.equal(b.node('renderedVideo').style.aspectRatio,'16 / 9');assert.match(b.node('renderReport').textContent,/Ücretsiz 2D vektör/);assert.equal(b.localStorage.getItem('shorts-studio-pending-v1'),null);
 assert.equal(b.localStorage.getItem('shorts-studio-session-key'),null);
});
test('dropped dispatch response keeps the generated job ID and retry only checks status',async()=>{
 const calls=[];let first=true;const finish=completedFetch(calls);
 const b=browser({fetcher:async(url,options)=>{if(first&&url.endsWith('/render')){first=false;calls.push({url,options});throw Error('network dropped')}return finish(url,options)}});
 await b.run('generate()');const saved=JSON.parse(b.localStorage.getItem('shorts-studio-pending-v1'));assert.ok(saved.job_id);assert.equal(saved.script,undefined);assert.equal(saved.signature.includes('private-test-key'),false);
 await b.run('generate()');assert.equal(calls.filter(c=>c.url.endsWith('/render')).length,1);assert.equal(b.localStorage.getItem('shorts-studio-pending-v1'),null);
 const posted=JSON.parse(calls.find(c=>c.url.endsWith('/render')).options.body);assert.equal(posted.video_mode,'vector');assert.equal(posted.voice,'male');assert.equal(posted.target_duration,'30');assert.equal(posted.aspect_ratio,'16:9');
});
test('backgrounding pauses browser polling while preserving the server job',async()=>{
 const calls=[],b=browser({pending:{job_id:id,signature:'old',aspect:'9:16',createdAt:Date.now()},fetcher:completedFetch(calls)});
 b.run('document.hidden=true');await b.run('generate(true,true)');assert.equal(calls.length,0);assert.ok(b.localStorage.getItem('shorts-studio-pending-v1'));assert.match(b.node('audioStatus').textContent,/Sunucu üretime devam/);
 b.run('document.hidden=false');await b.run('generate(true,true)');assert.equal(calls.length,3);assert.equal(b.localStorage.getItem('shorts-studio-pending-v1'),null);
});
test('large ZIP preflight stops mobile extraction and keeps result recoverable',async()=>{
 const calls=[],b=browser({pending:{job_id:id,signature:'old',aspect:'9:16',createdAt:Date.now(),run_id:42},fetcher:async url=>{calls.push(url);return response({size_in_bytes:121*1024*1024,run_url:'https://github.com/run/42'})}});
 await b.run('generate(true,true)');assert.equal(calls.length,1);assert.match(b.node('audioStatus').textContent,/120 MiB/);assert.ok(b.localStorage.getItem('shorts-studio-pending-v1'));
});

test('an older deployed Worker cannot silently ignore the selected free vector mode',async()=>{
 const calls=[],b=browser({fetcher:async url=>{calls.push(url);return response({ok:true,configured:true})}});
 await b.run('generate()');assert.equal(calls.length,1);assert.ok(calls[0].endsWith('/health'));assert.equal(b.localStorage.getItem('shorts-studio-pending-v1'),null);assert.match(b.node('audioStatus').textContent,/Sunucu sürümü/);
});

test('actual offline narration model is disclosed alongside estimated word timing',()=>{
 const b=browser({fetcher:async()=>response({})});b.run("applyReport({visualSource:'vector',aiImageCount:0,timingSource:['estimated'],ttsEngine:'piper',voice:'en_GB-alan-medium.onnx'})");assert.match(b.node('renderReport').textContent,/Piper/);assert.match(b.node('renderReport').textContent,/en_GB-alan-medium/);assert.match(b.node('renderReport').textContent,/tahmini zamanlama/);assert.match(b.node('renderReport').textContent,/cinsiyette olmayabilir/);
});

test('reloaded pending jobs restore the matching script and production settings',()=>{
 const config={script:'He opens the door.',language:'en',aspect_ratio:'16:9',video_mode:'ai',voice:'male',target_duration:'180'};
 const b=browser({pending:{job_id:id,signature:JSON.stringify(config)},fetcher:async()=>response({})});assert.equal(b.node('story').value,config.script);assert.equal(b.node('aspect').value,'16:9');assert.equal(b.node('styleMode').value,'ai');assert.equal(b.node('targetDuration').value,'180');
});

test('a known GitHub queue can last over twenty polls without becoming a missing dispatch',async()=>{
 const calls=[];let polls=0;const complete=completedFetch(calls);
 const b=browser({pending:{job_id:id,signature:'old',aspect:'9:16',createdAt:Date.now()},fetcher:async(url,options)=>{if(url.includes('/status')&&++polls<=21)return response({status:'queued',conclusion:null,run_id:42});return complete(url,options)}});
 await b.run('generate(true,true)');assert.equal(polls,22);assert.equal(b.localStorage.getItem('shorts-studio-pending-v1'),null);assert.equal(b.node('renderedVideo').hidden,false);assert.match(b.node('audioStatus').textContent,/Sesli MP4 hazır/);
});

test('render warnings and the exact requested versus actual voice gender remain visible',()=>{
 const b=browser({fetcher:async()=>response({})});
 b.run("applyReport({visualSource:'vector',ttsEngine:'piper',voice:'en_GB-alan-medium.onnx',requestedVoiceGender:'female',actualVoiceGender:'male',warnings:['Piper fallback used a male voice instead of the requested female voice.']})");
 assert.match(b.node('renderReport').textContent,/İstenen ses: kadın/);assert.match(b.node('renderReport').textContent,/Kullanılan ses: erkek/);assert.match(b.node('renderReport').textContent,/Uyarı: Piper fallback used a male voice/);
});
