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
 assert.equal(makeScenePlan('Eine unbekannte Geschichte beginnt.').scenes[0].visualMode,'kinetic-type');
 assert.equal(makeScenePlan('Sie putzt ihre Zähne.').scenes[0].visualMode,'character');
});
