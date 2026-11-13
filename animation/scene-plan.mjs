// Shared, deterministic scene-plan contract for browser preview and MP4 rendering.
// No API calls, secrets or GPU required.
const rules=[
  ['radio', /\bradio\b|rundfunk|broadcast|radiogerät|radioger[aä]t|transistor/i, 'radio', ['radio','signal']],
  ['metro', /\bmetro\b|\bsubway\b|\bu-bahn\b|\bubahn\b|\buntergrundbahn\b|\bmetrostation\b/i, 'metro', ['train','platform']],
  ['run', /\b(?:runs?|running|jogs?|jogging|sprints?)\b|\brenn(?:t|en|e|st)?\b|\bläuft\b|\blaufen\b|\brennt\b/i, 'generic', ['motion-trail']],
  ['sit', /\b(?:sits?|sitting|sat down|takes? a seat)\b|\b(?:sitzt|sitzen|setzt sich|hinsetzen)\b/i, 'generic', ['chair']],
  ['walk', /\b(?:walks?|walking|strolls?)\b|\b(?:geht|gehen|spaziert|spazieren)\b/i, 'generic', ['path']],
  ['brush', /zähne|zahn|putzt|brush(?:es|ing)?|teeth|tooth/i, 'bathroom', ['toothbrush','sink']],
  ['checkout', /kasse|bezahl|checkout|cashier|\bpays?\b/i, 'supermarket', ['register','payment-card']],
  ['put', /\b(?:puts?\b[^.!?]{0,45}\bdown|sets?\b[^.!?]{0,45}\bdown|drops?\s+(?:it|them|the|a|an)\b|places?\s+(?:it|them|the|a|an)\b)|\b(?:legt|stellt|setzt)\s+(?:es|sie|ihn|das|den|die|eine[nrsm]?|ein)\b|\bablegen\b|\babstellen\b/i, 'generic', ['surface']],
  ['pick', /\b(?:bananas?|books?|bottles?|cups?)\b|banane|buch|flasche|tasse|\b(?:picks? up|grabs?|takes?)\s+(?:a |an |the )?(?:object|item)\b|\b(?:nimmt|greift)\s+(?:ein(?:e|en|em|er|es)? |das |den )?(?:banane|buch|flasche|tasse|gegenstand)/i, 'generic', ['object','hand']],
  ['pick', /apfel|apple|picks? (?:up )?(?:an? )?apple|nimmt (?:einen |eine |das |den )?(?:apfel|gegenstand)|takes? (?:an? |the )?(?:apple|object)/i, 'supermarket', ['apple','shelf']],
  ['wake', /\bwach(?:e|st|t|en)?\b[^.!?]{0,90}\bauf\b|aufwach|\berwach(?:e|st|t|en)?\b|wake(?:s)? up|woke up|\b(?:steht|stand)\s+auf\b|aufgestanden|\b(?:gets?|got)\s+up\b|\bbed\b|bett/i, 'bedroom', ['bed']],
  ['travel', /\bbus\b|\bzug\b|train|station|bahnhof/i, 'transport', ['vehicle']],
  ['carry', /trägt (?:den |die |das |einen |eine )?(?:koffer|tasche|rucksack)|carri(?:es|ed|y) (?:a |the )?(?:bag|suitcase|backpack)|mit (?:einem |dem )?koffer/i, 'generic', ['bag','hand']],
  ['alert', /warnung|warnmeldung|alarm|gefahr|notfall|emergency|warning|alert|achtung|sirene/i, 'alert', ['warning-panel','alert-icon']],
  ['phone', /handy|smartphone|telefon|phone|nachricht|message|notification|benachrichtigung|textnachricht|sms|bildschirm|screen/i, 'phone', ['phone-screen','notification']],
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
// Context-aware classification: explicit settings beat incidental action words.
// A mention of a device does not automatically replace a named location.
const settingRules=[
  ['metro', /\b(?:metro|subway|u-bahn|ubahn|untergrundbahn|metrostation)\b/i],
  ['hospital', /krankenhaus|hospital|klinik|clinic|notaufnahme|emergency room/i],
  ['school', /schule|school|klassenzimmer|classroom|universit[aä]t|university/i],
  ['supermarket', /supermarkt|supermarket|grocery store|lebensmittelgesch[aä]ft/i],
  ['restaurant', /restaurant|caf[eé]|k[uü]che|kitchen/i],
  ['office', /b[uü]ro|office/i],
  ['bathroom', /badezimmer|bathroom/i],
  ['bedroom', /schlafzimmer|bedroom/i],
  ['transport', /\b(?:bus|zug|train|bahnhof|railway station)\b/i]
];
const topicRules=[
  ['alert', /warnung|warnmeldung|alarm|gefahr|notfall|emergency|warning|alert|achtung|sirene/i],
  ['phone', /handy|smartphone|telefon|phone|nachricht|message|notification|benachrichtigung|sms/i],
  ['radio', /\bradio\b|rundfunk|broadcast|radioger[aä]t/i],
  ['map', /landkarte|stadtplan|\bmap\b|grenze|border|europa|europe|kurdistan/i],
  ['clock', /\buhr\b|countdown|timer|mitternacht|midnight/i],
  ['space', /weltraum|universum|planet|erde|earth|space|moon|mond|galax|sonne|sun/i],
  ['science', /wissenschaft|forschung|experiment|physik|science|research|labor|atom|molek/i],
  ['nature', /wald|forest|baum|tree|meer|ocean|fluss|river|berg|mountain/i],
  ['technology', /computer|internet|\bki\b|k[uü]nstliche intelligenz|artificial intelligence|software|roboter/i],
  ['history', /geschichte|historisch|history|historical|jahrhundert|century|\bkrieg\b|\bwar\b/i],
  ['infographic', /\b\d+(?:[.,]\d+)?\s*(?:%|prozent|percent|euro|€|dollar|kilometer|km|million|milliard|billion)\b|\b\d+\s*%/i]
];
function chooseContext(text, previousPlace){
  const settings=settingRules.filter(([,re])=>re.test(text));
  const topics=topicRules.filter(([,re])=>re.test(text));
  // A named physical setting is primary; its props can still contain devices.
  if(settings.length) return {place:settings[0][0],setting:true};
  // Explicit warnings are the main subject only without a more concrete device.
  const subject=topics.find(([name])=>name==='radio') || topics.find(([name])=>name!=='alert') || topics[0];
  if(subject) return {place:subject[0],setting:false};
  if(/^(?:er|sie|es|they|he|she|it|dann|danach|anschließend|then|afterwards|plötzlich|suddenly|dort|there)\b/i.test(text))
    return {place:previousPlace,setting:false};
  return {place:'generic',setting:false};
}
// Lightweight narrative memory. Metadata is shared by preview and render exports.
const objectPatterns=[
 ['phone',/handy|smartphone|telefon|phone/i],['radio',/\bradio\b|radioger[aä]t/i],
 ['apple',/\b(?:apples?|äpfel)\b|apfel/i],['banana',/\bbananas?\b|banane/i],['bottle',/\bbottles?\b|flasche/i],['cup',/\bcups?\b|tasse/i],['bag',/\b(?:bags?|backpacks?)\b|tasche|rucksack/i],
 ['door',/t[uü]r|door/i],['train',/u-bahn|metro|subway|\bzug\b|train/i],
 ['bed',/bett|\bbed\b/i],['toothbrush',/zahnb[uü]rste|toothbrush/i],
 ['computer',/computer|laptop/i],['book',/buch|bücher|\bbooks?\b/i],
 ['food',/essen|food|meal/i]
];
const actorPatterns=[
 ['doctor',/arzt|[aä]rztin|doctor|physician/i],
 ['teacher',/lehrer|lehrerin|teacher/i],
 ['child',/kind|child|kid/i],
 ['woman',/frau|woman|girl/i],
 ['man',/mann|man|boy/i]
];
function extractNarrative(text,action,previousActor,previousObjects){
 const named=actorPatterns.find(([,re])=>re.test(text));
 const actor=named?named[0]:previousActor;
 const mentioned=objectPatterns.filter(([,re])=>re.test(text)).map(([name])=>name);
 const pronounObject=/\b(?:it|this|that|ihn|ihm|es|damit|darauf|dieses|diesen)\b/i.test(text);
 const objects=mentioned.length?mentioned:(pronounObject?previousObjects.slice(0,2):[]);
 return {actor,objects,interaction:action==='talk'?'narrate':action};
}
export function splitScript(script){
  if(typeof script!=='string') throw new TypeError('script must be a string');
  const sentences=(script.match(/(?:[^.!?\n]|\.(?=\d))+[.!?]?/g)||[]).map(s=>s.trim()).filter(Boolean);
  if(sentences.length>180) throw new RangeError('Script exceeds 180 scenes');
  return sentences;
}
export function makeScenePlan(script,{fps=24,secondsPerScene=3,durationsFrames=null,aspectRatio="9:16"}={}){
  if(!Number.isInteger(fps)||fps<12||fps>60) throw new RangeError('fps must be 12–60');
  if(!Number.isFinite(secondsPerScene)||secondsPerScene<0.5||secondsPerScene>30) throw new RangeError('invalid duration');
  const sentences=splitScript(script);
  if(!sentences.length) throw new Error('empty script');
  if(durationsFrames!==null && (!Array.isArray(durationsFrames)||durationsFrames.length!==sentences.length||durationsFrames.some(n=>!Number.isInteger(n)||n<1))) throw new RangeError('invalid scene durations');
  if(!["9:16","16:9"].includes(aspectRatio)) throw new RangeError("invalid aspect ratio");
  let cursor=0;
  let previousPlace='generic';
  let previousActor='main';
  let previousObjects=[];
  let heldObject=null;
  // Explicit locations override generic verbs such as 'works' or 'goes'.
  const scenes=sentences.map((text,index)=>{
    const explicitPut=/\b(?:puts?|sets?)\b[^.!?]{0,45}\bdown\b|\bdrops?\s+(?:it|them|the|a|an)\b|\bplaces?\s+(?:it|them|the|a|an)\b|\b(?:legt|stellt|setzt)\b[^.!?]{0,45}\b(?:ab|hin|auf)\b|\b(?:ablegen|abstellen)\b/i.test(text);
    // Object nouns alone must not trigger pickup (e.g. "She reads a book").
    const explicitPickup=/\b(?:picks?\s+up|grabs?|takes?|lifts?)\b|\b(?:nimmt|greift|hebt)\b/i.test(text);
    // Explicit manipulation takes precedence over incidental walking/running
    // verbs in the same sentence, without treating object mentions as pickups.
    const explicitPickRule=explicitPickup?rules.find(([name,regex])=>name==='pick'&&regex.test(text)):null;
    const match=explicitPut?rules.find(([name])=>name==='put'):
      explicitPickRule||rules.find(([name,regex])=>regex.test(text)&&(name!=='pick'||explicitPickup));
    const [action,rulePlace,props]=match?[match[0],match[2],match[3]]:['talk','generic',[]];
    const context=chooseContext(text,previousPlace);
    const place=(context.place==='generic'||(context.place===previousPlace && rulePlace!=='generic' && rulePlace!==previousPlace && !context.setting))?rulePlace:context.place;
    if(place!=='generic') previousPlace=place;
    const resolvedAction=place==='metro'?'travel':action;
    const resolvedProps=[...new Set([...props,...(place==='metro'?['train','platform']:[]),...(place==='phone'?['phone-screen']:[])])].slice(0,8);
    const narrative=extractNarrative(text,resolvedAction,previousActor,previousObjects);
    previousActor=narrative.actor;
    if(narrative.objects.length) previousObjects=narrative.objects;
    // Persist the item between shots, and clear it only after an explicit release.
    // A new pickup must be the object mentioned in this sentence, not stale pronoun memory.
    // Resolve a pickup from the current sentence only; pronoun context may
    // describe a different previously seen item and must not create a new grab.
    const currentObjects=objectPatterns.filter(([,re])=>re.test(text)).map(([name])=>name);
    const pickupItem=resolvedAction==='pick'?currentObjects.find(o=>['apple','banana','bottle','cup','book'].includes(o)):null;
    if(pickupItem)heldObject=pickupItem;
    const carriedObject=heldObject;
    if(resolvedAction==='put')heldObject=null;
    narrative.heldObject=carriedObject;
    narrative.releaseObject=resolvedAction==='put'?carriedObject:null;
    // Track which item is actually being manipulated, even when the text
    // mentions another object in the same scene.
    narrative.interactionObject=resolvedAction==='put'?carriedObject:pickupItem;

    narrative.hasPhysicalInteraction=Boolean(pickupItem||(resolvedAction==='put'&&carriedObject));
    const startFrame=cursor;
    const endFrame=cursor+(durationsFrames?durationsFrames[index]:Math.round(secondsPerScene*fps));
    cursor=endFrame;
    const visualMode=(carriedObject&&['pick','put','walk','run','carry','sit','talk'].includes(resolvedAction))?'character':(['alert','phone','door','clock','space','science','nature','technology','number','map','history','radio','metro'].includes(place)||['alert','phone','door','clock','space','science','nature','technology','number','map','history','radio','metro'].includes(action)?'motion-graphic':'character');
    const keywords=(text.match(/[\p{L}\p{N}]+/gu)||[]).filter(w=>w.length>=4).slice(0,7);
    return {id:`scene-${index+1}`,text,action:resolvedAction,place,props:resolvedProps,visualMode,keywords,characterId:'main',narrative,startFrame,endFrame,camera:{type:visualMode==='character'?'slow-push':'dynamic-push',from:1,to:1.07}};
  });
  // Reject jobs beyond the currently supported 10-minute production target.
  if(cursor>fps*600) throw new RangeError('Video exceeds 10-minute limit');
  const landscape=aspectRatio==="16:9";
  return {version:1,width:landscape?1920:1080,height:landscape?1080:1920,fps,totalFrames:scenes.at(-1).endFrame,scenes};
}
