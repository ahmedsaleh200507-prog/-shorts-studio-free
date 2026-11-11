// Shorts Studio Free — authenticated GitHub Actions render gateway.
// Secrets (Cloudflare runtime): GITHUB_TOKEN and APP_KEY. Never commit their values.
const REPO='ahmedsaleh200507-prog/-shorts-studio-free';
const GH='https://api.github.com/repos/'+REPO;
const ghHeaders=token=>({'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'shorts-studio-worker'});
const json=(value,status=200,extra={})=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}});
export default {async fetch(request,env){
 const url=new URL(request.url);
 const allowed=env.ALLOWED_ORIGIN||'https://ahmedsaleh200507-prog.github.io';
 const origin=request.headers.get('Origin');
 const cors={'access-control-allow-origin':allowed,'access-control-allow-headers':'content-type,x-app-key','access-control-allow-methods':'GET,POST,OPTIONS','vary':'Origin'};
 if(request.method==='OPTIONS')return origin===allowed?new Response(null,{status:204,headers:cors}):json({error:'Origin not allowed'},403);
 const send=(data,status=200)=>json(data,status,origin===allowed?cors:{});
 if(origin!==allowed)return send({error:'Origin not allowed'},403);
 if(url.pathname==='/health'&&request.method==='GET')return send({ok:true,configured:Boolean(env.GITHUB_TOKEN&&env.APP_KEY)});
 if(!env.GITHUB_TOKEN||!env.APP_KEY)return send({error:'Missing server configuration'},503);
 // This is a private owner-operated gateway. Never put APP_KEY in public HTML.
 if(request.headers.get('x-app-key')!==env.APP_KEY)return send({error:'Unauthorized'},401);
 try{
  if(url.pathname==='/render'&&request.method==='POST'){
   if(Number(request.headers.get('content-length')||0)>16000)return send({error:'Request too large'},413);
   const data=await request.json();
   const script=String(data.script||'').trim(),language=data.language==='en'?'en':'de';
   if(!script||script.length>3000)return send({error:'Text must be 1–3000 characters'},400);
   const jobId=crypto.randomUUID();
   const res=await fetch(GH+'/actions/workflows/render-video.yml/dispatches',{method:'POST',headers:{...ghHeaders(env.GITHUB_TOKEN),'content-type':'application/json'},body:JSON.stringify({ref:'main',inputs:{script,language,job_id:jobId}})});
   if(!res.ok)return send({error:'GitHub workflow dispatch failed',github_status:res.status},502);
   return send({accepted:true,job_id:jobId,status_url:'/status?job_id='+jobId},202);
  }

  if(url.pathname==='/artifact'&&request.method==='GET'){
   const runId=url.searchParams.get('run_id')||'';
   if(!/^\d{1,20}$/.test(runId))return send({error:'Invalid run ID'},400);
   const rr=await fetch(GH+'/actions/runs/'+runId,{headers:ghHeaders(env.GITHUB_TOKEN)});
   if(!rr.ok)return send({error:'Run unavailable'},502);
   const run=await rr.json();
   if(run.event!=='workflow_dispatch')return send({error:'Invalid render event'},403);
   if(run.status!=='completed')return send({error:'Render is still '+run.status,run_status:run.status,run_conclusion:run.conclusion},409);
   if(run.conclusion!=='success')return send({error:'Render failed: '+(run.conclusion||'unknown'),run_status:run.status,run_conclusion:run.conclusion},409);
   const ar=await fetch(GH+'/actions/runs/'+runId+'/artifacts',{headers:ghHeaders(env.GITHUB_TOKEN)});
   if(!ar.ok)return send({error:'Artifacts unavailable'},502);
   const data=await ar.json(),item=(data.artifacts||[]).find(a=>a.name==='shorts-studio-sesli-mp4'&&!a.expired);
   if(!item)return send({error:'MP4 expired or missing'},404);
   const redirect=await fetch(GH+'/actions/artifacts/'+item.id+'/zip',{headers:ghHeaders(env.GITHUB_TOKEN),redirect:'manual'});
   const location=redirect.headers.get('location');
   if(!location||!location.startsWith('https://'))return send({error:'Artifact redirect failed'},502);
   const file=await fetch(location);
   if(!file.ok)return send({error:'Archive unavailable'},502);
   return new Response(file.body,{headers:{'content-type':'application/zip','cache-control':'no-store',...(origin===allowed?cors:{})}});
  }
  if(url.pathname==='/status'&&request.method==='GET'){
   const jobId=url.searchParams.get('job_id')||'';
   if(!/^[0-9a-f-]{36}$/.test(jobId))return send({error:'Invalid job ID'},400);
   const res=await fetch(GH+'/actions/workflows/render-video.yml/runs?event=workflow_dispatch&per_page=50',{headers:ghHeaders(env.GITHUB_TOKEN)});
   if(!res.ok)return send({error:'GitHub status unavailable',github_status:res.status},502);
   const data=await res.json();
   const run=(data.workflow_runs||[]).find(r=>r.display_title==='Shorts '+jobId);
   if(!run)return send({job_id:jobId,status:'queued',message:'Workflow may take a moment to appear'});
   return send({job_id:jobId,status:run.status,conclusion:run.conclusion,run_id:run.id,run_url:run.html_url});
  }
  return send({error:'Not found'},404);
 }catch(e){return send({error:'Request failed'},500)}
}};
