"""Prepare dynamic Remotion narration and composition for the actual web-app job."""
import asyncio, base64, json, math, os, re
from pathlib import Path
import edge_tts
from mutagen.mp3 import MP3

ROOT=Path(__file__).resolve().parent
FPS=24
async def main():
    script=os.environ.get('SCRIPT','').strip()
    lang=os.environ.get('LANGUAGE','de')
    if not script or len(script)>3000: raise ValueError('Script must contain 1–3000 characters')
    if lang not in ('de','en'): raise ValueError('Unsupported language')
    sentences=[s.strip() for s in re.findall(r'[^.!?\n]+[.!?]?',script) if s.strip()]
    if not sentences or len(sentences)>60: raise ValueError('Invalid number of scenes')
    voice={'de':'de-DE-KatjaNeural','en':'en-US-JennyNeural'}[lang]
    out=ROOT/'public'/'audio';out.mkdir(parents=True,exist_ok=True)
    durations=[];uris=[]
    for i,sentence in enumerate(sentences):
        file=out/f'job-{i}.mp3'
        for attempt in range(3):
            try:
                await asyncio.wait_for(edge_tts.Communicate(sentence,voice).save(str(file)),timeout=90)
                if file.stat().st_size<1000: raise RuntimeError('Empty audio')
                break
            except Exception:
                if attempt==2: raise
                await asyncio.sleep(2*(attempt+1))
        seconds=MP3(file).info.length
        if not math.isfinite(seconds) or seconds<=0: raise RuntimeError('Invalid narration')
        durations.append(max(1,math.ceil((seconds+0.2)*FPS)))
        uris.append('data:audio/mpeg;base64,'+base64.b64encode(file.read_bytes()).decode('ascii'))
    (ROOT/'narration-audio.mjs').write_text('export const narrationAudio = '+json.dumps(uris)+';\n',encoding='utf-8')
    (ROOT/'narration-plan.mjs').write_text('export const narrationFrames = '+json.dumps(durations)+';\n',encoding='utf-8')
    entry="""import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {ShortsComposition} from './ShortsComposition.mjs';
import {makeScenePlan} from './scene-plan.mjs';
import {narrationFrames} from './narration-plan.mjs';
const script=SCRIPT_VALUE;
const plan=makeScenePlan(script,{durationsFrames:narrationFrames});
registerRoot(()=>React.createElement(Composition,{
 id:'ShortsJob',component:ShortsComposition,
 durationInFrames:plan.totalFrames,fps:plan.fps,
 width:plan.width,height:plan.height,
 defaultProps:{script,narration:true,durationsFrames:narrationFrames}
}));
""".replace('SCRIPT_VALUE',json.dumps(script,ensure_ascii=False))
    (ROOT/'job-entry.mjs').write_text(entry,encoding='utf-8')
    print('Prepared',len(sentences),'scenes,',sum(durations),'frames',flush=True)
if __name__=='__main__':asyncio.run(main())
