// Lightweight 2D skeletal pose evaluator, inspired by open skeletal animation
// workflows (Rigby2D), independently implemented for Shorts Studio Free.
// No assets, GPU, runtime dependency, or third-party source code included.
export const clamp01=(v)=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
export const smooth=(v)=>{const t=clamp01(v);return t*t*(3-2*t);};
export function characterPose(action,frame,fps=24){
 const f=Math.max(0,Number.isFinite(frame)?frame:0);
 const t=f/Math.max(1,fps);
 const walk=['travel','carry','walk','run'].includes(action);
 const running=action==='run';
 const gaitHz=running?2.8:5.76/(2*Math.PI);
 const cycle=walk?Math.sin(t*2*Math.PI*gaitHz):0;
 const reach=action==='pick'?smooth(f/(fps*.95)):0;
 const hold=action==='carry';
 const brush=action==='brush';
 return {
  bodyY:walk?Math.abs(cycle)*(running?13:8):Math.sin(t*2.16)*2,
  headRotation:Math.sin(t*1.08)*2,
  leftArm:walk?cycle*(running?33:19):brush?-34+Math.sin(t*8.16)*7:action==='checkout'?-18:Math.sin(t*1.92)*3,
  rightArm:hold?-11+cycle*4:walk?-cycle*(running?33:19):reach?-55*reach:action==='checkout'?-26:Math.sin(t*2.16+1)*4,
  leftLeg:walk?cycle*(running?37:22):0,
  rightLeg:walk?-cycle*(running?37:22):0,
  propSwing:hold?cycle*2.5:0
 };
}
export function lipShapeAt(time,cues=[]){
 if(!Array.isArray(cues)||!Number.isFinite(time))return 'X';
 const cue=cues.find(c=>c&&Number.isFinite(c.start)&&Number.isFinite(c.end)&&c.start<=time&&time<c.end);
 return typeof cue?.value==='string'&&/^[A-HX]$/.test(cue.value)?cue.value:'X';
}
