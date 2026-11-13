import test from 'node:test';
import assert from 'node:assert/strict';
import {makeScenePlan,splitScript} from './scene-plan.mjs';
test('German actions retain continuity',()=>{
  const plan=makeScenePlan('Ein Mann wacht morgens auf. Er putzt seine Zähne. Er nimmt einen Apfel. Er bezahlt an der Kasse.');
  assert.deepEqual(plan.scenes.map(s=>s.action),['wake','brush','pick','checkout']);
  assert.equal(plan.scenes.length,4);
  assert.ok(plan.scenes.every(s=>s.characterId==='main'));
  assert.equal(plan.totalFrames,288);
});
test('English and invalid input',()=>{
  assert.equal(makeScenePlan('She brushes her teeth.').scenes[0].action,'brush');
  assert.throws(()=>makeScenePlan(''));
  assert.deepEqual(splitScript('A. B!'),['A.','B!']);
});

test('German separable verbs with intervening words',()=>{
  for(const text of ['Ein Mann wacht morgens auf.','Er wacht auf.','Die Frau wacht um sieben Uhr auf.','Ein Kind erwacht.']){
    const action=makeScenePlan(text).scenes[0].action;
    assert.equal(action,'wake',text);
  }
});

test('Reference-style visual narration uses semantic motion graphics',()=>{
 const cases=[
  ['Eine Warnmeldung erscheint auf dem Bildschirm.','alert'],
  ['Eine Nachricht erscheint auf dem Smartphone.','phone'],
  ['Jemand steht vor der Tür.','door'],
  ['Die Uhr zeigt Mitternacht.','clock'],
  ['Die Erde dreht sich um die Sonne.','space'],
  ['Das Experiment erklärt die Physik.','science'],
  ['Im Wald steht ein Baum.','nature'],
  ['Ein Computer verarbeitet die Daten.','technology'],
  ['Die Kosten steigen um 25%.','number']
 ];
 for(const [text,action] of cases){
  const scene=makeScenePlan(text).scenes[0];
  assert.equal(scene.action,action,text);
  assert.equal(scene.visualMode,'motion-graphic',text);
  assert.ok(scene.keywords.length>0,text);
 }
 assert.equal(makeScenePlan('Eine unbekannte Erzählung beginnt.').scenes[0].visualMode,'character');
 assert.equal(makeScenePlan('Sie putzt ihre Zähne.').scenes[0].visualMode,'character');
});

test('Different stories create different environments, not a supermarket fallback',()=>{
 const cases=[
  ['Der Patient liegt im Krankenhaus.','hospital'],
  ['Die Kinder lernen in der Schule.','school'],
  ['Die Familie sitzt im Restaurant.','restaurant'],
  ['Die Frau arbeitet im Büro.','office'],
  ['Der Mann nimmt seinen Schlüssel.','generic']
 ];
 for(const [sentence,place] of cases){
  assert.equal(makeScenePlan(sentence).scenes[0].place,place,sentence);
 }
});
test('Each sentence has its own non-overlapping frames',()=>{
 const p=makeScenePlan('Er ist im Krankenhaus. Danach geht er in die Schule. Er fährt mit dem Bus.');
 assert.equal(p.scenes.length,3);
 for(let i=1;i<p.scenes.length;i++)assert.equal(p.scenes[i-1].endFrame,p.scenes[i].startFrame);
 assert.equal(p.totalFrames,p.scenes.at(-1).endFrame);
});

test('Documentary reference topics use map and history motion graphics',()=>{
 for(const [sentence,action] of [
  ['Die Karte zeigt Europa.','map'],
  ['Die Geschichte beginnt im Jahr 1900.','history'],
  ['The map shows the region.','map'],
  ['A historical newspaper is discovered.','history']
 ]){
  const scene=makeScenePlan(sentence).scenes[0];
  assert.equal(scene.action,action,sentence);
  assert.equal(scene.visualMode,'motion-graphic',sentence);
 }
});

test('Pronoun follow-up preserves location without inventing a new setting',()=>{
 const plan=makeScenePlan('Der Patient liegt im Krankenhaus. Er wartet auf Hilfe. Danach spricht er mit einer Frau.');
 assert.deepEqual(plan.scenes.map(s=>s.place),['hospital','hospital','hospital']);
 assert.equal(makeScenePlan('Ein Mann ist im Büro. Danach geht er in die Schule.').scenes[1].place,'school');
});

test('Explicit place wins over broad action keywords',()=>{
 const examples=[
  ['Die Frau putzt im Krankenhaus den Boden.','hospital'],
  ['Er arbeitet in der Schule.','school'],
  ['She pays at the restaurant.','restaurant'],
  ['Er telefoniert im Supermarkt.','supermarket']
 ];
 for(const [sentence,place] of examples){
  assert.equal(makeScenePlan(sentence).scenes[0].place,place,sentence);
 }
});

test('History keywords do not match substrings in everyday words',()=>{
 const p=makeScenePlan('Der Patient liegt im Krankenhaus. Er wartet auf Hilfe. Danach spricht er mit einer Frau.');
 assert.deepEqual(p.scenes.map(s=>s.place),['hospital','hospital','hospital']);
 assert.equal(makeScenePlan('The war ended.').scenes[0].action,'history');
 assert.equal(makeScenePlan('The warehouse is large.').scenes[0].action,'talk');
});

test('Long-form plan supports 180 scenes and both aspect ratios',()=>{
 const script=Array.from({length:180},(_,i)=>'Scene '+i+' continues.').join(' ');
 const durations=Array(180).fill(80);
 const portrait=makeScenePlan(script,{durationsFrames:durations,aspectRatio:'9:16'});
 const landscape=makeScenePlan(script,{durationsFrames:durations,aspectRatio:'16:9'});
 assert.equal(portrait.scenes.length,180);
 assert.equal(landscape.totalFrames,14400);
 assert.equal(landscape.width,1920);
 assert.equal(landscape.height,1080);
 assert.equal(portrait.width,1080);
 assert.equal(portrait.height,1920);
});

test('Screen and SMS narratives select animated phone object in both languages',()=>{
 for(const sentence of ['Eine SMS erscheint auf dem Bildschirm.','A message appears on the screen.','Sie liest eine Textnachricht.']){
  const scene=makeScenePlan(sentence).scenes[0];
  assert.equal(scene.action,'phone',sentence);
  assert.equal(scene.visualMode,'motion-graphic',sentence);
 }
});

test('Carrying a suitcase triggers walking interaction without losing location',()=>{
 for(const sentence of ['Er trägt einen Koffer.','She carries a suitcase.','He carries a backpack.']){
  const scene=makeScenePlan(sentence).scenes[0];
  assert.equal(scene.action,'carry',sentence);
  assert.equal(scene.visualMode,'character',sentence);
 }
 const plan=makeScenePlan('Er ist im Krankenhaus. Danach trägt er einen Koffer.');
 assert.equal(plan.scenes[1].place,'hospital');
});


test('Decimal values do not create phantom narration scenes',()=>{
  assert.deepEqual(splitScript('Der Preis beträgt 16.83 Euro. Danach 3.5 Kilometer.'),[
    'Der Preis beträgt 16.83 Euro.', 'Danach 3.5 Kilometer.'
  ]);
  assert.equal(makeScenePlan('The distance is 3.5 km. It grows to 4.25 km.').scenes.length,2);
});

test('Decimal quantities do not create false narration scenes',()=>{
 const text='Die Temperatur steigt um 2.5 Grad. Danach sinkt sie auf 1.2 Grad.';
 const sentences=splitScript(text);
 assert.equal(sentences.length,2);
 assert.equal(makeScenePlan(text).scenes.length,2);
});

test('ten-minute video boundary rejects oversized render jobs early',()=>{
 const script=Array.from({length:20},(_,i)=>'Scene '+i+'.').join(' ');
 const exact=makeScenePlan(script,{secondsPerScene:30});
 assert.equal(exact.totalFrames,600*24);
 assert.throws(()=>makeScenePlan(script+' Extra scene.',{secondsPerScene:30}),/10-minute/);
 assert.throws(()=>makeScenePlan('One scene.',{durationsFrames:[600*24+1]}),/10-minute/);
});

test('German daily-life script preserves locations and cup instead of apple',()=>{
 const plan=makeScenePlan('Am Morgen wacht Lukas auf und steht aus dem Bett. Er geht in die Küche und nimmt eine Tasse. Dann schaut er aus dem Fenster. Draußen ziehen weiße Wolken über den Himmel.');
 const scenes=plan.scenes;
 assert.equal(scenes[0].action,'wake');
 assert.equal(scenes[0].place,'bedroom');
 assert.equal(scenes[1].place,'kitchen');
 assert.equal(scenes[1].action,'pick');
 assert.equal(scenes[1].narrative.interactionObject,'cup');
 assert.equal(scenes[2].place,'window');
 assert.equal(scenes[2].narrative.heldObject,'cup');
 assert.equal(scenes[3].place,'window');
 assert.equal(scenes[3].visualMode,'character');
});
test('English window and home settings are recognized',()=>{
 assert.equal(makeScenePlan('She looks through the window.').scenes[0].place,'window');
 assert.equal(makeScenePlan('He returns home.').scenes[0].place,'house');
});
