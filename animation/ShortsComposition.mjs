import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {makeScenePlan} from './scene-plan.mjs';

// Working Remotion component sharing scene-plan timing with the browser renderer.
// The next milestone is replacing the placeholder shapes with rigged PixiJS assets.
export function ShortsComposition({script='Ein Mann wacht morgens auf.'}){
  const plan=makeScenePlan(script);
  const frame=useCurrentFrame();
  const scene=plan.scenes.find(s=>frame>=s.startFrame&&frame<s.endFrame)??plan.scenes.at(-1);
  const local=frame-scene.startFrame;
  const zoom=interpolate(local,[0,Math.max(1,scene.endFrame-scene.startFrame)],[1,1.07],{extrapolateRight:'clamp'});
  const arm=20*Math.sin(local/3);
  return React.createElement(AbsoluteFill,{style:{background:'#15253c',color:'white',fontFamily:'Arial',overflow:'hidden'}},
    React.createElement('div',{style:{position:'absolute',inset:0,transform:`scale(${zoom})`,background:scene.place==='supermarket'?'#c9a77d':scene.place==='bathroom'?'#b8dbe4':'#233a58'}},
      React.createElement('div',{style:{position:'absolute',left:'39%',top:'38%',width:'22%',height:'35%',background:'#4a82b3',borderRadius:60}}),
      React.createElement('div',{style:{position:'absolute',left:'42%',top:'26%',width:'16%',aspectRatio:1,background:'#e5b28d',borderRadius:'50%'}}),
      React.createElement('div',{style:{position:'absolute',left:'59%',top:'42%',width:22,height:210,background:'#e5b28d',transform:`rotate(${arm}deg)`,transformOrigin:'top'}})
    ),
    React.createElement('div',{style:{position:'absolute',bottom:180,left:60,right:60,fontSize:54,fontWeight:800,textAlign:'center',textShadow:'0 4px 12px black'}},scene.text)
  );
}
