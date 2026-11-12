import {narrationTimings} from './narration-timings.mjs';
import {captionAt} from './rig-motion.mjs';
import {VectorStoryScene} from './vector-scene.mjs';
import {cameraMotion} from './visual-motion.mjs';
import {narrationAudio} from './narration-audio.mjs';
import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, useCurrentFrame, interpolate} from 'remotion';
import {makeScenePlan} from './scene-plan.mjs';
import {aiSceneImages} from './ai-scene-images.mjs';
import {staticFile} from 'remotion';

const el=React.createElement;
const pct=(n)=>n+'%';
function Shape({x,y,w,h,color,r=0,rotate=0,children,style={}}){
 return el('div',{style:{position:'absolute',left:pct(x),top:pct(y),width:pct(w),height:pct(h),background:color,borderRadius:r,transform:`rotate(${rotate}deg)`,...style}},children);
}



function StoryObject({action,frame,accent,text=''}){
 const progress=Math.min(1,frame/36),ease=1-Math.pow(1-progress,3);
 const base={position:'absolute',left:'15%',top:'18%',width:'70%',height:'60%'};
 if(action==='phone')return el('div',{style:{...base,left:'27%',width:'46%',borderRadius:64,border:'17px solid #26354e',background:'#d9edff',boxShadow:'0 30px 90px #0009',overflow:'hidden'}},
  el('div',{style:{height:'9%',background:'#24354b',margin:'0 auto',width:'37%',borderRadius:'0 0 24px 24px'}}),
  el('div',{style:{padding:'12% 7%',fontSize:37,color:'#20314a',fontWeight:800}},'12:45'),
  el('div',{style:{margin:'5%',padding:'7%',borderRadius:25,background:'#fff',boxShadow:'0 8px 25px #52687a44',transform:`translateY(${(1-ease)*-280}px)`,opacity:ease}},
   el('div',{style:{fontSize:26,color:'#348dba',fontWeight:800}},'● MESSAGE'),
   el('div',{style:{fontSize:28,color:'#26354e',marginTop:14}},text.slice(0,90)||'Neue Nachricht')),
  el('div',{style:{position:'absolute',bottom:'4%',left:'35%',width:'30%',height:9,borderRadius:10,background:'#24354b'}}));
 if(action==='door')return el('div',{style:{...base,left:'21%',width:'58%',top:'14%',height:'69%',background:'#b7c4d1',border:'16px solid #263448',borderRadius:10}},
  el('div',{style:{position:'absolute',inset:0,background:'linear-gradient(110deg,#9b613d,#e5ac6b)',border:'12px solid #7e4b2e',transformOrigin:'left center',transform:`scaleX(${1-.79*ease}) skewY(${4*ease}deg)`,boxShadow:'15px 15px 45px #0008'}},
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
  space?el('div',{style:{position:'absolute',left:'16%',top:'20%',width:'68%',aspectRatio:'1',borderRadius:'50%',background:'#477fb7',border:'7px solid #8ec5d8',transform:`translateY(${Math.sin(t*.8)*14}px) rotate(${t*1.6}deg)`}},
   ...Array.from({length:6},(_,i)=>el('div',{key:i,style:{position:'absolute',left:(12+i*13)+'%',top:(23+(i*17)%43)+'%',width:(13+i%3*8)+'%',height:(8+i%2*9)+'%',borderRadius:'60% 40% 70% 30%',background:'#79c6ad',opacity:.7,transform:`rotate(${i*47}deg)`}}))):null,
  nature?el(React.Fragment,null,
    el('div',{style:{position:'absolute',left:'65%',top:'17%',width:'18%',aspectRatio:'1',borderRadius:'50%',background:'#ffdb9b',boxShadow:'0 0 100px 55px #e6b98060'}}),
    mountain(-15,43,78,41,'#4c6f76'),mountain(24,38,100,47,'#2c5360'),mountain(-25,60,95,38,'#183e45'),mountain(45,61,95,39,'#102f39'),
    ...Array.from({length:12},(_,i)=>el('div',{key:'tree'+i,style:{position:'absolute',left:(i*9-4)+'%',bottom:(i%4*2+10)+'%',width:0,height:0,borderLeft:'35px solid transparent',borderRight:'35px solid transparent',borderBottom:(120+i%3*30)+'px solid #0c292d',filter:'drop-shadow(0 8px 7px #0006)'}}))):null,
  science?el(React.Fragment,null,
    el('svg',{viewBox:'0 0 720 600',style:{position:'absolute',left:'15%',top:'24%',width:'70%',height:'45%',opacity:.72}},
      el('path',{d:'M60 65 V510 H670',stroke:'#b4e4dc',strokeWidth:4,fill:'none'}),
      ...[140,200,260,310,385].map((h,i)=>el('rect',{key:i,x:100+i*110,y:510-h*Math.min(1,frame/(20+i*5)),width:56,height:h*Math.min(1,frame/(20+i*5)),fill:i%2?'#8bd6be':'#5dabb4',rx:5}))),
    ...Array.from({length:3},(_,i)=>el('div',{key:'orbit'+i,style:{position:'absolute',left:'15%',top:'27%',width:'70%',height:'35%',border:'3px solid #6ce8db55',borderRadius:'50%',transform:`rotate(${i*60+t*13}deg)`,boxShadow:'0 0 30px #6ce8db35'}})),
    el('div',{style:{position:'absolute',left:'43%',top:'39%',width:'14%',aspectRatio:'1',borderRadius:'50%',background:'#9ef9e6',boxShadow:'0 0 70px 30px #6ce8db80'}})):null,
  el('div',{style:{position:'absolute',inset:0,background:'linear-gradient(180deg,#0000 0%,#0000 55%,#030b1caa 95%)'}})
 );
}


function DocumentaryScene({scene,frame}){
 if(!['map','history'].includes(scene.action))return null;
 const map=scene.action==='map',t=frame/24;
 const paper=map?'#172c35':'#d5c5a8',ink=map?'#9dd8d2':'#423a32';
 const line=(x,y,w,angle=0)=>el('div',{style:{position:'absolute',left:x+'%',top:y+'%',width:w+'%',height:3,background:ink,opacity:.35,transform:`rotate(${angle}deg)`}});
 return el('div',{style:{position:'absolute',inset:0,overflow:'hidden',background:map?'radial-gradient(circle at 50% 43%,#234951,#081821 82%)':'radial-gradient(circle at 48% 43%,#d9c6a4,#584c3c 90%)'}},
  ...Array.from({length:16},(_,i)=>el('div',{key:i,style:{position:'absolute',left:((i*43)%110-5)+'%',top:((i*29)%100)+'%',width:'75%',height:1,background:ink,opacity:.08,transform:`rotate(${i%2?19:-17}deg)`}})),
  map?el(React.Fragment,null,
    ...Array.from({length:5},(_,i)=>el('div',{key:'land'+i,style:{position:'absolute',left:(i*19-10)+'%',top:(20+(i*13)%29)+'%',width:(27+i%3*8)+'%',height:(20+i%2*14)+'%',background:i%2?'#355c5b':'#48706b',clipPath:'polygon(7% 17%,42% 0,80% 19%,100% 51%,71% 93%,26% 100%,0 64%)',transform:`rotate(${i*31}deg)`,border:'2px solid #80b1a6'}})),
    el('svg',{viewBox:'0 0 1080 1920',style:{position:'absolute',inset:0,width:'100%',height:'100%'}},
      el('path',{d:'M 140 1080 Q 280 480 570 850 T 930 490',stroke:'#f0bd6a',strokeWidth:12,strokeDasharray:'28 16',fill:'none',strokeDashoffset:-frame*5}),
      ...[[140,1080],[570,850],[930,490]].map(([x,y],i)=>el('circle',{key:i,cx:x,cy:y,r:18+i*3,fill:'#f4c77b',stroke:'#102b30',strokeWidth:8}))),
    el('div',{style:{position:'absolute',top:'12%',left:'9%',color:'#e4ece4',fontSize:46,fontWeight:900,letterSpacing:7}},'ATLAS / ROUTE'))
  :el(React.Fragment,null,
    ...Array.from({length:4},(_,i)=>el('div',{key:'paper'+i,style:{position:'absolute',left:(8+i*6)+'%',top:(19+i*9)+'%',width:'72%',height:'42%',background:i%2?'#e4d8c1':'#f0e3c9',border:'2px solid #756c5c',boxShadow:'12px 18px 30px #23190e80',transform:`rotate(${-9+i*5}deg) translateY(${Math.sin(t+i)*8}px)`}},
      el('div',{style:{margin:'9% 8% 4%',height:12,background:'#3b352e',opacity:.7}}),
      ...Array.from({length:7},(_,j)=>el('div',{key:j,style:{margin:'5% 8%',height:4,background:'#5b5145',opacity:.3,width:(60+j%3*10)+'%'}})),
      el('div',{style:{margin:'6% 8%',height:'22%',background:'linear-gradient(135deg,#655d51,#b8a58a)',filter:'grayscale(1)'}}))),
    el('div',{style:{position:'absolute',top:'11%',left:'9%',color:'#302820',fontSize:51,fontWeight:900,letterSpacing:6,textShadow:'0 2px 3px #f5e9d3'}},'ARCHIVE / HISTORY')) ,
  el('div',{style:{position:'absolute',left:'7%',right:'7%',bottom:'23%',height:4,background:map?'#8fc9c7':'#3d3328',opacity:.7}}),
  el('div',{style:{position:'absolute',left:'7%',bottom:'23%',height:4,width:Math.min(86,frame/72*86)+'%',background:'#d85c55'}})
 );
}


function EditorialGraphic({scene,frame}){
 if(!['talk','number','technology'].includes(scene.action))return null;
 const t=frame/24,words=(scene.text.match(/[\p{L}\p{N}%€]+/gu)||[]).filter(w=>w.length>2);
 const chosen=words.slice(0,5).join(' ').toUpperCase();
 const tech=scene.action==='technology',number=scene.action==='number';
 const accent=tech?'#75d9ff':number?'#f6cf77':'#ff6c71';
 const values=(scene.text.match(/\d+(?:[.,]\d+)?\s*(?:%|€|km|million|milliard)?/gi)||[]);
 return el('div',{style:{position:'absolute',inset:0,overflow:'hidden',background:tech?'radial-gradient(circle at 50% 42%,#183956,#050e1f 80%)':number?'radial-gradient(circle at 48% 50%,#4b3b29,#11121d 85%)':'radial-gradient(circle at 48% 44%,#39273b,#0c111f 85%)'}},
  ...Array.from({length:14},(_,i)=>el('div',{key:i,style:{position:'absolute',left:((i*37)%105)+'%',top:((i*23)%83)+'%',width:tech?2:120,height:tech?100:2,background:accent,opacity:.08+(i%4)*.04,transform:`rotate(${tech?0:-22}deg) translateY(${Math.sin(t+i)*12}px)`}})),
  tech?el(React.Fragment,null,
   ...Array.from({length:7},(_,i)=>el('div',{key:'node'+i,style:{position:'absolute',left:(9+i*13)+'%',top:(26+(i*19)%35)+'%',width:20+i%3*9,height:20+i%3*9,borderRadius:'50%',background:accent,boxShadow:'0 0 30px '+accent,transform:`scale(${1+Math.sin(t*3+i)*.3})`}})),
   el('div',{style:{position:'absolute',left:'12%',top:'27%',width:'76%',height:'37%',border:'3px solid #74b6d755',borderRadius:22,transform:`translateX(${Math.sin(t*.8)*10}px)`,boxShadow:'0 0 80px #65bde733'}})):null,
  number?el('div',{style:{position:'absolute',left:'10%',right:'10%',top:'27%',color:accent,fontSize:values.length?180:95,fontWeight:900,textAlign:'center',textShadow:'0 0 75px '+accent+'88',transform:`scale(${.8+Math.min(1,frame/18)*.2})`}},values[0]||'100%'):null,
  el('div',{style:{position:'absolute',left:'9%',right:'9%',top:number?'57%':'37%',fontSize:number?50:74,fontWeight:900,lineHeight:1.12,color:'#f7f3ee',letterSpacing:1,textAlign:'left',overflowWrap:'anywhere',textShadow:'0 6px 24px #000a',transform:`translateX(${Math.max(0,1-frame/18)*-180}px)`,opacity:Math.min(1,frame/13)}},chosen),
  el('div',{style:{position:'absolute',left:'9%',top:'19%',width:'20%',height:7,background:accent,transform:`scaleX(${Math.min(1,frame/20)})`,transformOrigin:'left'}}),
  el('div',{style:{position:'absolute',right:'9%',top:'17%',fontSize:28,color:accent,letterSpacing:5,fontWeight:900}},tech?'DIGITAL / 01':number?'DATA / 01':'STORY / 01')
 );
}

// Shared timeline, separate visual engines: illustrated AI stills and deterministic 2D animation.
function AiIllustration({image,sceneIndex,progress}){
 const zoom=1.035+0.075*(sceneIndex%2===0?progress:1-progress);
 const dx=(sceneIndex%3-1)*3.2*(2*progress-1);
 const dy=(sceneIndex%2===0?1:-1)*2.5*(2*progress-1);
 return el('div',{style:{position:'absolute',inset:0,overflow:'hidden',background:'#0a1529'}},
  el(Img,{src:staticFile(image.startsWith('/')?image.slice(1):image),style:{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',transform:`translate(${dx}%,${dy}%) scale(${zoom})`,filter:'saturate(1.12) contrast(1.06)'}}),
  el('div',{style:{position:'absolute',inset:0,pointerEvents:'none',background:'linear-gradient(180deg,#07102144 0%,transparent 35%,#08122288 100%)'}}));
}
function VectorScene({scene,frame,registry,landscape,speaking,viseme}){
 const actions=(scene.beats||[]).map(b=>b.action);
 const narrative=scene.visualMode==='character'||scene.characterIds?.length>0;
 return narrative?el(VectorStoryScene,{scene,frame,registry,landscape,speaking,viseme}):el(MotionGraphic,{scene,frame});
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
 el(DocumentaryScene,{scene,frame}),
 el(EditorialGraphic,{scene,frame}),
 ['phone','door','clock','alert'].includes(scene.action)?el(StoryObject,{action:scene.action,frame,accent,text:scene.text}):['space','nature','science','map','history','talk','number','technology'].includes(scene.action)?null:el('div',{style:panel},
  el('div',{style:{fontSize:145,color:accent,fontWeight:900,lineHeight:1}},label),
  el('div',{style:{fontSize:50,color:'#fff',fontWeight:900,textAlign:'center',maxWidth:'90%',overflowWrap:'anywhere',letterSpacing:2}},title)),
 el('div',{style:{position:'absolute',left:'12%',right:'12%',top:'72%',height:7,borderRadius:10,background:'#ffffff24'}},
  el('div',{style:{width:Math.min(100,frame/Math.max(1,scene.endFrame-scene.startFrame)*100)+'%',height:'100%',background:accent,borderRadius:10}})));
}
export function ShortsComposition({script='Ein Mann wacht morgens auf.',narration=false,durationsFrames=null,aspectRatio='9:16'}){
 const plan=makeScenePlan(script,{durationsFrames,aspectRatio}),frame=useCurrentFrame();
 const landscape=aspectRatio==='16:9';
 const scene=plan.scenes.find(s=>frame>=s.startFrame&&frame<s.endFrame)??plan.scenes.at(-1);
 const local=Math.max(0,frame-scene.startFrame),sceneIndex=plan.scenes.indexOf(scene);
 const aiImage=aiSceneImages[sceneIndex],duration=Math.max(1,scene.endFrame-scene.startFrame),progress=Math.min(1,local/duration);
 const motion=cameraMotion(sceneIndex,local,duration,'vector');
 const timing=narrationTimings[sceneIndex],seconds=local/plan.fps;
 const caption=captionAt(scene.text,seconds,duration/plan.fps,timing,{maxChars:landscape?70:40,maxWords:landscape?10:6});
 const mouthCue=timing?.mouthCues?.find(c=>seconds>=c.start&&seconds<c.end);
 const activeWord=timing?.words?.some(w=>seconds>=w.start&&seconds<w.end);
 const speaking=Boolean(narration&&(mouthCue?mouthCue.value!=='X':activeWord));
 const opacity=interpolate(local,[0,5,Math.max(6,duration-6),duration],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 return el(AbsoluteFill,{style:{background:'#14253b',fontFamily:'Arial,sans-serif',overflow:'hidden'}},
  aiImage?el(AiIllustration,{image:aiImage,sceneIndex,progress}):el('div',{style:{position:'absolute',inset:0,transform:`scale(${motion.scale}) translate(${motion.x}%,${motion.y}%)`}},el(VectorScene,{scene,frame:local,registry:plan.registry,landscape,speaking,viseme:mouthCue?.value})),
  narration?plan.scenes.map((s,i)=>el(Sequence,{key:s.id,from:s.startFrame,durationInFrames:s.endFrame-s.startFrame},el(Audio,{src:narrationAudio[i]?.startsWith('data:')?narrationAudio[i]:staticFile(String(narrationAudio[i]||'').replace(/^\//,''))}))):null,
  el('div',{style:{position:'absolute',top:landscape?30:64,left:landscape?65:48,color:'#fff',fontSize:landscape?23:27,fontWeight:800,letterSpacing:3,textShadow:'0 3px 8px #0009'}},'SHORTS STUDIO'),
  aiImage?el('div',{style:{position:'absolute',top:landscape?65:105,left:landscape?65:48,color:'#f4e6bd',fontSize:landscape?18:22,fontWeight:600,textShadow:'0 2px 4px #000'}},'AI ILLUSTRATION · 2D CAMERA MOTION'):null,
  el('div',{'data-caption-source':caption.source,style:{position:'absolute',bottom:landscape?48:135,left:landscape?'15%':50,right:landscape?'15%':50,opacity,background:'#14253bed',borderRadius:landscape?18:26,padding:landscape?'17px 24px':'25px 24px',color:'white',fontSize:landscape?36:48,fontWeight:800,lineHeight:1.3,textAlign:'center',overflowWrap:'anywhere',textShadow:'0 2px 8px #0007'}},
   ...caption.words.map((w,i)=>el('span',{key:w.index,style:{color:w.index===caption.active?'#ffdf84':'#fff',background:w.index===caption.active?'#ffffff15':'transparent',borderRadius:6,padding:'0 2px'}},w.text,i<caption.words.length-1?' ':'')))
 );
}
