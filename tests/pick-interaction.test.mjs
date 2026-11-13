import test from 'node:test';
import assert from 'node:assert/strict';
import {characterPose,pickupPropPose} from '../animation/skeletal-motion.mjs';

test('picking starts at rest, reaches, then settles into a grasp',()=>{
 const start=characterPose('pick',0);
 const reach=characterPose('pick',20);
 const settle=characterPose('pick',45);
 assert.equal(start.grasp,0);
 assert.ok(reach.rightArm < start.rightArm-20,'arm should reach toward object');
 assert.ok(settle.grasp>.95,'hand should close on object');
 assert.equal(characterPose('pick',0).grasp,0,'object must remain on shelf initially');
 assert.ok(characterPose('pick',12).grasp>0,'pickup must begin after reach starts');
 assert.ok(characterPose('pick',12).grasp<characterPose('pick',20).grasp,'grasp must advance monotonically');
 assert.equal(characterPose('pick',48).grasp,1,'grasp must finish without drifting');
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

test('apple remains stationary until grasp and reaches a stable held position',()=>{
 const shelf=pickupPropPose(0);
 const before=pickupPropPose(10);
 const middle=pickupPropPose(16);
 const held=pickupPropPose(48);
 assert.deepEqual({x:shelf.x,y:shelf.y,grasp:shelf.grasp},{x:72,y:57,grasp:0});
 assert.equal(before.x,72,'apple cannot move before hand makes contact');
 assert.ok(middle.x<72 && middle.x>53,'apple moves smoothly during transfer');
 assert.equal(held.x,53,'apple reaches held x coordinate');
 assert.equal(held.held,true);
 for(const frame of [0,1,12,24,240,14400]){
  const p=pickupPropPose(frame);
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
  assert.ok(p.x>=53&&p.x<=72);
 }
});
