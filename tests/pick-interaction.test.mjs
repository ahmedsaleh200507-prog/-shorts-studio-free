import test from 'node:test';
import assert from 'node:assert/strict';
import {characterPose} from '../animation/skeletal-motion.mjs';

test('picking starts at rest, reaches, then settles into a grasp',()=>{
 const start=characterPose('pick',0);
 const reach=characterPose('pick',20);
 const settle=characterPose('pick',45);
 assert.equal(start.grasp,0);
 assert.ok(reach.rightArm < start.rightArm-20,'arm should reach toward object');
 assert.ok(settle.grasp>.95,'hand should close on object');
 assert.ok(settle.rightArm<0 && settle.rightArm>-55,'arm should settle into a held pose');
});
test('2D skeletal poses stay finite for long video frames',()=>{
 for(const action of ['pick','walk','run','carry','brush','sit','checkout']){
  for(const frame of [0,1,12,24,240,14400]){
   const pose=characterPose(action,frame);
   for(const [key,value] of Object.entries(pose))
    assert.ok(Number.isFinite(value),action+' '+key+' '+frame);
  }
 }
});
