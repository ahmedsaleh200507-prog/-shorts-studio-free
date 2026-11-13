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
  const start=Number(entry.start),end=Number(entry.end);
  if(!word||!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>durationFrames/fps+.05)return fallback();
  if(!clean(word)&&tokens.length){tokens[tokens.length-1]={...tokens[tokens.length-1],word:tokens[tokens.length-1].word+word,end};}
  else tokens.push({word,start,end});
 }
 if(tokens.length!==words.length||tokens.some((x,i)=>clean(x.word)!==clean(words[i])||(i>0&&x.start<tokens[i-1].end-.04)))return fallback();
 const seconds=Math.max(0,localFrame/fps);
 return Math.max(1,Math.min(words.length,tokens.filter(x=>x.start<=seconds+.001).length));
}
