import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('MP4 download checks both audio and video tracks before displaying',()=>{
 assert.match(html,/async function verifyMp4Tracks\(blob\)/);
 assert.match(html,/getPrimaryVideoTrack\(\)/);
 assert.match(html,/getPrimaryAudioTrack\(\)/);
 assert.match(html,/if\(!audio\)throw Error/);
 assert.ok(html.indexOf('await verifyMp4Tracks(blob)')<html.indexOf('cache={signature,url,blob}'));
});
test('Browser codec/CDN errors do not discard a rendered server MP4',()=>{
 assert.match(html,/return \{verified:false,reason:/);
 assert.match(html,/İndirmeden önce oynatıp kontrol et/);
});
