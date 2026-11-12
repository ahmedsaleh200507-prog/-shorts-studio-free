import {narrationAudio} from './narration-audio.mjs';
import React from 'react';
import {AbsoluteFill, Audio, Sequence, useCurrentFrame, interpolate} from 'remotion';
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
 if(['hospital','school','restaurant','office'].includes(place)){
  const colors={hospital:['#dceef0','#91c6d1'],school:['#f1e2bf','#76a6a3'],restaurant:['#e7cbb4','#b57a57'],office:['#d3e1eb','#6588a4']};
  const [wall,accent]=colors[place];
  return el(React.Fragment,null,
   Shape({x:0,y:0,w:100,h:72,color:wall}),
   Shape({x:6,y:12,w:34,h:28,color:accent,r:9,style:{border:'11px solid #f8f7f0',boxShadow:'0 8px 18px #0002'}}),
   Shape({x:70,y:14,w:21,h:36,color:place==='school'?'#376b58':'#b4d0db',r:6,style:{border:'9px solid #f4f0e8'}}),
   floor,
   Shape({x:7,y:63,w:68,h:7,color:place==='restaurant'?'#81583c':'#dce7e9',r:8}),
   Shape({x:12,y:69,w:4,h:20,color:'#5b6b78'}),
   Shape({x:64,y:69,w:4,h:20,color:'#5b6b78'}),
   place==='hospital'?Shape({x:83,y:22,w:3,h:17,color:'#de5d61',children:Shape({x:-180,y:36,w:460,h:20,color:'#de5d61'})}):null);
 }
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


function StoryObject({action,frame,accent}){
 const progress=Math.min(1,frame/36),ease=1-Math.pow(1-progress,3);
 const base={position:'absolute',left:'15%',top:'18%',width:'70%',height:'60%'};
 if(action==='phone')return el('div',{style:{...base,left:'27%',width:'46%',borderRadius:64,border:'17px solid #26354e',background:'#d9edff',boxShadow:'0 30px 90px #0009',overflow:'hidden'}},
  el('div',{style:{height:'9%',background:'#24354b',margin:'0 auto',width:'37%',borderRadius:'0 0 24px 24px'}}),
  el('div',{style:{padding:'12% 7%',fontSize:37,color:'#20314a',fontWeight:800}},'12:45'),
  el('div',{style:{margin:'5%',padding:'7%',borderRadius:25,background:'#fff',boxShadow:'0 8px 25px #52687a44',transform:`translateY(${(1-ease)*-280}px)`,opacity:ease}},
   el('div',{style:{fontSize:26,color:'#348dba',fontWeight:800}},'● MESSAGE'),
   el('div',{style:{fontSize:28,color:'#26354e',marginTop:14}},'Neue Nachricht')),
  el('div',{style:{position:'absolute',bottom:'4%',left:'35%',width:'30%',height:9,borderRadius:10,background:'#24354b'}}));
 if(action==='door')return el('div',{style:{...base,left:'21%',width:'58%',top:'14%',height:'69%',background:'#b7c4d1',border:'16px solid #263448',borderRadius:10,perspective:900}},
  el('div',{style:{position:'absolute',inset:0,background:'linear-gradient(110deg,#9b613d,#e5ac6b)',border:'12px solid #7e4b2e',transformOrigin:'left center',transform:`rotateY(${-68*ease}deg)`,boxShadow:'15px 15px 45px #0008'}},
   el('div',{style:{position:'absolute',right:'10%',top:'50%',width:26,height:26,background:'#f8d77c',borderRadius:'50%',boxShadow:'0 0 0 8px #9e673b'}})));
 if(action==='clock')return el('div',{style:{...base,top:'22%',left:'18%',width:'64%',height:'36%',aspectRatio:'1',borderRadius:'50%',border:'22px solid #9de9f5',background:'#f0fbff',boxShadow:'0 0 65px #79cbe777'}},
  ...Array.from({length:12},(_,i)=>el('div',{key:i,style:{position:'absolute',left:'49%',top:'7%',width:9,height:24,background:'#30465b',transformOrigin:'center 290px',transform:`rotate(${i*30}deg)`}})),
  el('div',{style:{position:'absolute',left:'49%',top:'50%',height:'31%',width:13,background:'#273b55',borderRadius:12,transformOrigin:'top center',transform:`rotate(${180+frame*0.7}deg)`}}),
  el('div',{style:{position:'absolute',left:'49%',top:'50%',height:'38%',width:8,background:'#ec6265',borderRadius:12,transformOrigin:'top center',transform:`rotate(${180+frame*6}deg)`}}),
  el('div',{style:{position:'absolute',left:'47%',top:'47%',width:28,height:28,borderRadius:'50%',background:'#273b55'}}));
 if(action==='alert')return el('div',{style:{...base,top:'25%',height:'42%',background:'#271a2b',border:'9px solid '+accent,borderRadius:32,boxShadow:`0 0 ${35+Math.sin(frame/3)*20}px ${accent}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}},
  el('div',{style:{fontSize:190,color:accent,transform:`scale(${1+Math.sin(frame/4)*0.09})`}},'⚠'),
  el('div',{style:{fontSize:52,color:'#fff',fontWeight:900,letterSpacing:7}},'ACHTUNG'));
 return null;
}

function CinematicWorld({scene,frame}){
 const t=frame/24,space=scene.action==='space',nature=scene.action==='nature',science=scene.action==='science';
 if(!space&&!nature&&!science)return null;
 const glow=space?'#72b8ff':nature?'#b6f3c1':'#6ce8db';
 const orb=space?'#477fc2':nature?'#f8d78d':'#68d9e8';
 const stars=Array.from({length:space?85:35},(_,i)=>{
  const x=(i*73.79+17)%100,y=(i*41.23+9)%72;
  const size=(i%7===0?5:2)+(i%3);
  return el('div',{key:'particle-'+i,style:{position:'absolute',left:x+'%',top:y+'%',width:size,height:size,borderRadius:'50%',background:i%5===0?glow:'#ffffff',opacity:.2+(i%6)*.12,boxShadow:i%9===0?'0 0 15px '+glow:'none',transform:`translateY(${Math.sin(t*.7+i)*5}px)`}})
 });
 const mountain=(x,y,w,h,c)=>el('div',{style:{position:'absolute',left:x+'%',top:y+'%',width:w+'%',height:h+'%',background:c,clipPath:'polygon(0 100%,45% 0,100% 100%)'}});
 return el('div',{style:{position:'absolute',inset:0,overflow:'hidden',background:space?'radial-gradient(ellipse at 60% 40%,#243a73 0%,#0b1639 46%,#030613 90%)':nature?'linear-gradient(180deg,#0c2836 0%,#365d68 48%,#102b35 100%)':'radial-gradient(circle at 50% 43%,#154b5a,#06141f 75%)'}},
  ...stars,
  space?el('div',{style:{position:'absolute',left:'16%',top:'20%',width:'68%',aspectRatio:'1',borderRadius:'50%',background:'radial-gradient(circle at 32% 25%,#a7e9fc,#407bc1 34%,#164374 69%,#061b38 100%)',boxShadow:'-30px -25px 95px #6ca9fa80,35px 35px 80px #000c',transform:`translateY(${Math.sin(t*.8)*14}px) rotate(${t*1.6}deg)`}},
   ...Array.from({length:6},(_,i)=>el('div',{key:i,style:{position:'absolute',left:(12+i*13)+'%',top:(23+(i*17)%43)+'%',width:(13+i%3*8)+'%',height:(8+i%2*9)+'%',borderRadius:'60% 40% 70% 30%',background:'#79c6ad',opacity:.7,transform:`rotate(${i*47}deg)`}}))):null,
  nature?el(React.Fragment,null,
    el('div',{style:{position:'absolute',left:'65%',top:'17%',width:'18%',aspectRatio:'1',borderRadius:'50%',background:'#ffdb9b',boxShadow:'0 0 100px 55px #e6b98060'}}),
    mountain(-15,43,78,41,'#4c6f76'),mountain(24,38,100,47,'#2c5360'),mountain(-25,60,95,38,'#183e45'),mountain(45,61,95,39,'#102f39'),
    ...Array.from({length:12},(_,i)=>el('div',{key:'tree'+i,style:{position:'absolute',left:(i*9-4)+'%',bottom:(i%4*2+10)+'%',width:0,height:0,borderLeft:'35px solid transparent',borderRight:'35px solid transparent',borderBottom:(120+i%3*30)+'px solid #0c292d',filter:'drop-shadow(0 8px 7px #0006)'}}))):null,
  science?el(React.Fragment,null,
    ...Array.from({length:3},(_,i)=>el('div',{key:'orbit'+i,style:{position:'absolute',left:'15%',top:'27%',width:'70%',height:'35%',border:'5px solid #6ce8db99',borderRadius:'50%',transform:`rotate(${i*60+t*13}deg)`,boxShadow:'0 0 30px #6ce8db35'}})),
    el('div',{style:{position:'absolute',left:'43%',top:'39%',width:'14%',aspectRatio:'1',borderRadius:'50%',background:'#9ef9e6',boxShadow:'0 0 70px 30px #6ce8db80'}})):null,
  el('div',{style:{position:'absolute',inset:0,background:'linear-gradient(180deg,#0000 0%,#0000 55%,#030b1caa 95%)'}})
 );
}

function MotionGraphic({scene,frame}){
 const t=frame/24, pulse=1+0.035*Math.sin(t*5), slide=Math.min(0, -90+frame*12);
 const title=(scene.keywords||[]).slice(0,3).join(' ').toUpperCase() || scene.action.toUpperCase();
 const palette={alert:['#190e1d','#ff4c6a'],phone:['#10182e','#73dcff'],door:['#161b30','#e6b66d'],clock:['#0c1d2a','#75e8f3'],space:['#080f27','#b6a5ff'],science:['#0b2530','#62e5b4'],nature:['#112a2a','#94d68e'],technology:['#0e1732','#65c9f5'],number:['#14152a','#e6cf70'],talk:['#121c35','#8fe9d9']};
 const [bg,accent]=palette[scene.action]||palette.talk;
 const panel={position:'absolute',left:'9%',right:'9%',top:'25%',height:'41%',border:'5px solid '+accent,borderRadius:38,boxShadow:'0 0 75px '+accent+'45',background:'#101727',display:'flex',justifyContent:'center',alignItems:'center',flexDirection:'column',transform:`translateY(${slide}px) scale(${pulse})`};
 const label=scene.action==='alert'?'⚠':scene.action==='phone'?'▣':scene.action==='clock'?'◷':scene.action==='door'?'▯':scene.action==='space'?'✦':scene.action==='science'?'◎':scene.action==='nature'?'❋':scene.action==='technology'?'⌘':scene.action==='number'?'%':'●';
 const dots=Array.from({length:22},(_,i)=>el('div',{key:i,style:{position:'absolute',left:(i*43%100)+'%',top:((i*29+frame*(i%2?0.12:-0.1))%100+100)%100+'%',width:3+i%4*2,height:3+i%4*2,borderRadius:'50%',background:accent,opacity:0.15+(i%4)*0.12}}));
 return el('div',{style:{position:'absolute',inset:0,background:`radial-gradient(circle at 50% 42%,${accent}24,${bg} 70%)`,overflow:'hidden'}},
 ...dots,
 el(CinematicWorld,{scene,frame}),
 ['phone','door','clock','alert'].includes(scene.action)?el(StoryObject,{action:scene.action,frame,accent}):['space','nature','science'].includes(scene.action)?null:el('div',{style:panel},
  el('div',{style:{fontSize:145,color:accent,fontWeight:900,lineHeight:1}},label),
  el('div',{style:{fontSize:50,color:'#fff',fontWeight:900,textAlign:'center',maxWidth:'90%',overflowWrap:'anywhere',letterSpacing:2}},title)),
 el('div',{style:{position:'absolute',left:'12%',right:'12%',top:'72%',height:7,borderRadius:10,background:'#ffffff24'}},
  el('div',{style:{width:Math.min(100,frame/Math.max(1,scene.endFrame-scene.startFrame)*100)+'%',height:'100%',background:accent,borderRadius:10}})));
}
export function ShortsComposition({script='Ein Mann wacht morgens auf.',narration=false,durationsFrames=null}){
 const plan=makeScenePlan(script,{durationsFrames}),frame=useCurrentFrame();
 const scene=plan.scenes.find(s=>frame>=s.startFrame&&frame<s.endFrame)??plan.scenes.at(-1);
 const local=Math.max(0,frame-scene.startFrame);
 const zoom=interpolate(local,[0,Math.max(1,scene.endFrame-scene.startFrame)],[1,1.055],{extrapolateRight:'clamp'});
 const opacity=interpolate(local,[0,5,Math.max(6,scene.endFrame-scene.startFrame-6),scene.endFrame-scene.startFrame],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 return el(AbsoluteFill,{style:{background:'#14253b',fontFamily:'Arial,sans-serif',overflow:'hidden'}},
  el('div',{style:{position:'absolute',inset:0,transform:`scale(${zoom})`}},
   scene.visualMode==='character'?el(React.Fragment,null,
    el(Background,{place:scene.place,frame:local}),
    el(Person,{frame:local,action:scene.action}),
    el(Prop,{action:scene.action,frame:local})):el(MotionGraphic,{scene,frame:local})),
  narration?plan.scenes.map((s,i)=>el(Sequence,{key:s.id,from:s.startFrame,durationInFrames:s.endFrame-s.startFrame},el(Audio,{src:narrationAudio[i]}))):null,
  el('div',{style:{position:'absolute',top:85,left:65,color:'#fff',fontSize:34,fontWeight:800,letterSpacing:3,textShadow:'0 3px 8px #0009'}},'SHORTS STUDIO'),
  el('div',{style:{position:'absolute',bottom:140,left:45,right:45,opacity,background:'#14253bd9',borderRadius:30,padding:'32px 26px',color:'white',fontSize:49,fontWeight:800,lineHeight:1.25,textAlign:'center',textShadow:'0 2px 8px #0007'}},scene.text)
 );
}
