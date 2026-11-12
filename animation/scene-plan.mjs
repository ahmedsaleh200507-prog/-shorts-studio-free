// Shared, deterministic scene-plan contract for browser preview and MP4 rendering.
// No API calls, secrets or GPU required.
const rules=[
  ['brush', /zähne|zahn|putzt|brush(?:es|ing)?|teeth|tooth/i, 'bathroom', ['toothbrush','sink']],
  ['checkout', /kasse|bezahl|checkout|cashier|\bpays?\b/i, 'supermarket', ['register','payment-card']],
  ['pick', /apfel|apple|picks? (?:up )?(?:an? )?apple/i, 'supermarket', ['apple','shelf']],
  ['wake', /\bwach(?:e|st|t|en)?\b[^.!?]{0,90}\bauf\b|aufwach|\berwach(?:e|st|t|en)?\b|wake(?:s)? up|woke up|\b(?:steht|stand)\s+auf\b|aufgestanden|\b(?:gets?|got)\s+up\b|\bbed\b|bett/i, 'bedroom', ['bed']],
  ['travel', /\bbus\b|\bzug\b|train|station|bahnhof/i, 'transport', ['vehicle']],
  ['alert', /warnung|warnmeldung|alarm|gefahr|notfall|emergency|warning|alert|achtung|sirene/i, 'alert', ['warning-panel','alert-icon']],
  ['phone', /handy|smartphone|telefon|phone|nachricht|message|notification|benachrichtigung/i, 'phone', ['phone-screen','notification']],
  ['door', /tür|tuer|door|öffnet|öffnen|open(?:s|ed)?|klopft|knock/i, 'door', ['door','handle']],
  ['clock', /uhr|sekunde|minute|stunden|countdown|timer|mitternacht|midnight|\bzeit\b|\btime\b/i, 'clock', ['clock','counter']],
  ['space', /weltraum|universum|planet|erde|earth|space|moon|mond|galax|sonne|sun/i, 'space', ['planet','stars']],
  ['science', /wissenschaft|forschung|experiment|physik|science|research|labor|laboratory|atom|molek/i, 'science', ['diagram','particles']],
  ['nature', /wald|forest|baum|tree|meer|ocean|fluss|river|berg|mountain|natur|nature/i, 'nature', ['landscape']],
  ['technology', /computer|internet|\bki\b|künstliche intelligenz|artificial intelligence|software|code|roboter|robot/i, 'technology', ['screen','network']],
  ['hospital', /krankenhaus|hospital|arzt|ärztin|doctor|patient|klinik|clinic/i, 'hospital', ['bed','medical-monitor']],
  ['school', /schule|school|klassenzimmer|classroom|lehrer|teacher|unterricht/i, 'school', ['desk','blackboard']],
  ['restaurant', /restaurant|café|cafe|küche|kitchen|kocht|cooks?|essen|eating/i, 'restaurant', ['table','food']],
  ['office', /büro|office|meeting|besprechung|arbeitet|working/i, 'office', ['desk','computer']],
  ['map', /karte|landkarte|map|grenze|border|länder|countries|country|region|europa|europe|kurdistan|stadtplan/i, 'map', ['map','route']],
  ['history', /geschichte|historisch|history|historical|jahrhundert|century|\bkrieg\b|\bwar\b|archiv|archive|zeitung|newspaper/i, 'history', ['archive','timeline']],
  ['number', /\b\d+(?:[.,]\d+)?\s*(?:%|prozent|percent|euro|€|dollar|kilometer|km|million|milliard|billion)\b|\b\d+\s*%/i, 'infographic', ['number','chart']],
];
export function splitScript(script){
  if(typeof script!=='string') throw new TypeError('script must be a string');
  return (script.match(/[^.!?\n]+[.!?]?/g)||[]).map(s=>s.trim()).filter(Boolean).slice(0,180);
}
export function makeScenePlan(script,{fps=24,secondsPerScene=3,durationsFrames=null,aspectRatio="9:16"}={}){
  if(!Number.isInteger(fps)||fps<12||fps>60) throw new RangeError('fps must be 12–60');
  if(!Number.isFinite(secondsPerScene)||secondsPerScene<0.5||secondsPerScene>30) throw new RangeError('invalid duration');
  const sentences=splitScript(script);
  if(!sentences.length) throw new Error('empty script');
  if(durationsFrames!==null && (!Array.isArray(durationsFrames)||durationsFrames.length!==sentences.length||durationsFrames.some(n=>!Number.isInteger(n)||n<1))) throw new RangeError('invalid scene durations');
  let cursor=0;
  let previousPlace='generic';
  // Explicit locations override generic verbs such as 'works' or 'goes'.
  const explicitPlaces=[
    ['hospital',/krankenhaus|hospital|klinik|clinic/i],
    ['school',/schule|school|klassenzimmer|classroom/i],
    ['supermarket',/supermarkt|supermarket|grocery store|lebensmittelgeschäft/i],
    ['restaurant',/restaurant|café|cafe|küche|kitchen/i],
    ['office',/büro|office/i],
    ['bathroom',/badezimmer|bathroom/i],
    ['bedroom',/schlafzimmer|bedroom/i],
    ['transport',/\bbus\b|\bzug\b|train|station|bahnhof/i]
  ];
  const scenes=sentences.map((text,index)=>{
    const match=rules.find(([,regex])=>regex.test(text));
    const [action,rulePlace,props]=match?[match[0],match[2],match[3]]:['talk','generic',[]];
    const explicit=explicitPlaces.find(([,regex])=>regex.test(text));
    const matchedPlace=explicit?explicit[0]:rulePlace;
    // Pronouns and follow-up sentences often continue in the same location.
    // Preserve that location only when no explicit new setting was detected.
    const place=matchedPlace==='generic' && /^(?:er|sie|es|they|he|she|it|dann|danach|anschließend|then|afterwards|plötzlich|suddenly)\b/i.test(text)
      ? previousPlace : matchedPlace;
    if(matchedPlace!=='generic') previousPlace=matchedPlace;
    const startFrame=cursor;
    const endFrame=cursor+(durationsFrames?durationsFrames[index]:Math.round(secondsPerScene*fps));
    cursor=endFrame;
    const visualMode=['alert','phone','door','clock','space','science','nature','technology','number','map','history'].includes(action)?'motion-graphic':action==='talk'?'kinetic-type':'character';
    const keywords=(text.match(/[\p{L}\p{N}]+/gu)||[]).filter(w=>w.length>=4).slice(0,7);
    return {id:`scene-${index+1}`,text,action,place,props,visualMode,keywords,characterId:'main',startFrame,endFrame,camera:{type:visualMode==='character'?'slow-push':'dynamic-push',from:1,to:1.07}};
  });
  const landscape=aspectRatio==="16:9";
  return {version:1,width:landscape?1920:1080,height:landscape?1080:1920,fps,totalFrames:scenes.at(-1).endFrame,scenes};
}
