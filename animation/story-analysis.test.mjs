import test from 'node:test';
import assert from 'node:assert/strict';
import {makeScenePlan} from './scene-plan.mjs';

function actions(plan,index){return plan.scenes[index].beats.map(b=>b.action);}
test('German message story composes physical interactions and preserves actor',()=>{
 const p=makeScenePlan('Ein Mann bekommt eine Nachricht. Er nimmt sein Handy und liest die Nachricht. Danach verlässt er das Haus.');
 assert.equal(p.scenes.length,3,'Narration still has exactly one clip per sentence');
 assert.deepEqual(actions(p,0),['receive']);
 assert.deepEqual(actions(p,1),['reach','hold','read']);
 assert.deepEqual(actions(p,2),['walk','open','exit']);
 assert.equal(p.registry.characters.length,1);
 assert.ok(p.scenes.every(s=>s.characterId==='main'));
 assert.equal(p.scenes[1].continuity.heldObjectId,'object-phone');
 assert.ok(p.registry.objects.some(o=>o.kind==='door'));
 for(const scene of p.scenes){
  assert.equal(scene.beats[0].startProgress,0);
  assert.equal(scene.beats.at(-1).endProgress,1);
  assert.ok(scene.beats.every(b=>b.endProgress>b.startProgress));
 }
});
test('English phone story and explicit room continuity',()=>{
 const p=makeScenePlan('A woman receives a message in the office. She takes her phone and reads the message. Then she leaves the house.');
 assert.deepEqual(actions(p,0),['receive']);
 assert.deepEqual(actions(p,1),['reach','hold','read']);
 assert.deepEqual(actions(p,2),['walk','open','exit']);
 assert.equal(p.registry.characters[0].gender,'female');
 assert.equal(p.registry.characters[0].appearance.shirt,'#347fba');
 assert.equal(p.scenes[1].place,'office');
 assert.equal(p.scenes[2].place,'home');
 assert.ok(p.scenes.every(s=>s.characterId==='main'));
});
test('A named character and gendered pronouns retain separate identities',()=>{
 const p=makeScenePlan('Anna reads a book. A man takes a phone. She reads the book. He opens the door.');
 assert.equal(p.scenes[0].characterId,'main');
 assert.equal(p.scenes[1].characterId,'character-2');
 assert.equal(p.scenes[2].characterId,'main');
 assert.equal(p.registry.characters[0].gender,'female','Pronoun refines an initially unknown name');
 assert.equal(p.scenes[3].characterId,'character-2');
 assert.equal(p.registry.characters.length,2);
 assert.equal(p.registry.characters[0].name,'Anna');
});
test('Definite role mentions reuse actor, indefinite descriptions introduce actor',()=>{
 const p=makeScenePlan('A man takes a phone. The man reads it. A woman opens the door. The woman smiles.');
 assert.equal(p.registry.characters.length,2);
 assert.equal(p.scenes[0].characterId,p.scenes[1].characterId);
 assert.equal(p.scenes[2].characterId,p.scenes[3].characterId);
});
test('Unrecognized topics remain distinct, explicitly unsupported information beats',()=>{
 const p=makeScenePlan('Quasars echo across the cosmos. A historian catalogues a manuscript.');
 assert.equal(p.analysis.generalLanguageUnderstanding,false);
 assert.deepEqual(p.analysis.unsupportedScenes,['scene-1','scene-2']);
 assert.notEqual(p.scenes[0].beats[0].label,p.scenes[1].beats[0].label);
 assert.equal(p.scenes[0].understanding.literalActionSupported,false);
 assert.equal(p.scenes[0].beats[0].unsupported,true);
});
test('Emotion, time and explicit causality accompany the timeline',()=>{
 const p=makeScenePlan('A worried woman takes a phone in the morning. She runs because the hospital needs help.');
 assert.equal(p.scenes[0].emotion,'worried');
 assert.equal(p.scenes[0].time,'morning');
 assert.equal(p.scenes[1].continuity.causedBy,'scene-1');
 assert.equal(p.scenes[1].place,'hospital');
 assert.ok(actions(p,1).includes('run'));
});
test('180 measured scenes keep frame alignment, bounded registry and identical actor',()=>{
 const lines=['A man takes a phone.',...Array(179).fill('He reads the message.')];
 const p=makeScenePlan(lines.join(' '),{durationsFrames:Array(180).fill(96),aspectRatio:'16:9'});
 assert.equal(p.scenes.length,180);
 assert.equal(p.totalFrames,17280);
 assert.equal(p.registry.characters.length,1);
 assert.ok(p.registry.objects.length<5);
 assert.ok(p.scenes.every(s=>s.characterId==='main'));
 assert.ok(p.scenes.every((s,i)=>s.startFrame===i*96&&s.endFrame===(i+1)*96));
});

test('German verb inversion keeps the subject while introducing an interaction partner',()=>{
 const p=makeScenePlan('Ein Mann nimmt sein Handy. Danach spricht er mit einer Frau. Sie lächelt.');
 assert.equal(p.scenes[1].characterId,'main');
 assert.equal(p.scenes[2].characterId,'character-2');
 assert.equal(p.registry.characters.length,2);
 assert.deepEqual(p.scenes[1].relationships,[{fromId:'main',toId:'character-2',interaction:'talk'}]);
});

test('Sentence splitting keeps decimals, abbreviations, quotes and German dates intact',()=>{
 const p=makeScenePlan('Dr. Smith erklärt 25.5%. Am 3. Mai zeigt er z. B. eine Grafik. "Does it work?!" Yes.');
 assert.deepEqual(p.scenes.map(s=>s.text),[
  'Dr. Smith erklärt 25.5%.',
  'Am 3. Mai zeigt er z. B. eine Grafik.',
  '"Does it work?!"', 'Yes.'
 ]);
});
test('Oversized scene count is rejected instead of silently dropping narration',()=>{
 assert.throws(()=>makeScenePlan(Array(181).fill('He walks.').join(' ')),/180 sentences/);
});
test('Source offsets identify the sentence clause for optional word alignment',()=>{
 const scene=makeScenePlan('He takes the phone and reads it.').scenes[0];
 assert.deepEqual(scene.beats.map(b=>b.textIndex),[3,3,23]);
});

test('Existing daily routine actions remain literal supported beats',()=>{
 const p=makeScenePlan('Ein Mann wacht morgens auf. Er putzt seine Zähne. Er nimmt einen Apfel. Er bezahlt an der Kasse.');
 assert.deepEqual(p.scenes.map(s=>s.actions),[['wake'],['brush'],['reach','hold'],['checkout']]);
 assert.ok(p.scenes.every(s=>s.understanding.literalActionSupported));
});

test('Object actions and topic changes do not invent human subjects',()=>{
 const p=makeScenePlan('The door opens. A computer reads data. A woman walks. The Earth circles the Sun.');
 assert.deepEqual(p.scenes.map(s=>s.characterIds.length),[0,0,1,0]);
 assert.equal(p.registry.characters.length,1);
});

test('Scientific measurement subject wins over incidental time context',()=>{
 for(const text of [
  'The experiment compares energy measurements over time and shows the results clearly.',
  'Das Experiment vergleicht die Messwerte im Laufe der Zeit und zeigt die Ergebnisse.',
  'The science experiment measures changes after one minute.'
 ]){
  const scene=makeScenePlan(text).scenes[0];
  assert.equal(scene.action,'science',text);
  assert.equal(scene.visualHint,'science-chart',text);
  assert.ok(scene.props.includes('chart'),text);
 }
});
test('Explicit clock instruments keep their intended subject in scientific context',()=>{
 for(const text of [
  'The clock measures time in the science experiment.',
  'Die Uhr zeigt die Zeit im Labor.',
  'The countdown timer starts the experiment.'
 ]){
  const scene=makeScenePlan(text).scenes[0];
  assert.equal(scene.action,'clock',text);
  assert.equal(scene.visualHint,null,text);
 }
});
