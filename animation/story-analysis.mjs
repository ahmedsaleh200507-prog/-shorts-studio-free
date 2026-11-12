// Local DE/EN compositional story planner. This is a bounded, explainable parser,
// not a claim of general natural-language or visual understanding.
const actorTypes = [
 ['woman', /\b(?:frau|ärztin|lehrerin|woman|lady|female|mother|mutter|girl|mädchen)\b/giu, 'female'],
 ['man', /\b(?:mann|arzt|lehrer|man|male|father|vater|boy|junge)\b/giu, 'male'],
 ['child', /\b(?:kind|kinder|child|children|kid|kids)\b/giu, 'neutral'],
 ['person', /\b(?:person|patient|scientist|wissenschaftler|fahrer|driver|cashier|kassierer)\b/giu, 'neutral'],
];
const objectRules = [
 ['phone', /handy|smartphone|telefon|\bphone\b/iu],
 ['notification', /nachricht|message|notification|benachrichtigung/iu],
 ['door', /\btür\b|\btuer\b|\bdoor\b|verlässt|verlassen|leaves? (?:the |his |her )?(?:house|home)/iu],
 ['key', /schlüssel|\bkeys?\b/iu], ['apple', /apfel|\bapple\b/iu],
 ['food', /produkt|product|lebensmittel|grocer|\bfood\b/iu],
 ['vehicle', /\bauto\b|\bcar\b|\bbus\b|\bzug\b|\btrain\b|vehicle/iu],
 ['computer', /computer|laptop|bildschirm|screen/iu], ['book', /\bbuch\b|\bbook\b/iu],
 ['payment-card', /bezahl|\bpays?\b|payment.card|bankkarte/iu],
 ['bed', /\bbett\b|\bbed\b/iu], ['chart', /diagramm|graph|\bchart\b|\d+\s*%/iu],
 ['bag', /tasche|\bbag\b/iu], ['toothbrush', /zähne|teeth|toothbrush|zahnbürste/iu],
];
const actionRules = [
 ['wake', /\bwach(?:e|st|t|en)?\b[^.!?]{0,90}\bauf\b|aufwach|\berwach(?:e|st|t|en)?\b|wake(?:s)? up|woke up|\b(?:steht|stand)\s+auf\b|aufgestanden|\b(?:gets?|got)\s+up\b/iu],
 ['brush', /zähne|zahnbürste|\bteeth\b|toothbrush/iu],
 ['checkout', /kasse|bezahl|checkout|cashier|\bpays?\b/iu],
 ['receive', /bekommt|erhält|empfängt|receives?|notification|benachrichtigung|(?:nachricht|message)\s+(?:erscheint|arrives?)/iu],
 ['type', /(?:tippt|schreibt|verfasst|types?|typing|texts?|texting)\b/iu],
 ['read', /\bliest\b|\blesen\b|\breads?\b|reading|schaut.*(?:handy|bildschirm)|looks? at.*(?:phone|screen)/iu],
 ['open', /öffnet|öffnen|\bopens?\b|opening/iu],
 ['close', /schließt|schliessen|\bcloses?\b|closing/iu],
 ['pick', /\b(?:nimmt|nehmen|greift|holt)\b|picks? up|picking up|takes?|taking|grabs?/iu],
 ['put', /(?:legt|stellt|lässt.*fallen|setzt.*ab)\b|puts? down|drops?|places?/iu],
 ['carry', /trägt|tragen|carries|carry|carrying/iu],
 ['run', /\brennt\b|\bläuft\b|\blaufen\b|\bruns?\b|running/iu],
 ['walk', /\bgeht\b|\bgehen\b|spaziert|walks?|walking/iu],
 ['sit', /\bsitzt\b|setzt sich|\bsits?\b|sitting/iu],
 ['drive', /fährt|fahren|drives?|driving/iu],
 ['enter', /betritt|steigt.*ein|enters?|gets? (?:in|into)/iu],
 ['exit', /verlässt|verlassen|geht.*hinaus|hinausgeht|leaves?|leaving|exits?/iu],
 ['talk', /spricht|sprechen|sagt|sagen|talks?|speaks?|says?/iu],
 ['give', /\bgibt\b|übergibt|gives?|hands? (?:over|to)/iu],
 ['point', /zeigt|points?|erklärt|explains?/iu],
];
const emotionRules = [
 ['worried', /besorgt|ängstlich|angst|worried|afraid|scared/iu],
 ['sad', /traurig|weint|sad|cries|crying/iu],
 ['happy', /glücklich|freut|lächelt|happy|smiles?|joy/iu],
 ['surprised', /überrascht|erschrickt|surprised|shocked/iu],
 ['angry', /wütend|ärgerlich|angry|furious/iu],
];
const stopNames = new Set(['Ein','Eine','Einen','Der','Die','Das','Er','Sie','Es','Danach','Dann','Im','Am','The','A','An','He','She','They','Then','Afterwards','Scene']);
const subjectPronoun = /^(?:(?:danach|dann|anschließend|plötzlich|then|afterwards|suddenly)\s+(?:[\p{L}]+\s+)?)?(er|sie|he|she|they)\b/iu;
const namesIn = text => [...text.matchAll(/\b[A-ZÄÖÜ][a-zäöüß]{1,24}\b/gu)].filter(m => !stopNames.has(m[0]));
function subjectNames(text) {
 // Names are accepted only in a subject position before a known verb, avoiding
 // invention of people from capitalized German nouns and place names.
 const m=text.match(/^(?:(?:then|danach|dann)\s+)?([A-ZÄÖÜ][a-zäöüß]{1,24})(?:\s+(?:and|und)\s+([A-ZÄÖÜ][a-zäöüß]{1,24}))?\s+(?:nimmt|geht|liest|bekommt|erhält|öffnet|spricht|gibt|trägt|sitzt|rennt|ist|hat|sieht|walks?|reads?|receives?|opens?|speaks?|gives?|takes?|carries|runs?|sits?|is|has|sees)\b/u);
 return m ? [m[1],m[2]].filter(n=>n&&!stopNames.has(n)) : [];
}
function actorMentions(text) {
 const mentions=[];
 for(const [kind,regex,gender] of actorTypes) {
   for(const m of text.matchAll(regex)) mentions.push({kind,gender,index:m.index,label:m[0]});
 }
 for(const name of subjectNames(text)) mentions.push({kind:'person',gender:'neutral',name,index:text.indexOf(name),label:name});
 return mentions.sort((a,b)=>a.index-b.index);
}
const appearance = (text,gender,ordinal) => ({
 gender,skin:['#e6b18d','#ad7556','#f0c7a6','#8a583e'][ordinal%4],
 shirt:(/rot|\bred\b/iu.test(text)?'#c95257':/grün|\bgreen\b/iu.test(text)?'#378b72':/gelb|yellow/iu.test(text)?'#d4aa3d':['#347fba','#b95c8a','#438a72','#a67840'][ordinal%4]),
 hair:/blond/iu.test(text)?'#bf934c':/grau|grey|gray/iu.test(text)?'#818a98':'#29374b',
 child:/kind|child|girl|boy|mädchen|junge/iu.test(text),
});

export function analyzeStory(sentences) {
 const characters=[],objects=[]; let current=null; const knownNames=new Map();
 const state=new Map();
 const ensureObject=kind=>{
  let object=objects.find(o=>o.kind===kind);
  if(!object){object={id:`object-${kind}`,kind};objects.push(object);}
  return object.id;
 };
 const scenes=sentences.map((text,index)=>{
  const mentions=actorMentions(text); const cast=[];
  for(const mention of mentions){
   let actor=mention.name?knownNames.get(mention.name):null;
   // Definite descriptions usually refer back to an existing participant.
   // Indefinite descriptions introduce another actor when a matching one exists.
   const prefix=text.slice(Math.max(0,mention.index-20),mention.index);
   const introduced=/\b(?:ein|eine|einen|einem|einer|a|an|another|weitere[rn]?)(?:\s+[\p{L}-]+){0,3}\s*$/iu.test(prefix);
   if(!actor&&!mention.name&&!introduced) actor=characters.find(c=>c.kind===mention.kind || (c.gender===mention.gender&&mention.gender!=='neutral'));
   if(!actor){
    actor={id:characters.length?'character-'+(characters.length+1):'main',kind:mention.kind,name:mention.name||null,label:mention.label,gender:mention.gender,appearance:appearance(text,mention.gender,characters.length)};
    characters.push(actor);if(mention.name)knownNames.set(mention.name,actor);
   }
   cast.push(actor.id);
  }
  // Resolve a pronoun by its gender only when an eligible antecedent exists;
  // ambiguous 'sie/they' retains the most recent subject and is reported below.
  const pronoun=(text.match(subjectPronoun)||text.match(/\b(?:nimmt|geht|liest|öffnet|spricht|verlässt|rennt|fährt|sitzt|ist|hat)\s+(er|sie)\b/iu))?.[1]?.toLowerCase();
  const gender=pronoun==='er'||pronoun==='he'?'male':pronoun==='she'||pronoun==='sie'?'female':null;
  const prior=gender?[...characters].reverse().find(c=>c.gender===gender)||[...characters].reverse().find(c=>c.gender==='neutral')||current:current;
  const namedReference=namesIn(text).map(m=>knownNames.get(m[0])).find(Boolean);
  let actor=pronoun&&prior?prior:cast.length?characters.find(c=>c.id===cast[0]):namedReference||null;
  const detected=actionRules.map(([action,regex])=>({action,match:text.match(regex)})).filter(v=>v.match).map(v=>({action:v.action,index:v.match.index})).sort((a,b)=>a.index-b.index);
  const foundObjects=objectRules.filter(([,regex])=>regex.test(text)).map(([kind])=>kind);
  const humanSubject=Boolean(pronoun)||/^(?:jemand|menschen|someone|somebody|people)\b/iu.test(text);
  if(!actor&&(humanSubject||mentions.length)){
   actor={id:characters.length?'character-'+(characters.length+1):'main',kind:'person',name:null,label:'Person',gender:gender||'neutral',appearance:appearance(text,gender||'neutral',characters.length)};
   characters.push(actor);
  }
  if(actor){
   current=actor;
   if(gender&&actor.gender==='neutral'){actor.gender=gender;actor.appearance.gender=gender;}
  }
  // A message implies a phone only for a character story. A technical network
  // may receive data without introducing a human or phone.
  if(foundObjects.includes('notification')&&(actor||/handy|phone|smartphone/iu.test(text))&&!foundObjects.includes('phone')) foundObjects.push('phone');
  const previous=state.get(actor?.id)||{};
  let held=previous.held||null;
  const beats=[];let textIndex=0;
  const push=(action,kind=null,extra={})=>{
   const objectId=kind?ensureObject(kind):null;
   if(beats.at(-1)?.action===action&&beats.at(-1)?.objectId===objectId)return;
   beats.push({action,textIndex,characterId:actor?.id||'main',objectId,targetId:cast.find(id=>id!==actor?.id)||null,...extra});
  };
  for(const {action,index:actionIndex} of detected){
   textIndex=actionIndex;
   const kind=foundObjects.find(k=>!['notification','door','chart'].includes(k))||(held?objects.find(o=>o.id===held)?.kind:null);
   if(action==='receive'){
    if(foundObjects.includes('notification')){push('receive','phone',{effect:'notification'});ensureObject('notification');}
    else push(action,kind);
   }else if(action==='pick'){
    push('reach',kind);push('hold',kind);held=kind?ensureObject(kind):null;
   }else if(['read','type'].includes(action)){
    const target=foundObjects.includes('phone')||foundObjects.includes('notification')?'phone':foundObjects.includes('book')?'book':kind;
    if(target&&held!==ensureObject(target)){push('reach',target);push('hold',target);held=ensureObject(target);}
    push(action,target);
   }else if(action==='exit'){
    push('walk','door');push('open','door');push('exit','door');
   }else if(action==='enter'&&foundObjects.includes('vehicle')){
    push('walk','vehicle');push('enter','vehicle');
   }else if(action==='open'||action==='close')push(action,foundObjects.includes('door')?'door':kind||'door');
   else if(action==='put'){push(action,kind);held=null;}
   else push(action,kind);
  }
  const emotion=emotionRules.find(([,regex])=>regex.test(text))?.[0]||'neutral';
  const unknown=beats.length===0;
  if(unknown){
   // Preserve the content as an information card and deterministic gesture;
   // never pretend the unrecognized verb received a literal action animation.
   push('present',foundObjects[0]||null,{label:text,unsupported:true});
  }
  if(actor)state.set(actor.id,{held,emotion});
  const count=beats.length;
  beats.forEach((b,i)=>{b.startProgress=i/count;b.endProgress=(i+1)/count;});
  const causal=/weil|deshalb|daher|because|therefore|so that|as a result/iu.test(text);
  const time=text.match(/\b(?:morgens|abends|nachts|morgen|gestern|heute|morning|evening|night|tomorrow|yesterday|today|\d{1,2}:\d{2})\b/iu)?.[0]||null;
  const result={characterId:actor?.id||'main',characterIds:[...new Set([actor?.id,...cast].filter(Boolean))],beats,actions:beats.map(b=>b.action),objectIds:[...new Set([...foundObjects.map(ensureObject),...beats.map(b=>b.objectId).filter(Boolean)])],emotion,time,
   relationships:beats.filter(b=>b.targetId).map(b=>({fromId:b.characterId,toId:b.targetId,interaction:b.action})),
   continuity:{previousSceneId:index?'scene-'+index:null,heldObjectId:held,causedBy:causal&&index?'scene-'+index:null},
   understanding:{method:'local-compositional-de-en',literalActionSupported:!unknown,ambiguousPronoun:pronoun==='sie'||pronoun==='they',limitations:unknown?['Unrecognized action: uses an information card and gesture.']:[]}};
  return result;
 });
 return {scenes,registry:{characters,objects},analysis:{method:'local-compositional-de-en',generalLanguageUnderstanding:false,supportedLanguages:['de','en'],unsupportedScenes:scenes.flatMap((s,i)=>s.understanding.literalActionSupported?[]:['scene-'+(i+1)])}};
}
