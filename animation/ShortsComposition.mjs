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
 // Vector character with independently articulated limbs and a gentle breathing cycle.
 const walking=action==='travel',step=walking?Math.sin(frame*0.24):0;
 const bounce=walking?Math.abs(step)*8:Math.sin(frame*0.09)*2;
 const reach=action==='pick'?Math.min(1,frame/22):0;
 const brush=action==='brush',wake=action==='wake';
 const armLeft=walking?step*19:brush?-34+Math.sin(frame*.34)*7:action==='checkout'?-18:Math.sin(frame*.08)*3;
 const armRight=walking?-step*19:reach?-55*reach:action==='checkout'?-26:Math.sin(frame*.09+1)*4;
 const legLeft=walking?step*22:0,legRight=walking?-step*22:0;
 const headTurn=Math.sin(frame*.045)*2;
 const svg=(tag,props,...children)=>el(tag,props,...children);
 return el('div',{style:{position:'absolute',left:'29%',top:'28%',width:'42%',height:'55%',transform:`translateY(${bounce+(wake?Math.max(0,28-frame*1.1):0)}px)`}},
  svg('svg',{viewBox:'0 0 300 640',width:'100%',height:'100%',role:'img','aria-label':'Animated 2D character'},
   svg('defs',null,
    svg('linearGradient',{id:'shirtShade',x1:'0%',y1:'0%',x2:'100%',y2:'20%'},svg('stop',{offset:'0%',stopColor:'#529ad2'}),svg('stop',{offset:'100%',stopColor:'#205b92'})),
    svg('linearGradient',{id:'skinShade',x1:'0%',y1:'0%',x2:'100%',y2:'0%'},svg('stop',{offset:'0%',stopColor:'#f4c6a5'}),svg('stop',{offset:'100%',stopColor:'#d89170'}))
   ),
   // Rear limbs first so the body overlaps the shoulder and hip joints.
   svg('g',{transform:`rotate(${legLeft} 119 392)`},
    svg('path',{d:'M99 379 Q105 420 102 486 L90 590 Q91 608 112 610 L139 603 L145 481 L147 395 Z',fill:'#263c60',stroke:'#192b45',strokeWidth:6,strokeLinejoin:'round'}),
    svg('path',{d:'M89 586 Q105 596 139 592 L148 615 Q137 630 84 625 Q72 616 89 586',fill:'#202a3e',stroke:'#111b2d',strokeWidth:5})),
   svg('g',{transform:`rotate(${legRight} 180 392)`},
    svg('path',{d:'M155 387 Q163 431 161 485 L158 597 Q171 610 189 601 L205 484 L206 383 Z',fill:'#314d70',stroke:'#192b45',strokeWidth:6,strokeLinejoin:'round'}),
    svg('path',{d:'M158 590 Q172 601 190 594 L216 611 Q220 631 163 627 Q146 616 158 590',fill:'#202a3e',stroke:'#111b2d',strokeWidth:5})),
   svg('g',{transform:`rotate(${armLeft} 94 227)`},
    svg('path',{d:'M96 221 Q62 225 58 269 L42 367 Q40 390 59 395 Q78 397 85 375 L112 285 Q130 235 96 221',fill:'url(#shirtShade)',stroke:'#214d76',strokeWidth:6}),
    svg('path',{d:'M44 358 Q34 371 40 389 Q50 409 68 394 L78 366',fill:'url(#skinShade)',stroke:'#b87860',strokeWidth:5})),
   svg('g',{transform:`rotate(${armRight} 208 229)`},
    svg('path',{d:'M203 224 Q240 220 249 270 L270 359 Q277 386 256 393 Q237 395 230 370 L191 287 Q177 240 203 224',fill:'url(#shirtShade)',stroke:'#214d76',strokeWidth:6}),
    svg('path',{d:'M243 355 Q243 375 252 390 Q270 408 277 382 L268 355',fill:'url(#skinShade)',stroke:'#b87860',strokeWidth:5})),
   svg('path',{d:'M105 214 Q150 201 200 217 Q225 258 213 382 Q161 401 89 383 Q79 290 105 214',fill:'url(#shirtShade)',stroke:'#214d76',strokeWidth:7,strokeLinejoin:'round'}),
   svg('path',{d:'M111 227 Q145 242 178 229',fill:'none',stroke:'#a8c9e5',strokeWidth:5,opacity:.7}),
   svg('path',{d:'M139 188 L140 220 Q153 233 169 219 L168 186',fill:'url(#skinShade)',stroke:'#b87860',strokeWidth:5}),
   svg('g',{transform:`rotate(${headTurn} 151 130)`},
    svg('ellipse',{cx:151,cy:133,rx:71,ry:87,fill:'url(#skinShade)',stroke:'#b87860',strokeWidth:5}),
    svg('path',{d:'M82 127 Q68 40 136 39 Q210 25 224 110 L213 124 Q196 98 192 83 Q157 114 105 101 L94 142 Z',fill:'#27364b',stroke:'#1b2738',strokeWidth:5}),
    svg('path',{d:'M107 137 Q122 129 135 137 M166 137 Q181 129 195 137',fill:'none',stroke:'#343849',strokeWidth:6,strokeLinecap:'round'}),
    svg('ellipse',{cx:121,cy:146,rx:5,ry:7,fill:'#24364b'}),
    svg('ellipse',{cx:181,cy:146,rx:5,ry:7,fill:'#24364b'}),
    svg('path',{d:'M150 151 L145 171 Q151 176 158 171',fill:'none',stroke:'#c48068',strokeWidth:4,strokeLinecap:'round'}),
    svg('path',{d:'M132 190 Q151 203 172 188',fill:'none',stroke:'#9d574f',strokeWidth:5,strokeLinecap:'round'}),
    svg('ellipse',{cx:96,cy:175,rx:12,ry:8,fill:'#e99b86',opacity:.45}),
    svg('ellipse',{cx:203,cy:174,rx:12,ry:8,fill:'#e99b86',opacity:.45})
   )
  )
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
   el('div',{style:{position:'absolute',left:'12%',top:'27%',width:'76%',height:'37%',border:'3px solid #74b6d755',borderRadius:22,transform:`perspective(900px) rotateY(${Math.sin(t*.8)*12}deg)`,boxShadow:'0 0 80px #65bde733'}})):null,
  number?el('div',{style:{position:'absolute',left:'10%',right:'10%',top:'27%',color:accent,fontSize:values.length?180:95,fontWeight:900,textAlign:'center',textShadow:'0 0 75px '+accent+'88',transform:`scale(${.8+Math.min(1,frame/18)*.2})`}},values[0]||'100%'):null,
  el('div',{style:{position:'absolute',left:'9%',right:'9%',top:number?'57%':'37%',fontSize:number?50:74,fontWeight:900,lineHeight:1.12,color:'#f7f3ee',letterSpacing:1,textAlign:'left',overflowWrap:'anywhere',textShadow:'0 6px 24px #000a',transform:`translateX(${Math.max(0,1-frame/18)*-180}px)`,opacity:Math.min(1,frame/13)}},chosen),
  el('div',{style:{position:'absolute',left:'9%',top:'19%',width:'20%',height:7,background:accent,transform:`scaleX(${Math.min(1,frame/20)})`,transformOrigin:'left'}}),
  el('div',{style:{position:'absolute',right:'9%',top:'17%',fontSize:28,color:accent,letterSpacing:5,fontWeight:900}},tech?'DIGITAL / 01':number?'DATA / 01':'STORY / 01')
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
 el(DocumentaryScene,{scene,frame}),
 el(EditorialGraphic,{scene,frame}),
 ['phone','door','clock','alert'].includes(scene.action)?el(StoryObject,{action:scene.action,frame,accent}):['space','nature','science','map','history','talk','number','technology'].includes(scene.action)?null:el('div',{style:panel},
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
