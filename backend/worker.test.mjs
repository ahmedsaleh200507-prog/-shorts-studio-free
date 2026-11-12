import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const worker=(await import('data:text/javascript;base64,'+readFileSync(new URL('./worker.js',import.meta.url)).toString('base64'))).default;
const ORIGIN='https://ahmedsaleh200507-prog.github.io',env={GITHUB_TOKEN:'test-server-token',APP_KEY:'test-owner-key'},id='12345678-1234-4234-8234-123456789abc';
const req=(path,body,headers={})=>new Request('https://worker.test'+path,{method:body===undefined?'GET':'POST',headers:{Origin:ORIGIN,'x-app-key':env.APP_KEY,...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
const reply=body=>new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});
test('dispatch carries the full public contract and accepts 12000 Unicode characters',async()=>{
 let sent;globalThis.fetch=async(url,options)=>{sent=JSON.parse(options.body);return new Response(null,{status:204})};
 const response=await worker.fetch(req('/render',{script:'ä'.repeat(12000),language:'en',aspect_ratio:'16:9',video_mode:'vector',voice:'male',target_duration:'600',job_id:id}),env);
 assert.equal(response.status,202);assert.deepEqual(sent.inputs,{script:'ä'.repeat(12000),language:'en',aspect_ratio:'16:9',video_mode:'vector',voice:'male',target_duration:'600',job_id:id});assert.equal(sent.ref,'main');
});
test('old script markers normalize without leaking into narration',async()=>{
 let sent;globalThis.fetch=async(url,options)=>{sent=JSON.parse(options.body);return new Response(null,{status:204})};
 const response=await worker.fetch(req('/render',{script:'[[VECTOR_2D]]\n[[ASPECT_16_9]]\nEin Mann liest.',language:'de'}),env);
 assert.equal(response.status,202);assert.equal(sent.inputs.script,'Ein Mann liest.');assert.equal(sent.inputs.aspect_ratio,'16:9');assert.equal(sent.inputs.video_mode,'vector');
});
test('invalid fields, overlong text and malformed JSON never dispatch',async()=>{
 globalThis.fetch=async()=>assert.fail('Invalid requests must not dispatch');
 for(const input of [{script:'a'.repeat(12001)},{script:'x',language:'fr'},{script:'x',voice:'unknown'},{script:'x',aspect_ratio:'1:1'},{script:'x',video_mode:'3d'},{script:'x',target_duration:'999'},{script:'x',job_id:'bad'}, {script:{}}])assert.equal((await worker.fetch(req('/render',input),env)).status,400);
 assert.equal((await worker.fetch(new Request('https://worker.test/render',{method:'POST',headers:{Origin:ORIGIN,'x-app-key':env.APP_KEY},body:'{bad'}),env)).status,400);
 assert.equal((await worker.fetch(req('/render',{script:'x',extra:'x'.repeat(60001)}),env)).status,413);
});
test('credentials and origin remain required',async()=>{
 globalThis.fetch=async()=>assert.fail('Unauthorized');
 assert.equal((await worker.fetch(req('/render',{script:'x'},{'x-app-key':'wrong'}),env)).status,401);
 assert.equal((await worker.fetch(req('/render',{script:'x'},{Origin:'https://evil.test'}),env)).status,403);
});
test('status resumes a job beyond the first page',async()=>{
 let calls=0;globalThis.fetch=async()=>reply(++calls===1?{workflow_runs:Array.from({length:100},()=>({display_title:'Other'}))}:{workflow_runs:[{display_title:'Shorts '+id,status:'completed',conclusion:'success',id:42,html_url:'https://github.com/example/run/42'}]});
 const response=await worker.fetch(req('/status?job_id='+id),env);assert.equal((await response.json()).run_id,42);assert.equal(calls,2);
});
test('missing dispatch is reported explicitly without enqueueing a replacement',async()=>{
 globalThis.fetch=async()=>reply({workflow_runs:[]});const result=await(await worker.fetch(req('/status?job_id='+id),env)).json();assert.equal(result.status,'pending-discovery');
});
test('artifact preflight reports size without downloading the ZIP',async()=>{
 let calls=0;globalThis.fetch=async()=>reply(++calls===1?{event:'workflow_dispatch',path:'.github/workflows/render-video.yml',status:'completed',conclusion:'success',html_url:'https://github.com/run/42'}:{artifacts:[{name:'shorts-studio-sesli-mp4',id:7,size_in_bytes:123456,expired:false}]});
 const response=await worker.fetch(req('/artifact?run_id=42&metadata=1'),env);assert.equal((await response.json()).size_in_bytes,123456);assert.equal(calls,2);
});
test('artifact ZIP streams with CORS size metadata after successful render',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;if(calls===1)return reply({event:'workflow_dispatch',path:'.github/workflows/render-video.yml',status:'completed',conclusion:'success'});if(calls===2)return reply({artifacts:[{name:'shorts-studio-sesli-mp4',id:7,size_in_bytes:3,expired:false}]});if(calls===3)return new Response(null,{status:302,headers:{location:'https://signed.test/artifact.zip'}});return new Response(new Uint8Array([1,2,3]))};
 const response=await worker.fetch(req('/artifact?run_id=42'),env);assert.equal(response.headers.get('x-artifact-size'),'3');assert.equal(response.headers.get('access-control-expose-headers'),'x-artifact-size');assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[1,2,3]);
});
test('other workflows and failed runs cannot supply a video',async()=>{
 globalThis.fetch=async()=>reply({event:'workflow_dispatch',path:'.github/workflows/other.yml',status:'completed',conclusion:'success'});assert.equal((await worker.fetch(req('/artifact?run_id=42'),env)).status,403);
 globalThis.fetch=async()=>reply({event:'workflow_dispatch',path:'.github/workflows/render-video.yml',status:'completed',conclusion:'failure'});assert.equal((await worker.fetch(req('/artifact?run_id=42'),env)).status,409);
});
