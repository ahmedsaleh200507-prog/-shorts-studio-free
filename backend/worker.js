// Cloudflare Worker. Required secrets: GITHUB_TOKEN, APP_KEY.
// Configure GitHub repo as an Actions-enabled public repo. Never put secrets in browser code.
const REPO='ahmedsaleh200507-prog/-shorts-studio-free';
const GH='https://api.github.com/repos/'+REPO;
const headers=token=>({'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'shorts-studio-worker'});
function reply(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':env.ALLOWED_ORIGIN||'https://ahmedsaleh200507-prog.github.io','access-control-allow-headers':'content-type, x-app-key','access-control-allow-methods':'POST,GET,OPTIONS'}});
 const origin=request.headers.get('Origin');
 const allowed=env.ALLOWED_ORIGIN||'https://ahmedsaleh200507-prog.github.io';
 if(origin!==allowed)return reply({error:'Origin not allowed'},403);
 const cors={'access-control-allow-origin':allowed,'vary':'Origin'};
 const finish=(data,status=200)=>{const r=reply(data,status);for(const [k,v] of Object.entries(cors))r.headers.set(k,v);return r};
 if(!env.GITHUB_TOKEN||!env.APP_KEY)return finish({error:'Server not configured'},503);
 if(request.headers.get('x-app-key')!==env.APP_KEY)return finish({error:'Unauthorized'},401);
 try{
 if(url.pathname==='/render'&&request.method==='POST'){
  const data=await request.json();const script=String(data.script||'').trim(),language=data.language==='en'?'en':'de';
  if(!script||script.length>3000)return finish({error:'Text must be 1-3000 characters'},400);
  const gh=await fetch(GH+'/actions/workflows/render-video.yml/dispatches',{method:'POST',headers:{...headers(env.GITHUB_TOKEN),'Content-Type':'application/json'},body:JSON.stringify({ref:'main',inputs:{script,language}})});
  if(!gh.ok)return finish({error:'GitHub dispatch failed',status:gh.status},502);
  return finish({accepted:true,message:'Render queued. Check GitHub Actions for result.'},202);
 }
 return finish({error:'Not found'},404);
 }catch(e){return finish({error:'Request failed'},500)}
}};
