// Mediabunny integration boundary. It is intentionally opt-in: do not claim
// Safari can encode MP4 before verifying VideoEncoder and AudioEncoder support.
export function browserMediaCapabilities(env=globalThis){
 const video=typeof env.VideoEncoder==='function';
 const audio=typeof env.AudioEncoder==='function';
 const canvas=typeof env.OffscreenCanvas==='function';
 return {video,audio,canvas,canAttemptMp4:video&&audio};
}
export async function loadMediaToolkit({importer=()=>import('mediabunny')}={}){
 const lib=await importer();
 if(typeof lib.Output!=='function'||typeof lib.Mp4OutputFormat!=='function'||typeof lib.BufferTarget!=='function'){
  throw new Error('Unsupported Mediabunny export shape');
 }
 return {Output:lib.Output,Mp4OutputFormat:lib.Mp4OutputFormat,BufferTarget:lib.BufferTarget};
}
export function assertMediaEncodingSupported(env=globalThis){
 const caps=browserMediaCapabilities(env);
 if(!caps.canAttemptMp4)throw new Error('Browser lacks VideoEncoder or AudioEncoder; use server render fallback');
 return caps;
}
