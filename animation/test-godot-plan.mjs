import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const exportPlan=(script,aspect='9:16')=>JSON.parse(execFileSync(process.execPath,['animation/export-godot-plan.mjs',script,aspect],{encoding:'utf8'}));
test('German story maps to distinct native 2D actions',()=>{
  const plan=exportPlan('Er wacht auf. Er putzt die Zähne. Er nimmt einen Apfel.');
  assert.equal(plan.scenes.length,3);
  assert.deepEqual(plan.scenes.map(s=>s.action),['wake','brush','pick']);
  assert.equal(plan.scenes[1].place,'bathroom');
  assert.equal(plan.scenes[2].place,'supermarket');
  assert.equal(plan.scenes.at(-1).endFrame,plan.totalFrames);
});
test('English narration and landscape mode are accepted',()=>{
  const plan=exportPlan('She wakes up. She brushes her teeth. She takes a bus.','16:9');
  assert.equal(plan.aspectRatio,'16:9');
  assert.deepEqual(plan.scenes.map(s=>s.action),['wake','brush','travel']);
});
test('Unknown actions degrade to talk without losing sentences',()=>{
  const plan=exportPlan('The galaxy contains billions of stars. A scientist examines an atom.');
  assert.equal(plan.scenes.length,2);
  assert.ok(plan.scenes.every(s=>s.action==='talk'));
  assert.ok(plan.scenes.every(s=>s.frames>0));
});
