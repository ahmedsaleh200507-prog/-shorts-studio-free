import React from 'react';
import {rigPose,limbJoint} from './rig-motion.mjs';
const e=React.createElement;
const s=(tag,props,...children)=>e(tag,props,...children);
const rect=(x,y,width,height,fill,extra={})=>s('rect',{x,y,width,height,fill,rx:8,...extra});
const circle=(cx,cy,r,fill,extra={})=>s('circle',{cx,cy,r,fill,...extra});
const line=(x1,y1,x2,y2,stroke,width=5,extra={})=>s('line',{x1,y1,x2,y2,stroke,strokeWidth:width,strokeLinecap:'round',...extra});
function Arm({root,hand,bend,shirt,skin}){
 const elbow=limbJoint(root,hand,53,53,bend);
 return s('g',null,line(root.x,root.y,elbow.x,elbow.y,'#24364b',30),line(elbow.x,elbow.y,hand.x,hand.y,'#24364b',24),line(root.x,root.y,elbow.x,elbow.y,shirt,24),line(elbow.x,elbow.y,hand.x,hand.y,skin,18),circle(hand.x,hand.y,11,skin),line(hand.x-3,hand.y+3,hand.x+4,hand.y-2,'#ad765e',1.5));
}
function Leg({hip,foot,bend=1}){
 const knee=limbJoint(hip,foot,49,51,bend);
 return s('g',null,line(hip.x,hip.y,knee.x,knee.y,'#263d59',29),line(knee.x,knee.y,foot.x,foot.y,'#263d59',24),rect(foot.x-12,foot.y-3,34,13,'#192737',{rx:6}),line(foot.x-10,foot.y+11,foot.x+20,foot.y+11,'#f5f1df',3));
}
function Character({scene,frame,profile={},speaking,viseme,secondary=false}){
 const p=rigPose(scene,frame,{speaking,viseme}),skin=profile.skin||'#eac09a',shirt=profile.shirt||profile.clothing||'#4286a0',hair=profile.hair||'#29384a',female=profile.gender==='female';
 const emotion=scene.emotion||'neutral';
 return s('g',{transform:`translate(${p.x} ${p.y})`,opacity:p.opacity,'data-action':p.action},
  s('ellipse',{cx:153,cy:410,rx:80,ry:10,fill:'#153241',opacity:.13}),
  p.action==='sit'?rect(88,301,131,17,'#be7848'):null,
  s(Leg,{hip:{x:132,y:294},foot:p.leftFoot,bend:1}),s(Leg,{hip:{x:174,y:294},foot:p.rightFoot,bend:-1}),
  s(Arm,{root:{x:116,y:184},hand:p.left,bend:1,shirt,skin}),
  s('path',{d:'M118 168 Q150 158 181 169 Q197 213 190 293 Q151 311 111 293 Q106 225 118 168',fill:shirt,stroke:'#24364b',strokeWidth:4}),
  s('path',{d:'M133 170 Q151 187 169 169',fill:'none',stroke:'#ffffff',opacity:.5,strokeWidth:3}),
  rect(140,142,23,31,skin,{rx:7}),
  s(Arm,{root:{x:181,y:184},hand:p.right,bend:-1,shirt,skin}),
  s('g',{transform:`rotate(${p.head} 151 112)`},
   female?s('path',{d:'M98 136 Q76 35 145 29 Q220 20 207 155 L186 176 L106 173 Z',fill:hair}):null,
   s('ellipse',{cx:151,cy:104,rx:47,ry:57,fill:skin,stroke:'#b47f64',strokeWidth:2.5}),
   s('path',{d:female?'M106 99 Q99 30 151 35 Q208 33 200 105 L183 82 Q143 89 130 67 Z':'M105 99 Q92 44 139 38 Q202 23 202 92 L187 100 L178 70 Q146 90 119 79 Z',fill:hair}),
   line(120,102,136,emotion==='sad'?98:100,'#37404b',2.5),line(167,100,184,emotion==='surprised'?94:102,'#37404b',2.5),
   p.blink?line(126,112,134,112,'#29384a',2.5):s('ellipse',{cx:130,cy:111,rx:3.2,ry:4.2,fill:'#29384a'}),
   p.blink?line(172,112,180,112,'#29384a',2.5):s('ellipse',{cx:176,cy:111,rx:3.2,ry:4.2,fill:'#29384a'}),
   s('path',{d:'M150 113 L146 128 L154 130',stroke:'#ba866b',strokeWidth:2,fill:'none'}),
   speaking&&p.mouth>2?s('ellipse',{cx:152,cy:141,rx:7,ry:p.mouth,fill:'#703e43'}):s('path',{d:emotion==='sad'?'M140 144 Q151 135 164 144':'M140 139 Q152 148 164 139',stroke:'#9b5e53',strokeWidth:2.5,fill:'none',strokeLinecap:'round'})),
  p.phone?s('g',{transform:`translate(${p.right.x-6} ${p.right.y-32}) rotate(-9)`},rect(-10,-17,29,53,'#22364b',{rx:5}),rect(-6,-11,21,39,'#a8dce2',{rx:2}),line(-1,-13,8,-13,'#d8f6f3',2),p.action==='type'?rect(-3,12,15,7,'#f3f7ef',{rx:1}):null):null,
  p.action==='notify'?s('g',{transform:`translate(${p.right.x+13} ${p.right.y-73+Math.sin(frame*.4)*2})`},rect(-7,-23,75,35,'#fff7e5',{rx:8,stroke:'#397b8c',strokeWidth:2}),circle(5,-5,4,'#efa65d'),line(17,-9,54,-9,'#618b98',3),line(17,0,43,0,'#a1bdc4',3),s('path',{d:'M-10 -25 Q-21 -16 -13 -6 M72 -23 Q85 -15 76 -4',fill:'none',stroke:'#e4a74e',strokeWidth:3,opacity:(Math.sin(frame*.6)+1)/2})):null,
  ['pick','carry','hold','release','give'].includes(p.action)&&!p.phone?s('g',{transform:`translate(${p.right.x} ${p.right.y-6+(p.action==='release'?p.beat.progress*30:0)})`,opacity:p.action==='release'?1-p.beat.progress*.4:1},
   p.objectKind==='apple'?s('g',null,circle(0,0,14,'#db6455'),s('path',{d:'M0 -13 Q2 -24 12 -18',stroke:'#477c53',strokeWidth:4,fill:'none'})):p.objectKind==='book'?s('g',null,rect(-14,-18,30,39,'#d69c68',{rx:2}),line(-9,-18,-9,18,'#f3d2a1',3)):rect(-16,-15,32,29,'#d4b483',{rx:3,stroke:'#a78d69',strokeWidth:2})):null,
  p.action==='present'||p.action==='point'?s('g',null,line(p.right.x,p.right.y,p.right.x+12,p.right.y-6,skin,7)):null,
  p.action==='drive'?s('g',null,circle(222,233,31,'none',{stroke:'#314957',strokeWidth:7}),line(222,233,197,215,'#314957',5),line(222,233,246,214,'#314957',5),line(222,233,222,263,'#314957',5)):null,
  p.action==='checkout'?rect(p.left.x-14,p.left.y-10,31,19,'#f0c775',{rx:3}):null,
  p.action==='brush'?s('g',null,line(p.left.x,p.left.y,p.left.x-18,p.left.y-12,'#f4f3e7',5),rect(p.left.x-22,p.left.y-18,14,7,'#4dabad',{rx:2})):null
 );
}
function Room({place,frame,width,height}){
 const floor=height*.70,w=width;
 const wall={hospital:'#e4f1ed',school:'#f2e8ce',supermarket:'#f1e7ce',bathroom:'#dbeeea',bedroom:'#dce6ed',office:'#e1ebec',nature:'#c9e3d6',restaurant:'#ead8c7',generic:'#e4eaf0',home:'#e4eaf0'}[place]||'#e4eaf0';
 const outdoor=['nature','forest','street'].includes(place);
 const window=(x,y,ww,hh)=>s('g',null,rect(x,y,ww,hh,'#f8f3e7',{stroke:'#b8c4bc',strokeWidth:3}),rect(x+9,y+9,ww-18,hh-18,'#acd2d8'),line(x+ww/2,y+9,x+ww/2,y+hh-9,'#f8f3e7',7),line(x+9,y+hh/2,x+ww-9,y+hh/2,'#f8f3e7',7));
 const plant=(x,y)=>s('g',null,rect(x-17,y,34,40,'#c88f6d',{rx:4}),line(x,y,x,y-70,'#548773',5),...[-1,1].map((side,i)=>s('ellipse',{key:i,cx:x+side*17,cy:y-40-i*12,rx:12,ry:29,fill:i?'#578872':'#6c9c7b',transform:`rotate(${side*34} ${x+side*17} ${y-40-i*12})`})));
 return s('g',null,rect(0,0,w,height,wall,{rx:0}),rect(0,floor,w,height-floor,'#c8b69a',{rx:0}),line(0,floor,w,floor,'#fff7e6',10),
  outdoor?s('g',null,circle(w*.8,height*.19,42,'#f5d78b'),...Array.from({length:7},(_,i)=>s('g',{key:i,transform:`translate(${i*w/6} ${floor-150})`},rect(-10,-30,20,190,'#8a9270'),circle(0,-65,65,i%2?'#72a58e':'#91b59c')))):
  s('g',null,window(w*.08,height*.2,w*.25,height*.24),rect(w*.08,height*.2+height*.24+8,w*.27,10,'#c8b9a0'),plant(w*.89,floor-37)),
  place==='transport'?s('g',null,rect(w*.03,floor-300,w*.94,290,'#e7b76e',{rx:30}),rect(w*.06,floor-275,w*.88,165,'#b8d5d7',{rx:13}),...Array.from({length:6},(_,i)=>rect((i*w*.2+frame*4)%(w*1.2)-w*.1,floor-215,45,80,'#93b5a9')),line(w*.05,floor-100,w*.96,floor-100,'#e7b76e',24),circle(w*.2,floor+5,42,'#3d505a'),circle(w*.82,floor+5,42,'#3d505a')):null,
  place==='supermarket'?s('g',null,...[.04,.74].map((x,i)=>s('g',{key:i},rect(w*x,floor-320,w*.22,310,'#d3b18b'),...[0,1,2].map(j=>s('g',{key:j},rect(w*x-5,floor-235+j*90,w*.23,11,'#9f846c'),...Array.from({length:4},(_,k)=>rect(w*x+12+k*w*.046,floor-285+j*90,w*.03,48,['#d47b67','#e9be62','#83a28b','#8fb2c2'][k],{rx:4}))))))):null,
  place==='hospital'?s('g',null,rect(w*.65,floor-260,w*.24,150,'#f7faf4',{stroke:'#86aba8',strokeWidth:4}),rect(w*.67,floor-242,w*.20,94,'#244e58'),s('path',{d:`M${w*.68} ${floor-200} h20 l12 -25 l12 42 l13 -32 l10 15 h32`,stroke:'#8ce0be',strokeWidth:3,fill:'none',strokeDasharray:'180',strokeDashoffset:-frame*3}),rect(w*.77,floor-105,13,108,'#9ab3ae'),rect(w*.68,floor-320,45,10,'#d47370'),rect(w*.68+17,floor-337,10,45,'#d47370')):null,
  place==='school'?s('g',null,rect(w*.45,floor-340,w*.42,210,'#497969',{stroke:'#a99269',strokeWidth:12}),s('text',{x:w*.49,y:floor-280,fill:'#eef2d6',fontFamily:'sans-serif',fontSize:28},'a² + b² = c²'),line(w*.49,floor-240,w*.77,floor-240,'#b9d2ba',3),s('path',{d:`M${w*.5} ${floor-160} v-40 h45 l30 -40 l35 20`,fill:'none',stroke:'#f0c975',strokeWidth:3})):null,
  place==='office'||place==='restaurant'?s('g',null,rect(w*.65,floor-110,w*.28,15,'#a88367'),rect(w*.67,floor-100,12,100,'#7d7869'),rect(w*.88,floor-100,12,100,'#7d7869'),place==='office'?s('g',null,rect(w*.7,floor-210,w*.15,95,'#304e60'),rect(w*.71,floor-200,w*.13,70,'#86bac3')):rect(w*.73,floor-131,w*.12,10,'#f7f0df')):null,
  place==='bedroom'?s('g',null,rect(w*.03,floor-90,w*.30,110,'#a08c80'),rect(w*.03,floor-114,w*.32,50,'#f3e4d0'),rect(w*.05,floor-131,w*.11,39,'#fff8e9')):null,
  place==='bathroom'?s('g',null,rect(w*.04,floor-120,w*.26,22,'#fffdf1'),rect(w*.06,floor-100,w*.21,100,'#a3bfc0'),s('path',{d:`M${w*.14} ${floor-122} v-28 q0 -20 18 -20 h12`,stroke:'#6f8c96',strokeWidth:9,fill:'none'})):null,
  s('g',{opacity:.12},...[.25,.5,.75].map((x,i)=>line(w*x,floor+10,w*x+80,height,'#876f54',2,{key:i})))
 );
}
export function VectorStoryScene({scene,frame,registry={},landscape=false,speaking=false,viseme=null}){
 const width=landscape?1440:720,height=landscape?810:1280;
 const p=rigPose(scene,frame),hasDoor=(scene.beats||[]).some(b=>/open|exit|close/.test(b.action))||scene.action==='door';
 const originX=landscape?460:170,originY=landscape?125:425,scale=landscape?1.14:1.2;
 const profiles=registry.characters||[];
 const findProfile=id=>Array.isArray(profiles)?profiles.find(c=>c.id===id)||{}:profiles[id]||{};
 const primary=findProfile(scene.characterId),appearance=primary.appearance||primary;
 const doorX=landscape?870:440,doorY=height*.7-350;
 return s('svg',{viewBox:`0 0 ${width} ${height}`,width:'100%',height:'100%',role:'img','aria-label':`2D ${scene.place}: ${(scene.actions||[scene.action]).join(', ')}`},
  s(Room,{place:scene.place,frame,width,height}),
  hasDoor?s('g',null,rect(doorX-8,doorY-8,151,358,'#748d89'),rect(doorX,doorY,135,350,'#b8d7cf'),rect(doorX+15,doorY+12,105,240,'#dcf0e2'),line(doorX+13,doorY+241,doorX+122,doorY+241,'#729b83',3),s('path',{d:`M${doorX+30} ${doorY+238} l25 -90 l30 90 z`,fill:'#92b69a'})):null,
  scene.characterIds?.length>1?s('g',{transform:`translate(${landscape?830:440} ${originY+25}) scale(${scale*.85})`},s(Character,{scene:{...scene,beats:[{action:'talk'}]},frame:frame+35,profile:(findProfile(scene.characterIds[1]).appearance||findProfile(scene.characterIds[1])),speaking:false,secondary:true})):null,
  s('g',{transform:`translate(${originX} ${originY+(appearance.child?90:0)}) scale(${scale*(appearance.child?.8:1)})`},s(Character,{scene,frame,profile:appearance,speaking,viseme})),
  hasDoor?s('g',null,rect(doorX+110*p.door,doorY,135-110*p.door,350,'#b98b63',{stroke:'#8b6b54',strokeWidth:5,rx:1}),rect(doorX+18+94*p.door,doorY+60,95*(1-p.door)+5,200,'none',{stroke:'#d6b38b',strokeWidth:3}),circle(doorX+18+110*p.door,doorY+185,5,'#f2d28c')):null,
  scene.understanding?.literalActionSupported===false?s('g',{transform:`translate(${width*.6} ${height*.34+Math.max(0,20-frame*2)})`,opacity:Math.min(1,frame/10)},rect(0,0,width*.32,140,'#fff9e9',{stroke:'#b3c7bd',strokeWidth:3}),circle(28,30,9,'#e5b36f'),...(scene.keywords||[]).slice(0,3).map((word,i)=>s('text',{key:i,x:18,y:61+i*26,fontFamily:'Arial,sans-serif',fontSize:22,fill:'#42606b'},word.slice(0,18)))):null,
  scene.action==='checkout'?s('g',null,rect(width*.73,height*.66,width*.23,60,'#839c9b'),rect(width*.78,height*.62,65,45,'#304d5a'),rect(width*.79,height*.625,49,29,'#9ed5bd')):null
 );
}
