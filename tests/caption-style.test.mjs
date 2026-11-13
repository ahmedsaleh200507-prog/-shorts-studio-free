import test from 'node:test';
import assert from 'node:assert/strict';
import {captionTokenStyle,captionOpacity} from '../animation/caption-style.mjs';

test('reference-inspired caption emphasis works in German and English',()=>{
 for(const token of ['nicht','Warnung!','never','danger','NACHT'])assert.equal(captionTokenStyle(token),'emphasis');
 for(const token of ['42%','1.000','€250','2026','3,5'])assert.equal(captionTokenStyle(token),'number');
 for(const token of ['Haus','hello',' ','Apfel'])assert.equal(captionTokenStyle(token),'normal');
});
test('caption opacity is bounded for short and long scenes',()=>{
 for(const duration of [1,2,3,4,5,12,24,72,14400]){
  for(const frame of [0,1,Math.floor(duration/2),duration-1]){
   const opacity=captionOpacity(frame,duration);
   assert.ok(Number.isFinite(opacity)&&opacity>=0&&opacity<=1);
  }
 }
 assert.equal(captionOpacity(0,24),0);
 assert.equal(captionOpacity(12,24),1);
 assert.equal(captionOpacity(23,24),0);
 assert.equal(captionOpacity(NaN,24),0);
});
