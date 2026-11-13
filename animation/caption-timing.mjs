// Pure timing helper used by Remotion; invalid or absent TTS boundaries fall back to proportional text timing.
const clean=(s)=>String(s).toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function captionRevealCount(text,localFrame,durationFrames,alignment=null,fps=24){
 const words=String(text).trim().split(/\s+/).filter(Boolean);
 if(!words.length)return 0;
 const fallback=()=>Math.max(1,Math.min(words.length,Math.ceil((Math.max(0,localFrame)/Math.max(1,durationFrames))*words.length)));
 if(!Array.isArray(alignment)||!alignment.length)return fallback();
 const tokens=[];
 for(const entry of alignment){
  if(!entry||typeof entry!=='object')return fallback();
  const word=String(entry.word??'').trim();
  // Missing/null timestamp fields must not silently coerce to zero.
  if(entry.start==null||entry.end==null||typeof entry.start==='boolean'||typeof entry.end==='boolean')return fallback();
  const start=Number(entry.start),end=Number(entry.end);
  if(!word||!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>durationFrames/fps+.05)return fallback();
  if(!clean(word)&&tokens.length){tokens[tokens.length-1]={...tokens[tokens.length-1],word:tokens[tokens.length-1].word+word,end};}
  else tokens.push({word,start,end});
 }
 if(tokens.length!==words.length||tokens.some((x,i)=>clean(x.word)!==clean(words[i])||(i>0&&x.start<tokens[i-1].end-.04)))return fallback();
 const seconds=Math.max(0,localFrame/fps);
 return Math.max(1,Math.min(words.length,tokens.filter(x=>x.start<=seconds+.001).length));
}

/** Use real speech boundaries to close the character mouth during pauses. */
export function speechActiveAtFrame(localFrame,alignment=null,fps=24){
 if(!Number.isFinite(localFrame)||localFrame<0||!Number.isFinite(fps)||fps<=0)return false;
 if(!Array.isArray(alignment)||alignment.length===0)return true; // legacy narration without boundaries
 const seconds=Math.max(0,localFrame/fps);
 let valid=0;
 for(const entry of alignment){
  if(!entry||entry.start==null||entry.end==null||typeof entry.start==='boolean'||typeof entry.end==='boolean')continue;
  const start=Number(entry.start),end=Number(entry.end);
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start)continue;
  valid++;
  if(seconds>=Math.max(0,start-.035)&&seconds<=end+.055)return true;
 }
 return valid===0; // malformed alignment falls back to the legacy speaking state
}
