import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {makeScenePlan} from './scene-plan.mjs';

const el=React.createElement;
const pct=(n)=>n+'%';
function Shape({x,y,w,h,color,r=0,rotate=0,children,style={}}){
 return el('div',{style:{position:'absolute',left:pct(x),top:pct(y),width:pct(w),height:pct(h),background:color,borderRadius:r,transform:`rotate(${rotate}deg)`,...style}},children);
}
function Person({frame,action}){
 const phase=Math.sin(frame/4),walk=action==='travel'?phase*14:0;
 const arm=action==='brush'?-45+phase*12:action==='pick'?-65+phase*12:action==='checkout'?-32+phase*9:action==='wake'?-15+phase*8:phase*10;
 const rise=action==='wake'?Math.max(0,18-frame*0.7):0;
 return el('div',{style:{position:'absolute',left:'36%',top:`${29+rise+walk/10}%`,width:'30%',height:'52%'}},
  Shape({x:26,y:5,w:48,h:24,color:'#e9b18e',r:'50%',children:Shape({x:0,y:0,w:100,h:32,color:'#273248',r:'50%'}),
   style:{boxShadow:'inset -9px -4px 0 #d69877'}}),
  Shape({x:38,y:17,w:5,h:3,color:'#1c293c',r:'50%'}),
  Shape({x:62,y:17,w:5,h:3,color:'#1c293c',r:'50%'}),
  Shape({x:27,y:29,w:46,h:39,color:'#397fbd',r:26,style:{boxShadow:'inset -12px 0 0 #286a9e'}}),
  Shape({x:29,y:64,w:17,h:34,color:'#23344e',r:14,rotate:action==='travel'?walk:0}),
  Shape({x:54,y:64,w:17,h:34,color:'#23344e',r:14,rotate:action==='travel'?-walk:0}),
  Shape({x:18,y:33,w:14,h:32,color:'#e9b18e',r:20,rotate:arm,style:{transformOrigin:'50% 7%'}}),
  Shape({x:68,y:33,w:14,h:32,color:'#e9b18e',r:20,rotate:-arm/2,style:{transformOrigin:'50% 7%'}})
 );
}
function Background({place,frame}){
 const floor=Shape({x:0,y:72,w:100,h:28,color:'#bd9477'});
 if(place==='bedroom')return el(React.Fragment,null,
  Shape({x:0,y:0,w:100,h:72,color:'#b9cfe0'}),
  Shape({x:8,y:18,w:24,h:25,color:'#8bb9df',r:12,style:{border:'14px solid #f5e9d9'}}),
  floor,Shape({x:4,y:66,w:57,h:11,color:'#f6eee5',r:18}),
  Shape({x:7,y:59,w:17,h:10,color:'#fff',r:18}),
  Shape({x:4,y:75,w:5,h:15,color:'#604737'}));
 if(place==='bathroom')return el(React.Fragment,null,
  Shape({x:0,y:0,w:100,h:72,color:'#c4e5e8'}),
  ...Array.from({length:6},(_,i)=>Shape({x:i*18,y:0,w:0.5,h:72,color:'#a2d2d7'})),
  Shape({x:6,y:20,w:32,h:27,color:'#a6cbdc',r:20,style:{border:'12px solid white'}}),
  Shape({x:2,y:60,w:40,h:11,color:'#f7f7f7',r:30}),
  Shape({x:19,y:53,w:6,h:10,color:'#a4adb7',r:8}),
  floor);
 if(place==='supermarket')return el(React.Fragment,null,
  Shape({x:0,y:0,w:100,h:72,color:'#f0dfbf'}),
  ...[5,77].map((x,i)=>Shape({x,y:18,w:19,h:50,color:'#a26c4b',r:5,children:el(React.Fragment,null,...[12,43,73].map((y,j)=>Shape({x:4,y,w:92,h:7,color:'#efc95d',r:4}))) })),
  floor,Shape({x:3,y:75,w:94,h:3,color:'#d4ac88'}));
 if(place==='transport')return el(React.Fragment,null,
  Shape({x:0,y:0,w:100,h:72,color:'#c0dcf2'}),
  Shape({x:5,y:27,w:90,h:43,color:'#f5c15b',r:25}),
  Shape({x:11,y:34,w:72,h:22,color:'#6f9fc0',r:15}),
  floor);
 return el(React.Fragment,null,Shape({x:0,y:0,w:100,h:72,color:'#bcd7e8'}),floor);
}
function Prop({action,frame}){
 const bob=Math.sin(frame/4)*2;
 if(action==='brush')return el(React.Fragment,null,Shape({x:57,y:45+bob,w:2,h:14,color:'#f5f5f5',r:6,rotate:30}),Shape({x:55,y:44+bob,w:6,h:3,color:'#5bc4dd',r:4}));
 if(action==='pick')return el(React.Fragment,null,Shape({x:72-frame/8,y:50+bob,w:9,h:7,color:'#d8443e',r:'50%'}),Shape({x:76-frame/8,y:48+bob,w:4,h:3,color:'#4c954e',r:'70%'}));
 if(action==='checkout')return el(React.Fragment,null,Shape({x:65,y:66,w:33,h:13,color:'#777e89',r:7}),Shape({x:67,y:61,w:15,h:7,color:'#2a405b',r:5}),Shape({x:58+Math.sin(frame/7)*3,y:54,w:12,h:6,color:'#f5d56c',r:5,rotate:15}));
 return null;
}
export function ShortsComposition({script='Ein Mann wacht morgens auf.',narration=false,durationsFrames=null}){
 const plan=makeScenePlan(script,{durationsFrames}),frame=useCurrentFrame();
 const scene=plan.scenes.find(s=>frame>=s.startFrame&&frame<s.endFrame)??plan.scenes.at(-1);
 const local=Math.max(0,frame-scene.startFrame);
 const zoom=interpolate(local,[0,Math.max(1,scene.endFrame-scene.startFrame)],[1,1.055],{extrapolateRight:'clamp'});
 const opacity=interpolate(local,[0,5,Math.max(6,scene.endFrame-scene.startFrame-6),scene.endFrame-scene.startFrame],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 return el(AbsoluteFill,{style:{background:'#14253b',fontFamily:'Arial,sans-serif',overflow:'hidden'}},
  el('div',{style:{position:'absolute',inset:0,transform:`scale(${zoom})`}},
   el(Background,{place:scene.place,frame:local}),
   el(Person,{frame:local,action:scene.action}),
   el(Prop,{action:scene.action,frame:local})),
  narration?plan.scenes.map((s,i)=>el(Sequence,{key:s.id,from:s.startFrame,durationInFrames:s.endFrame-s.startFrame},el(Audio,{src:staticFile(`audio/scene-${i}.mp3`)}))):null,
  el('div',{style:{position:'absolute',top:85,left:65,color:'#fff',fontSize:34,fontWeight:800,letterSpacing:3,textShadow:'0 3px 8px #0009'}},'SHORTS STUDIO'),
  el('div',{style:{position:'absolute',bottom:140,left:45,right:45,opacity,background:'#14253bd9',borderRadius:30,padding:'32px 26px',color:'white',fontSize:49,fontWeight:800,lineHeight:1.25,textAlign:'center',textShadow:'0 2px 8px #0007'}},scene.text)
 );
}
