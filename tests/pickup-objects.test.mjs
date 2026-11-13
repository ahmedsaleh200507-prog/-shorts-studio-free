import test from 'node:test';
import assert from 'node:assert/strict';
import {makeScenePlan} from '../animation/scene-plan.mjs';
const examples=[
 ['She picks up a banana.','banana'],
 ['Er nimmt eine Flasche.','bottle'],
 ['She grabs a cup.','cup'],
 ['Er nimmt ein Buch.','book']
];
test('four different objects resolve to a 2D pickup interaction',()=>{
 for(const [script,object] of examples){
  const scene=makeScenePlan(script).scenes[0];
  assert.equal(scene.action,'pick',script);
  assert.ok(scene.narrative.objects.includes(object),script);
 }
});

test('singular and plural object words stay consistent',()=>{
 for(const [script,object] of [
  ['She picks up two cups.','cup'],
  ['He grabs the books.','book'],
  ['She takes bananas.','banana'],
  ['He picks up bottles.','bottle']
 ]){
  const scene=makeScenePlan(script).scenes[0];
  assert.equal(scene.action,'pick',script);
  assert.ok(scene.narrative.objects.includes(object),script);
 }
});
test('pickup context retains the previously named object across pronouns',()=>{
 const scenes=makeScenePlan('She picks up a cup. Then she looks at it.').scenes;
 assert.ok(scenes[0].narrative.objects.includes('cup'));
 assert.ok(scenes[1].narrative.objects.includes('cup'));
});
