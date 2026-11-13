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
