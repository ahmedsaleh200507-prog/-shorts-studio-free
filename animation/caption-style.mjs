// Deterministic 2D editorial caption styling shared by previews and MP4 renders.
const emphasis=/^(?:nicht|nie|niemals|not|never|warnung|warning|gefahr|danger|alarm|geheim|secret|millionen|milliarden|million|billion|nacht|night)$/i;
export function captionTokenStyle(token){
 if(typeof token!=='string')return 'normal';
 const word=token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu,'');
 if(emphasis.test(word))return 'emphasis';
 if(/\d/.test(word))return 'number';
 return 'normal';
}
export function captionOpacity(frame,duration){
 if(!Number.isFinite(frame)||!Number.isFinite(duration)||duration<=0)return 0;
 if(duration<=2)return 1;
 const fade=Math.max(1,Math.min(5,Math.floor(duration/3)));
 return Math.max(0,Math.min(1,frame/fade,(duration-1-frame)/fade));
}
