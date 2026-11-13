// Convert the Remotion scene plan into Godot-compatible actions.
import {makeScenePlan} from './scene-plan.mjs';
import {readFileSync} from 'node:fs';

const script=process.argv[2];
const aspectRatio=process.argv[3]||'9:16';
if(!script) {
  console.error('Usage: node export-godot-plan.mjs "script" [9:16|16:9]');
  process.exit(2);
}
if(!['9:16','16:9'].includes(aspectRatio)) {
  console.error('Unsupported aspect ratio');
  process.exit(2);
}
const durationsFile=process.argv[4];
const durationsFrames=durationsFile?JSON.parse(readFileSync(durationsFile,'utf8')):null;
const plan=makeScenePlan(script,{aspectRatio,durationsFrames});
const supportedActions=new Set(['wake','brush','pick','travel','carry','talk','run','sit','walk']);
const supportedPlaces=new Set(['bedroom','bathroom','supermarket','transport','hospital','school','generic','space','science','nature','technology','phone','clock','alert','map','history','infographic','door','metro','radio','restaurant','office']);
const graphicTopics=new Set(['space','science','nature','technology','phone','clock','alert','map','history','infographic','door','metro','radio']);
const scenes=plan.scenes.map((scene)=>{
  const action=supportedActions.has(scene.action)?scene.action:'talk';
  const topic=graphicTopics.has(scene.place)?scene.place:null;
  const place=topic||(supportedPlaces.has(scene.place)?scene.place:'generic');
  const frames=scene.endFrame-scene.startFrame;
  if(!Number.isInteger(frames)||frames<1) throw new Error('Invalid frame count');
  return {id:scene.id,text:scene.text,action,place,props:scene.props,keywords:scene.keywords,narrative:scene.narrative,frames,startFrame:scene.startFrame,endFrame:scene.endFrame};
});
process.stdout.write(JSON.stringify({version:1,aspectRatio,fps:plan.fps,totalFrames:plan.totalFrames,scenes},null,2)+'\n');
