import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./ShortsComposition.mjs',import.meta.url),'utf8');

test('AI and vector visual engines are separate while narration stays shared',()=>{
 assert.match(source,/function AiIllustration\(/);
 assert.match(source,/function VectorScene\(/);
 assert.match(source,/aiImage\?el\(AiIllustration/);
 assert.match(source,/el\(VectorScene/);
 assert.match(source,/narration\?plan\.scenes\.map/);
});
test('Phone illustration includes deterministic hand interaction',()=>{
 assert.match(source,/function PhoneHand\(\{frame\}\)/);
 assert.match(source,/el\(PhoneHand,\{frame\}\)/);
 assert.match(source,/text\.slice\(0,90\)/);
 assert.match(source,/Math\.abs\(frame-40\)/);
});

test('Door animation has sequential approach, grip, open and exit phases',()=>{
 assert.match(source,/if\(action==='door'\)/);
 assert.match(source,/const approach=Math\.min\(1,frame\/23\)/);
 assert.match(source,/const grip=Math\.max\(0,1-Math\.abs\(frame-26\)\/14\)/);
 assert.match(source,/const open=Math\.min\(1,Math\.max\(0,\(frame-30\)\/25\)\)/);
 assert.match(source,/const exit=Math\.min\(1,Math\.max\(0,\(frame-48\)\/23\)\)/);
});

test('Narrated 2D characters have animated mouth without 3D transforms',()=>{
 assert.match(source,/function Person\(\{frame,action,mouthLevel=0,holding=false\}\)/);
 assert.match(source,/mouthLevel>\.035\?svg\('ellipse'/);
 assert.match(source,/mouthLevel:narration\?speechMouthLevel/);
 assert.doesNotMatch(source,/rotateY\(/);
 assert.doesNotMatch(source,/perspective:900/);
});

test('Wake-up and toothbrush are character-attached 2D actions',()=>{
 assert.match(source,/const wakeProgress=wake\?/);
 assert.match(source,/Hand holding toothbrush/);
 assert.match(source,/if\(action==='brush'\)return null/);
});

test('Sitting scenes draw an actual 2D chair behind the character',()=>{
 assert.match(source,/scene\.action==='sit'\?el\(React\.Fragment/);
 assert.match(source,/Shape\(\{x:37,y:67,w:26,h:5,color:'#9a6648'/);
 assert.match(source,/el\(Person,\{frame,action:scene\.action,mouthLevel,holding:/);
});

test('2D characters blink both eyes using deterministic frame timing',()=>{
 assert.match(source,/const blinkPhase=\(\(frame\+17\)%89\+89\)%89/);
 assert.match(source,/const eyeOpen=blinkPhase<3\?/);
 assert.match(source,/cx:121\+gazeX,cy:146\+gazeY,rx:5,ry:7\*eyeOpen/);
 assert.match(source,/cx:181\+gazeX,cy:146\+gazeY,rx:5,ry:7\*eyeOpen/);
});

test('2D eyes follow scene actions while retaining blink animation',()=>{
 assert.match(source,/const gazeX=action==='pick'\?3:action==='checkout'\?2:/);
 assert.match(source,/const gazeY=action==='pick'\?2:/);
 assert.match(source,/cx:121\+gazeX,cy:146\+gazeY,rx:5,ry:7\*eyeOpen/);
 assert.match(source,/cx:181\+gazeX,cy:146\+gazeY,rx:5,ry:7\*eyeOpen/);
});

test('held prop is prioritized over incidental scene objects',()=>{
 assert.match(source,/supportedItems\.includes\(heldObject\)\?heldObject:null/);
 assert.match(source,/supportedItems\.find\(name=>objects\.includes\(name\)\)/);
});

test('reference-style HUD overlays vector or AI scenes without hiding narration captions',()=>{
 assert.match(source,/function EditorialHud\(/);
 assert.match(source,/el\(EditorialHud,\{scene,sceneIndex,landscape\}\)/);
 assert.match(source,/backgroundImage:'linear-gradient/);
 assert.match(source,/el\(CaptionWords,\{caption,landscape\}\)/);
 assert.doesNotMatch(source,/'SHORTS STUDIO'\)/);
});

test('rolling captions cap visible words in portrait and landscape',()=>{
 assert.match(source,/export function rollingCaption\(words,revealedWords,maxWords=8\)/);
 assert.match(source,/const start=Math\.max\(0,end-maxWords\)/);
 assert.match(source,/rollingCaption\(words,revealedWords,landscape\?11:7\)/);
});
