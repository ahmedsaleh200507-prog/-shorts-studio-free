import test from 'node:test';
import assert from 'node:assert/strict';
import {captionRevealCount} from './caption-timing.mjs';
test('Edge TTS word boundaries control captions',()=>{
 const words=[{word:'Hallo',start:.2,end:.6},{word:',',start:.6,end:.65},{word:'Welt',start:1,end:1.5},{word:'!',start:1.5,end:1.55}];
 assert.equal(captionRevealCount('Hallo, Welt!',5,72,words),1);
 assert.equal(captionRevealCount('Hallo, Welt!',27,72,words),2);
});
test('Mismatched and invalid alignments fall back safely',()=>{
 assert.equal(captionRevealCount('Hallo Welt',24,72,[{word:'Falsch',start:0,end:1}]),1);
 assert.equal(captionRevealCount('Hallo Welt',48,72,[{word:'Hallo',start:0,end:1},{word:'Welt',start:NaN,end:2}]),2);
 assert.equal(captionRevealCount('Hallo Welt',48,72,[{word:'Hallo',start:null,end:1},{word:'Welt',start:1,end:2}]),2);
 assert.equal(captionRevealCount('Hallo Welt',24,72,[{word:'Hallo',start:0,end:1},{word:'Welt',start:undefined,end:2}]),1);
 assert.equal(captionRevealCount('',20,72,[]),0);
});
