import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {ShortsComposition} from './ShortsComposition.mjs';
import {makeScenePlan} from './scene-plan.mjs';

const script='Ein Mann wacht morgens auf. Er putzt seine Zähne. Er nimmt einen Apfel. Er bezahlt an der Kasse.';
const plan=makeScenePlan(script);
const Root=()=>React.createElement(Composition,{
  id:'ShortsDemo',component:ShortsComposition,
  durationInFrames:plan.totalFrames,fps:plan.fps,
  width:plan.width,height:plan.height,defaultProps:{script}
});
registerRoot(Root);
