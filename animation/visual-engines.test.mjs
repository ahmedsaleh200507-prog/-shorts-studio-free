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
