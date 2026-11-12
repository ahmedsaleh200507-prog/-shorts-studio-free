// Owner-operated GitHub Actions gateway. Keep GITHUB_TOKEN and APP_KEY in Worker secrets.
const REPO='ahmedsaleh200507-prog/-shorts-studio-free';
const GH='https://api.github.com/repos/'+REPO;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DURATIONS=new Set(['auto','15','30','60','180','300','600']);
const ghHeaders=token=>({'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'shorts-studio-worker'});
const json=(value,status=200,extra={})=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}});
async function readJSON(request){
 const reader=request.body?.getReader();if(!reader)throw new Error('Empty request');
 const chunks=[];let bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>60000){await reader.cancel();throw new RangeError('Request too large')}chunks.push(value)}}finally{reader.releaseLock()}
 const body=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body));
}
function normalizeJob(data){
 if(!data||typeof data.script!=='string')throw new TypeError('Text is required');
 let script=data.script.trim(),legacyVector=false,legacyAspect=false;
 if(script.startsWith('[[VECTOR_2D]]')){legacyVector=true;script=script.slice(13).trim()}
 if(script.startsWith('[[ASPECT_16_9]]')){legacyAspect=true;script=script.slice(15).trim()}
 if(!script||script.length>12000)throw new TypeError('Text must be 1–12000 characters');
 const language=data.language??'de',aspect=data.aspect_ratio??(legacyAspect?'16:9':'9:16'),mode=data.video_mode??(legacyVector?'vector':'ai'),voice=data.voice??'female',duration=String(data.target_duration??'auto');
 if(!['de','en'].includes(language))throw new TypeError('Unsupported language');
 if(!['9:16','16:9'].includes(aspect))throw new TypeError('Invalid aspect ratio');
 if(!['ai','vector'].includes(mode))throw new TypeError('Invalid video mode');
 if(!['female','male'].includes(voice))throw new TypeError('Invalid voice');
 if(!DURATIONS.has(duration))throw new TypeError('Invalid target duration');
 if(data.job_id!==undefined&&!UUID.test(data.job_id))throw new TypeError('Invalid job ID');
 return {script,language,aspect_ratio:aspect,video_mode:mode,voice,target_duration:duration,job_id:data.job_id||crypto.randomUUID()};
}
export default {async fetch(request,env){
 const url=new URL(request.url),allowed=env.ALLOWED_ORIGIN||'https://ahmedsaleh200507-prog.github.io',origin=request.headers.get('Origin');
 const cors={'access-control-allow-origin':allowed,'access-control-allow-headers':'content-type,x-app-key','access-control-allow-methods':'GET,POST,OPTIONS','access-control-expose-headers':'x-artifact-size','vary':'Origin'};
 if(request.method==='OPTIONS')return origin===allowed?new Response(null,{status:204,headers:cors}):json({error:'Origin not allowed'},403);
 const send=(data,status=200)=>json(data,status,origin===allowed?cors:{});
 if(origin!==allowed)return send({error:'Origin not allowed'},403);
 if(url.pathname==='/health'&&request.method==='GET')return send({ok:true,configured:Boolean(env.GITHUB_TOKEN&&env.APP_KEY),contract_version:2});
 if(!env.GITHUB_TOKEN||!env.APP_KEY)return send({error:'Missing server configuration'},503);
 if(request.headers.get('x-app-key')!==env.APP_KEY)return send({error:'Unauthorized'},401);
 try{
  if(url.pathname==='/render'&&request.method==='POST'){
   if(Number(request.headers.get('content-length')||0)>60000)return send({error:'Request too large'},413);
   let inputs;try{inputs=normalizeJob(await readJSON(request))}catch(e){return send({error:e.message},e instanceof RangeError?413:400)}
   const res=await fetch(GH+'/actions/workflows/render-video.yml/dispatches',{method:'POST',headers:{...ghHeaders(env.GITHUB_TOKEN),'content-type':'application/json'},body:JSON.stringify({ref:'main',inputs})});
   if(!res.ok)return send({error:'GitHub workflow dispatch failed',github_status:res.status},502);
   return send({accepted:true,job_id:inputs.job_id,status_url:'/status?job_id='+inputs.job_id},202);
  }
  if(url.pathname==='/artifact'&&request.method==='GET'){
   const runId=url.searchParams.get('run_id')||'';
   if(!/^\d{1,20}$/.test(runId))return send({error:'Invalid run ID'},400);
   const rr=await fetch(GH+'/actions/runs/'+runId,{headers:ghHeaders(env.GITHUB_TOKEN)});
   if(!rr.ok)return send({error:'Run unavailable'},502);
   const run=await rr.json();
   if(run.event!=='workflow_dispatch'||(run.path&&run.path.split('@')[0]!=='.github/workflows/render-video.yml'))return send({error:'Invalid render workflow'},403);
   if(run.status!=='completed')return send({error:'Render is still '+run.status,run_status:run.status},409);
   if(run.conclusion!=='success')return send({error:'Render failed: '+(run.conclusion||'unknown'),run_status:run.status,run_conclusion:run.conclusion},409);
   const ar=await fetch(GH+'/actions/runs/'+runId+'/artifacts',{headers:ghHeaders(env.GITHUB_TOKEN)});
   if(!ar.ok)return send({error:'Artifacts unavailable'},502);
   const data=await ar.json(),item=(data.artifacts||[]).find(a=>a.name==='shorts-studio-sesli-mp4'&&!a.expired);
   if(!item)return send({error:'MP4 expired or missing'},404);
   const headers={'content-type':'application/zip','cache-control':'no-store','x-artifact-size':String(item.size_in_bytes||0),...cors};
   // Metadata preflight lets mobile clients avoid loading very large ZIPs into memory.
   if(url.searchParams.get('metadata')==='1')return send({size_in_bytes:item.size_in_bytes||0,run_url:run.html_url,expires_at:item.expires_at});
   const redirect=await fetch(GH+'/actions/artifacts/'+item.id+'/zip',{headers:ghHeaders(env.GITHUB_TOKEN),redirect:'manual'});
   const location=redirect.headers.get('location');
   if(!location||!location.startsWith('https://'))return send({error:'Artifact redirect failed'},502);
   const file=await fetch(location);
   if(!file.ok)return send({error:'Archive unavailable'},502);
   return new Response(file.body,{headers});
  }
  if(url.pathname==='/status'&&request.method==='GET'){
   const jobId=url.searchParams.get('job_id')||'';
   if(!UUID.test(jobId))return send({error:'Invalid job ID'},400);
   // Page through recent jobs; resume still works after a burst of later requests.
   for(let page=1;page<=3;page++){
    const res=await fetch(GH+'/actions/workflows/render-video.yml/runs?event=workflow_dispatch&per_page=100&page='+page,{headers:ghHeaders(env.GITHUB_TOKEN)});
    if(!res.ok)return send({error:'GitHub status unavailable',github_status:res.status},502);
    const data=await res.json(),runs=data.workflow_runs||[],run=runs.find(r=>r.display_title==='Shorts '+jobId);
    if(run)return send({job_id:jobId,status:run.status,conclusion:run.conclusion,run_id:run.id,run_url:run.html_url});
    if(runs.length<100)break;
   }
   return send({job_id:jobId,status:'pending-discovery',message:'Workflow not found in the latest 300 jobs; dispatch may still be propagating. Do not automatically dispatch again.'});
  }
  return send({error:'Not found'},404);
 }catch{return send({error:'Request failed; check the existing job before retrying'},502)}
}};
