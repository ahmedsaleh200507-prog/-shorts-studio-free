// Shared, deterministic scene-plan contract for browser preview and MP4 rendering.
// No API calls, secrets or GPU required.
const rules=[
  ['brush', /zähne|zahn|putzt|brush(?:es|ing)?|teeth|tooth/i, 'bathroom', ['toothbrush','sink']],
  ['checkout', /kasse|bezahl|checkout|cashier|\bpays?\b/i, 'supermarket', ['register','payment-card']],
  ['pick', /apfel|apple|nimmt|picks? up/i, 'supermarket', ['apple','shelf']],
  ['wake', /\bwach(?:e|st|t|en)?\b[^.!?]{0,90}\bauf\b|aufwach|\berwach(?:e|st|t|en)?\b|wake(?:s)? up|woke up|\b(?:steht|stand)\s+auf\b|aufgestanden|\b(?:gets?|got)\s+up\b|\bbed\b|bett/i, 'bedroom', ['bed']],
  ['travel', /\bbus\b|\bzug\b|train|station|bahnhof/i, 'transport', ['vehicle']],
];
export function splitScript(script){
  if(typeof script!=='string') throw new TypeError('script must be a string');
  return (script.match(/[^.!?\n]+[.!?]?/g)||[]).map(s=>s.trim()).filter(Boolean).slice(0,60);
}
export function makeScenePlan(script,{fps=24,secondsPerScene=3,durationsFrames=null}={}){
  if(!Number.isInteger(fps)||fps<12||fps>60) throw new RangeError('fps must be 12–60');
  if(!Number.isFinite(secondsPerScene)||secondsPerScene<0.5||secondsPerScene>30) throw new RangeError('invalid duration');
  const sentences=splitScript(script);
  if(!sentences.length) throw new Error('empty script');
  if(durationsFrames!==null && (!Array.isArray(durationsFrames)||durationsFrames.length!==sentences.length||durationsFrames.some(n=>!Number.isInteger(n)||n<1))) throw new RangeError('invalid scene durations');
  let cursor=0;
  const scenes=sentences.map((text,index)=>{
    const match=rules.find(([,regex])=>regex.test(text));
    const [action,place,props]=match?[match[0],match[2],match[3]]:['talk','generic',[]];
    const startFrame=cursor;
    const endFrame=cursor+(durationsFrames?durationsFrames[index]:Math.round(secondsPerScene*fps));
    cursor=endFrame;
    return {id:`scene-${index+1}`,text,action,place,props,characterId:'main',startFrame,endFrame,camera:{type:'slow-push',from:1,to:1.07}};
  });
  return {version:1,width:1080,height:1920,fps,totalFrames:scenes.at(-1).endFrame,scenes};
}
