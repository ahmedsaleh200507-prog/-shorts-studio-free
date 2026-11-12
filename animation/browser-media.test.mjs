import test from 'node:test';
import assert from 'node:assert/strict';
import {browserMediaCapabilities,loadMediaToolkit,assertMediaEncodingSupported} from './browser-media.mjs';
test('Browser capability check does not claim unsupported MP4',()=>{
 assert.deepEqual(browserMediaCapabilities({}),{video:false,audio:false,canvas:false,canAttemptMp4:false});
 assert.equal(browserMediaCapabilities({VideoEncoder(){},AudioEncoder(){}}).canAttemptMp4,true);
 assert.throws(()=>assertMediaEncodingSupported({}),/server render fallback/);
});
test('Mediabunny adapter validates its public exports',async()=>{
 const stub=class {};
 const lib=await loadMediaToolkit({importer:async()=>({Output:stub,Mp4OutputFormat:stub,BufferTarget:stub})});
 assert.equal(lib.Output,stub);
 await assert.rejects(loadMediaToolkit({importer:async()=>({})}),/Unsupported/);
});
