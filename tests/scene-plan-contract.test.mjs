import test from 'node:test';
import assert from 'node:assert/strict';
import {makeScenePlan,splitScript} from '../animation/scene-plan.mjs';

test('vertical and horizontal exports retain correct dimensions',()=>{
 for(const [aspectRatio,width,height] of [['9:16',1080,1920],['16:9',1920,1080]]){
  const plan=makeScenePlan('She walks. Then she sits.',{aspectRatio});
  assert.equal(plan.width,width);
  assert.equal(plan.height,height);
  assert.equal(plan.fps,24);
  assert.equal(plan.totalFrames,144);
  assert.deepEqual(plan.scenes.map(s=>[s.startFrame,s.endFrame]),[[0,72],[72,144]]);
 }
});
test('voice-aligned frame durations are used without drift',()=>{
 const plan=makeScenePlan('Hello. World.',{fps:30,durationsFrames:[37,61]});
 assert.equal(plan.totalFrames,98);
 assert.deepEqual(plan.scenes.map(s=>[s.startFrame,s.endFrame]),[[0,37],[37,98]]);
});
test('ten-minute maximum is accepted and longer video rejected',()=>{
 const script=Array.from({length:20},(_,i)=>'Scene '+i+'.').join(' ');
 assert.equal(makeScenePlan(script,{secondsPerScene:30}).totalFrames,14400);
 assert.throws(()=>makeScenePlan(script,{fps:60,secondsPerScene:30,durationsFrames:Array(20).fill(1801)}),/10-minute/);
});
test('invalid export options are rejected before rendering',()=>{
 for(const options of [{aspectRatio:'1:1'},{fps:0},{fps:120},{secondsPerScene:0},{secondsPerScene:31},{durationsFrames:[1]},{durationsFrames:[0,3]}])
  assert.throws(()=>makeScenePlan('Hello. World.',options));
 assert.throws(()=>splitScript(null),TypeError);
 assert.throws(()=>makeScenePlan(' '),/empty script/);
});
