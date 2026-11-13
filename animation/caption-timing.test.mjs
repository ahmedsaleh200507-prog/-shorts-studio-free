import test from 'node:test';
import assert from 'node:assert/strict';
import {captionRevealCount,speechActiveAtFrame,speechMouthLevel} from './caption-timing.mjs';
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

test('character mouth follows speech and closes between words',()=>{
 const timing=[{word:'Hallo',start:.25,end:.6},{word:'Welt',start:1.1,end:1.5}];
 assert.equal(speechActiveAtFrame(0,timing),false);
 assert.equal(speechActiveAtFrame(9,timing),true);
 assert.equal(speechActiveAtFrame(20,timing),false);
 assert.equal(speechActiveAtFrame(30,timing),true);
 assert.equal(speechActiveAtFrame(45,timing),false);
 assert.equal(speechActiveAtFrame(30,[]),true);
 assert.equal(speechActiveAtFrame(30,[{word:'invalid'}]),true);
});

test('mouth motion rejects negative frames and invalid fps without throwing',()=>{
 const timing=[{word:'Hallo',start:0,end:1}];
 assert.equal(speechActiveAtFrame(-1,timing),false);
 assert.equal(speechActiveAtFrame(NaN,timing),false);
 assert.equal(speechActiveAtFrame(1,timing,0),false);
 assert.equal(speechActiveAtFrame(1,timing,Infinity),false);
 assert.equal(speechActiveAtFrame(-1,[]),false);
 assert.equal(speechActiveAtFrame(0,[{word:'Hallo',start:true,end:1}]),true);
});

test('smooth mouth level stays bounded and closes in silence',()=>{
 const words=[{word:'Hallo',start:.3,end:.7},{word:'Welt',start:1.2,end:1.6}];
 assert.equal(speechMouthLevel(0,words),0);
 assert.ok(speechMouthLevel(12,words)>.2);
 assert.equal(speechMouthLevel(23,words),0);
 assert.ok(speechMouthLevel(34,words)>.2);
 assert.equal(speechMouthLevel(50,words),0);
 assert.equal(speechMouthLevel(-1,words),0);
 assert.equal(speechMouthLevel(5,words,0),0);
 for(let frame=0;frame<72;frame++){
  const v=speechMouthLevel(frame,words);
  assert.ok(v>=0&&v<=1&&Number.isFinite(v));
 }
});

test('captions never return NaN or reveal words on invalid frames',()=>{
 assert.equal(captionRevealCount(null,12,72),0);
 assert.equal(captionRevealCount('Hallo Welt',NaN,72),0);
 assert.equal(captionRevealCount('Hallo Welt',12,0),0);
 assert.equal(captionRevealCount('Hallo Welt',12,72,null,0),0);
 assert.equal(captionRevealCount('Hallo Welt',12,72,null,Infinity),0);
 assert.equal(captionRevealCount('Hallo Welt',12,72,null,24),1);
});
