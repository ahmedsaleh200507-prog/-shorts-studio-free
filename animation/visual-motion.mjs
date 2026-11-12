// Shared deterministic animation timing for AI illustrations and vector scenes.
// Pure math: stable across Remotion render frames, no browser or network APIs.
export const clamp01 = n => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
export const easeOutCubic = t => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInOut = t => {const x=clamp01(t);return x*x*(3-2*x)};
export function cameraMotion(sceneIndex, frame, duration, mode='vector') {
  const t=clamp01(frame/Math.max(1,duration-1));
  const e=easeInOut(t);
  const direction=sceneIndex%2===0?1:-1;
  if(mode==='ai')return {scale:1.055+0.09*(direction===1?e:1-e),x:direction*3.5*(2*e-1),y:(sceneIndex%3-1)*2.2*(2*e-1)};
  return {scale:1.015+0.035*e,x:direction*1.4*(2*e-1),y:0.6*(1-2*e)};
}
export function revealWords(text,frame,duration) {
  const words=String(text).trim().split(/\s+/u).filter(Boolean);
  if(!words.length)return '';
  const visible=Math.max(1,Math.min(words.length,Math.ceil(clamp01(frame/Math.max(1,duration))*words.length)));
  return words.slice(0,visible).join(' ');
}
