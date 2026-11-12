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
