import test from 'node:test';
import assert from 'node:assert/strict';
import {beatAt,rigPose,limbJoint,captionAt} from './rig-motion.mjs';
const scene={startFrame:0,endFrame:180,props:['phone-screen'],beats:[{action:'notify'},{action:'reach'},{action:'read'},{action:'walk'},{action:'open'},{action:'exit'}]};
test('multi action beats have deterministic sequential poses',()=>{
 assert.equal(beatAt(scene,0).action,'notify');assert.equal(beatAt(scene,80).action,'read');assert.equal(beatAt(scene,149).action,'open');
 assert.ok(rigPose(scene,59).right.y<rigPose(scene,31).right.y);assert.ok(rigPose(scene,149).door>.9);assert.ok(rigPose(scene,179).opacity<.02);
});
test('walk lifts feet and swings limbs instead of translating a still',()=>{
 const walk={...scene,beats:[{action:'walk'}]},a=rigPose(walk,3),b=rigPose(walk,12);
 assert.notEqual(a.leftFoot.y,b.leftFoot.y);assert.notEqual(a.left.x,b.left.x);assert.notEqual(a.rightFoot.x,b.rightFoot.x);
});
test('inverse kinematics connects shoulder to elbow with fixed bone length',()=>{
 const root={x:10,y:20},j=limbJoint(root,{x:60,y:65},48,48,-1);
 assert.ok(Math.abs(Math.hypot(j.x-root.x,j.y-root.y)-48)<1e-7);
});
test('captions highlight actual word boundary and paginate long German text',()=>{
 const timing={source:'edge-word-boundary',words:[{text:'Guten',start:.2,end:.55},{text:'Morgen!',start:.6,end:1}]};
 const c=captionAt('Guten Morgen!',.7,2,timing);assert.equal(c.active,1);assert.equal(c.source,'edge-word-boundary');assert.equal(captionAt('Guten Morgen!',.57,2,timing).active,-1);
 const long=captionAt(Array(30).fill('Krankenhaus').join(' '),10,12,null);assert.ok(long.words.length<=3);assert.equal(long.source,'estimated');
});

test('resting and walking knees stay on their own side of the body',()=>{
 const standing={startFrame:0,endFrame:180,beats:[{action:'talk'}]};
 const walking={...standing,beats:[{action:'walk'}]};
 for(const story of [standing,walking])for(let frame=0;frame<180;frame++){
  const pose=rigPose(story,frame);
  const left=limbJoint({x:132,y:294},pose.leftFoot,49,51,1);
  const right=limbJoint({x:174,y:294},pose.rightFoot,49,51,-1);
  assert.ok(left.x<right.x,'knees must not cross');
  if(story===standing){assert.ok(left.x<132);assert.ok(right.x>174);assert.ok(Math.abs(left.x-132)<5,'rest knee must align below left hip');assert.ok(Math.abs(right.x-174)<5,'rest knee must align below right hip');assert.equal(pose.leftFoot.y,394);assert.equal(pose.rightFoot.y,394);}
 }
});
