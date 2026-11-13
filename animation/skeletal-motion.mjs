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
 // Reach, grasp, and settle: no instantaneous arm snapping at scene start.
 const reach=action==='pick'?smooth((f-fps*.12)/(fps*.82)):0;
 const grasp=action==='pick'?smooth((f-fps*.48)/(fps*.44)):0;
 const hold=action==='carry';
 const brush=action==='brush';
 const sitting=action==='sit';
 const sitProgress=sitting?smooth(f/(fps*.65)):0;
 return {
  bodyY:sitting?24*sitProgress:walk?Math.abs(cycle)*(running?13:8):Math.sin(t*2.16)*2,
  headRotation:Math.sin(t*1.08)*2,
  leftArm:sitting?-10*sitProgress:walk?cycle*(running?33:19):brush?-34+Math.sin(t*8.16)*7:action==='checkout'?-18:Math.sin(t*1.92)*3,
  rightArm:sitting?-10*sitProgress:hold?-11+cycle*4:walk?-cycle*(running?33:19):action==='pick'?-55*reach+12*grasp:action==='checkout'?-26:Math.sin(t*2.16+1)*4,
  leftLeg:sitting?58*sitProgress:walk?cycle*(running?37:22):0,
  rightLeg:sitting?-58*sitProgress:walk?-cycle*(running?37:22):0,
  propSwing:hold?cycle*2.5:0,
  grasp
 };
}
export function lipShapeAt(time,cues=[]){
 if(!Array.isArray(cues)||!Number.isFinite(time))return 'X';
 const cue=cues.find(c=>c&&Number.isFinite(c.start)&&Number.isFinite(c.end)&&c.start<=time&&time<c.end);
 return typeof cue?.value==='string'&&/^[A-HX]$/.test(cue.value)?cue.value:'X';
}
