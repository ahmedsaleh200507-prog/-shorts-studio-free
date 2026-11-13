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

test('held object persists through another shot and is released when placed',()=>{
 const scenes=makeScenePlan('She picks up a cup. Then she walks. She puts down the cup. Afterwards she walks.').scenes;
 assert.equal(scenes[0].narrative.heldObject,'cup');
 assert.equal(scenes[1].narrative.heldObject,'cup');
 assert.equal(scenes[2].action,'put');
 assert.equal(scenes[2].narrative.releaseObject,'cup');
 assert.equal(scenes[3].narrative.heldObject,null);
});

test('held objects keep character rendering until explicit release',()=>{
 const scenes=makeScenePlan('She picks up a bottle. Then she walks. She puts down the bottle.').scenes;
 assert.equal(scenes[0].narrative.heldObject,'bottle');
 assert.equal(scenes[1].visualMode,'character');
 assert.equal(scenes[1].narrative.heldObject,'bottle');
 assert.equal(scenes[2].visualMode,'character');
 assert.equal(scenes[2].narrative.releaseObject,'bottle');
});

test('put-down verbs override object name pickup detection',()=>{
 for(const script of ['She puts down the cup.','He places the book.','Er legt die Flasche ab.']){
  const scene=makeScenePlan(script).scenes[0];
  assert.equal(scene.action,'put',script);
 }
});

test('mentioning an object without pickup verbs does not animate a pickup',()=>{
 for(const script of ['She reads a book.','The cup is on the table.','A bottle is on the shelf.','She likes bananas.']){
  const scene=makeScenePlan(script).scenes[0];
  assert.notEqual(scene.action,'pick',script);
  assert.equal(scene.narrative.heldObject,null,script);
 }
});

test('compound nouns do not become unrelated objects',()=>{
 for(const [script,forbidden] of [
  ['She walks into a bookstore.','book'],
  ['She opens the cupboard.','cup'],
  ['She looks at a pineapple.','apple'],
  ['She takes her baggage.','bag']
 ]){
  const scene=makeScenePlan(script).scenes[0];
  assert.ok(!scene.narrative.objects.includes(forbidden),script);
 }
});

test('release without a held prop does not invent a physical interaction',()=>{
 const scenes=makeScenePlan('She puts down the cup. She picks up a bottle. Then she puts it down.').scenes;
 assert.equal(scenes[0].action,'put');
 assert.equal(scenes[0].narrative.releaseObject,null);
 assert.equal(scenes[0].narrative.hasPhysicalInteraction,false);
 assert.equal(scenes[1].narrative.heldObject,'bottle');
 assert.equal(scenes[1].narrative.hasPhysicalInteraction,true);
 assert.equal(scenes[2].narrative.releaseObject,'bottle');
 assert.equal(scenes[2].narrative.hasPhysicalInteraction,true);
});

test('unknown pickup target never creates a fabricated apple',()=>{
 const scene=makeScenePlan('She picks up an object.').scenes[0];
 assert.equal(scene.action,'pick');
 assert.equal(scene.narrative.hasPhysicalInteraction,false);
 assert.equal(scene.narrative.heldObject,null);
});
test('known pickup target still produces physical interaction',()=>{
 for(const [text,object] of [['She picks up a cup.','cup'],['He takes a book.','book']]){
  const scene=makeScenePlan(text).scenes[0];
  assert.equal(scene.narrative.heldObject,object);
  assert.equal(scene.narrative.hasPhysicalInteraction,true);
 }
});
