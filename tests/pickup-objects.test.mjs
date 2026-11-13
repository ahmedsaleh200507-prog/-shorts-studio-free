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

test('places as a noun does not trigger object release',()=>{
 for(const script of ['She visits many places.','They discover new places.','There are beautiful places.','He visits a place.']){
  const scene=makeScenePlan(script).scenes[0];
  assert.notEqual(scene.action,'put',script);
 }
});
test('explicit placement and release verbs still work',()=>{
 for(const script of ['She places the book.','She puts it down.','He sets the cup down.']){
  const scene=makeScenePlan(script).scenes[0];
  assert.equal(scene.action,'put',script);
 }
});

test('interaction object is tracked separately from other props',()=>{
 const scenes=makeScenePlan('She picks up a bottle. Then she walks. She puts down the bottle.').scenes;
 assert.equal(scenes[0].narrative.interactionObject,'bottle');
 assert.equal(scenes[1].narrative.interactionObject,null);
 assert.equal(scenes[1].narrative.heldObject,'bottle');
 assert.equal(scenes[2].narrative.interactionObject,'bottle');
 assert.equal(scenes[2].narrative.releaseObject,'bottle');
});
test('no physical object is invented for a generic pickup',()=>{
 const scene=makeScenePlan('She picks up an object.').scenes[0];
 assert.equal(scene.narrative.interactionObject,null);
});

test('explicit pickup pronoun refers to the previously mentioned object',()=>{
 const scenes=makeScenePlan('A cup is on the table. She picks it up.').scenes;
 assert.equal(scenes[1].action,'pick');
 assert.equal(scenes[1].narrative.heldObject,'cup');
 assert.equal(scenes[1].narrative.interactionObject,'cup');
 assert.equal(scenes[1].narrative.hasPhysicalInteraction,true);
});
test('pickup of a newly named item is not confused with earlier context',()=>{
 const scenes=makeScenePlan('A cup is on the table. She picks up a bottle.').scenes;
 assert.equal(scenes[1].narrative.interactionObject,'bottle');
 assert.equal(scenes[1].narrative.heldObject,'bottle');
});

test('explicit pickup wins over walking mentioned in the same sentence',()=>{
 for(const [script,item] of [
  ['She walks to the shelf and picks up a bottle.','bottle'],
  ['He runs to the table and grabs a cup.','cup'],
  ['She walks over and takes a book.','book']
 ]){
  const scene=makeScenePlan(script).scenes[0];
  assert.equal(scene.action,'pick',script);
  assert.equal(scene.narrative.interactionObject,item,script);
 }
});

test('a pronoun without an object never invents a pickup prop',()=>{
 const scene=makeScenePlan('She picks it up.').scenes[0];
 assert.equal(scene.narrative.interactionObject,null);
 assert.equal(scene.narrative.hasPhysicalInteraction,false);
});

test('pronoun-only scene preserves explicit object memory across multiple shots',()=>{
 const scenes=makeScenePlan('A cup is on the table. She looks at it. Then she picks it up.').scenes;
 assert.equal(scenes[2].action,'pick');
 assert.equal(scenes[2].narrative.interactionObject,'cup');
 assert.equal(scenes[2].narrative.hasPhysicalInteraction,true);
});
test('a newly mentioned item supersedes old pronoun memory',()=>{
 const scenes=makeScenePlan('A cup is on the table. She looks at it. A bottle is nearby. She picks it up.').scenes;
 assert.equal(scenes[3].narrative.interactionObject,'bottle');
});

test('repeated pickup of already-held item does not animate a second grasp',()=>{
 const scenes=makeScenePlan('She picks up a cup. Then she picks up the cup again.').scenes;
 assert.equal(scenes[0].narrative.hasPhysicalInteraction,true);
 assert.equal(scenes[1].narrative.heldObject,'cup');
 assert.equal(scenes[1].action,'carry');
 assert.equal(scenes[1].narrative.interaction,'carry');
 assert.equal(scenes[1].narrative.hasPhysicalInteraction,false);
});
test('pickup of a different item still triggers a new interaction',()=>{
 const scenes=makeScenePlan('She picks up a cup. Then she picks up a bottle.').scenes;
 assert.equal(scenes[1].narrative.interactionObject,'bottle');
 assert.equal(scenes[1].narrative.hasPhysicalInteraction,true);
});
