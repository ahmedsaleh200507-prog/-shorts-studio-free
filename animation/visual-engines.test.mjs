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
 assert.match(source,/function Person\(\{frame,action,speaking=false\}\)/);
 assert.match(source,/speaking\?svg\('ellipse'/);
 assert.match(source,/speaking:narration/);
 assert.doesNotMatch(source,/rotateY\(/);
 assert.doesNotMatch(source,/perspective:900/);
});

test('Wake-up and toothbrush are character-attached 2D actions',()=>{
 assert.match(source,/const wakeProgress=wake\?/);
 assert.match(source,/Hand holding toothbrush/);
 assert.match(source,/if\(action==='brush'\)return null/);
});
