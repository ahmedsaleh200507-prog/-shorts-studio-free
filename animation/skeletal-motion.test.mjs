import test from 'node:test';
import assert from 'node:assert/strict';
import {characterPose,lipShapeAt,smooth} from './skeletal-motion.mjs';

test('Pose is deterministic and finite for long renders',()=>{
 for(const action of ['travel','carry','pick','brush','wake','checkout','talk']){
  for(const frame of [0,12,24,720,14400]){
   const a=characterPose(action,frame);
   assert.deepEqual(a,characterPose(action,frame));
   assert.ok(Object.values(a).every(Number.isFinite));
  }
 }
});
test('Walking legs counter-rotate and carrying hand remains steady',()=>{
 const walking=characterPose('travel',6);
 assert.equal(walking.leftLeg,-walking.rightLeg);
 assert.ok(Math.abs(characterPose('carry',6).rightArm)<20);
 assert.ok(Math.abs(characterPose('travel',6).rightArm)>10);
});
test('Pick gesture interpolates smoothly',()=>{
 assert.equal(smooth(0),0);
 assert.equal(smooth(1),1);
 assert.equal(characterPose('pick',0).rightArm,0);
 assert.equal(characterPose('pick',48).rightArm,-43);
});
test('Lip cues support Rhubarb-style viseme timing without dependency',()=>{
 const cues=[{start:0,end:.2,value:'A'},{start:.2,end:.5,value:'D'}];
 assert.equal(lipShapeAt(.1,cues),'A');
 assert.equal(lipShapeAt(.3,cues),'D');
 assert.equal(lipShapeAt(.5,cues),'X');
 assert.equal(lipShapeAt(.1,[{start:0,end:1,value:'bad'}]),'X');
});

test('running uses faster stronger 2D stride than walking',()=>{
 const at=.15*24;
 const run=characterPose('run',at),walk=characterPose('walk',at);
 assert.ok(Math.abs(run.leftLeg)>Math.abs(walk.leftLeg));
 assert.equal(run.leftLeg,-run.rightLeg);
 assert.equal(walk.leftLeg,-walk.rightLeg);
 for(const action of ['run','walk']){
  for(const frame of [0,1,24,240,14400]){
   assert.ok(Object.values(characterPose(action,frame)).every(Number.isFinite));
  }
 }
});

test('sitting lowers the 2D character and bends legs smoothly',()=>{
 const start=characterPose('sit',0),middle=characterPose('sit',8),end=characterPose('sit',24);
 assert.equal(start.bodyY,0);
 assert.ok(middle.bodyY>0&&middle.bodyY<end.bodyY);
 assert.ok(end.leftLeg>50);
 assert.ok(end.rightLeg< -50);
 assert.equal(end.leftLeg,-end.rightLeg);
 for(const frame of [0,8,16,24,14400]){
  assert.ok(Object.values(characterPose('sit',frame)).every(Number.isFinite));
 }
});
