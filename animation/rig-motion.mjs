// Pure 2D rig and timeline math. Every pose is reproducible at any render frame.
import {clamp01,easeInOut} from './visual-motion.mjs';
const lerp=(a,b,t)=>a+(b-a)*t;
const canonical=a=>({notification:'notify',receive:'notify','receive-message':'notify','phone-notify':'notify','pick-up':'reach',pickup:'reach','pick-phone':'reach',take:'reach','take-phone':'reach',phone:'read','read-message':'read','read-phone':'read','type-message':'type','write':'type','open-door':'open',door:'open',leave:'exit','leave-house':'exit',travel:'walk',speak:'talk',carry:'carry',put:'release','pick-object':'pick'})[a]||a||'talk';
export function beatAt(scene,frame){
 const duration=Math.max(1,scene.endFrame-scene.startFrame),beats=scene.beats?.length?scene.beats:[{action:scene.action}];
 const unit=duration/beats.length;
 let i=Math.min(beats.length-1,Math.floor(Math.max(0,frame)/unit));
 // Planner beats use normalized start/end and remain independent of TTS length.
 const timed=beats.every(b=>Number.isFinite(b.startProgress)&&Number.isFinite(b.endProgress));
 if(timed)i=Math.max(0,beats.findIndex(b=>frame/duration>=b.startProgress&&frame/duration<b.endProgress));
 const beat=beats[i],resolvedAction=beat.unsupported&&['wake','brush','pick','checkout','travel'].includes(scene.action)?scene.action:beat.action,start=timed?beat.startProgress*duration:i*unit,end=timed?beat.endProgress*duration:(i+1)*unit;
 return {...beat,action:canonical(resolvedAction),index:i,progress:clamp01((frame-start)/Math.max(1,end-start)),frame:Math.max(0,frame-start),duration:end-start};
}
export function limbJoint(root,target,length1=48,length2=48,bend=1){
 const dx=target.x-root.x,dy=target.y-root.y,raw=Math.hypot(dx,dy),d=Math.max(.001,Math.min(length1+length2-.001,raw));
 const a=Math.atan2(dy,dx),c=Math.acos(Math.max(-1,Math.min(1,(length1*length1+d*d-length2*length2)/(2*length1*d))));
 return {x:root.x+Math.cos(a+c*bend)*length1,y:root.y+Math.sin(a+c*bend)*length1};
}
export function rigPose(scene,frame,{speaking=false,viseme=null}={}){
 const beat=beatAt(scene,frame),a=beat.action,p=easeInOut(beat.progress),walking=['walk','run','exit','enter'].includes(a),run=a==='run';
 const cycle=frame*(run?.46:.28),step=walking?Math.sin(cycle):0;
 const phone=['notify','reach','read','type','hold'].includes(a)&&(scene.props||[]).some(x=>/phone|message|notification/.test(x));
 const phoneAction=phone||['notify','read','type'].includes(a);
 const rightRest={x:211,y:271},phoneHand={x:205,y:185};
 const objectKind=(beat.objectId||'').replace('object-','');
 const right=phoneAction?{x:lerp(rightRest.x,phoneHand.x,a==='notify'?0:a==='reach'?p:1),y:lerp(rightRest.y,phoneHand.y,a==='notify'?0:a==='reach'?p:1)}:['pick','reach','give','point','release'].includes(a)?{x:lerp(211,257,p),y:lerp(271,219,p)}:a==='open'?{x:lerp(211,251,p),y:lerp(271,210,p)}:{x:211-step*22,y:271-Math.abs(step)*4};
 const left=a==='type'?{x:192+Math.sin(frame*.9)*3,y:196+Math.sin(frame*.9)*2}:a==='brush'?{x:157+Math.sin(frame*.8)*6,y:119}:a==='checkout'?{x:235,y:225}:{x:94+step*22,y:271-Math.abs(step)*5};
 const doorStory=(scene.beats||[]).some(b=>['open','exit'].includes(b.action));
 const x=a==='exit'?lerp(0,250,p):walking?lerp(-55,doorStory?0:65,p):0;
 const sit=['sit','drive'].includes(a),blink=frame%103<5;
 return {beat,objectKind,action:a,walking,step,x,y:sit?40:walking?-Math.abs(step)*6:-6+Math.sin(frame*.07)*1.5,right,left,
  leftFoot:{x:125+step*24,y:sit?373:walking?388-Math.max(0,step)*14:394},rightFoot:{x:178-step*24,y:sit?373:walking?388-Math.max(0,-step)*14:394},
  blink,mouth:speaking?(viseme?({X:.5,A:1,B:2,C:6,D:10,E:5,F:7,G:3,H:4}[viseme]??3):2+Math.abs(Math.sin(frame*.73))*7):1.2,head:phoneAction?7:Math.sin(frame*.04)*1.5,
  phone:phoneAction,door:a==='open'?p:a==='close'?1-p:a==='exit'?1:0,opacity:a==='exit'?1-clamp01((p-.7)/.3):1};
}
// Caption pagination is bounded by characters and words, never grows with scene length.
export function captionAt(text,seconds,duration,timing,{maxChars=42,maxWords=7}={}){
 const real=timing?.source==='edge-word-boundary'&&timing.words?.length>0;
 const words=timing?.words?.length?timing.words:String(text).trim().split(/\s+/u).filter(Boolean).map((text,i,a)=>({text,start:i*duration/a.length,end:(i+1)*duration/a.length}));
 if(!words.length)return {words:[],active:-1,source:'estimated'};
 const spoken=words.findIndex(w=>seconds>=w.start&&seconds<w.end);
 const active=spoken<0?(seconds<words[0].start?0:Math.max(0,words.findLastIndex(w=>w.start<=seconds))):spoken;
 const groups=[];let group=[],chars=0;
 for(let i=0;i<words.length;i++){
  const size=String(words[i].text).length+1;
  if(group.length&&(group.length>=maxWords||chars+size>maxChars)){groups.push(group);group=[];chars=0}
  group.push({...words[i],index:i});chars+=size;
 }
 if(group.length)groups.push(group);
 return {words:groups.find(g=>g.some(w=>w.index===active))||groups[0],active:real?spoken:active,source:real?'edge-word-boundary':'estimated'};
}
