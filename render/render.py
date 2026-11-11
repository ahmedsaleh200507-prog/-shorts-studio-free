#!/usr/bin/env python3
"""Render a 2D narrated vertical MP4 from text using edge-tts and ffmpeg."""
import argparse, asyncio, json, math, re, subprocess, tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import edge_tts

def run(*args):
    subprocess.run(args,check=True)

def font(size):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf'):
        if Path(p).exists(): return ImageFont.truetype(p,size)
    return ImageFont.load_default()

def wrap(draw, text, f, width):
    words=text.split();lines=[];line=''
    for word in words:
        trial=(line+' '+word).strip()
        if draw.textbbox((0,0),trial,font=f)[2]>width and line:
            lines.append(line);line=word
        else:line=trial
    if line:lines.append(line)
    return lines

def scene(draw, w, h, sentence, index, count):
    low=sentence.lower()
    if any(k in low for k in ('supermarkt','market','shop','laden')):
        bg='#f8e5ca';accent='#b66c52';title='SUPERMARKT'
    elif any(k in low for k in ('bad','bath','zahn','tooth')):
        bg='#dceef0';accent='#6098a7';title='BAD'
    elif any(k in low for k in ('bus','zug','train','station')):
        bg='#dce9f5';accent='#487fa9';title='UNTERWEGS'
    elif any(k in low for k in ('schlaf','bett','wake','bed')):
        bg='#dcdcf0';accent='#6778a6';title='ZU HAUSE'
    else:
        bg='#d9e9f2';accent='#587e9d';title='STORY'
    draw.rectangle((0,0,w,h),fill=bg)
    draw.ellipse((w-170,85,w-70,185),fill='#ffe3a3')
    draw.rectangle((0,630,w,820),fill=accent)
    draw.text((30,65),title,font=font(43),fill='#20364a')
    if title=='SUPERMARKT':
        for y in (220,345,470):
            draw.rectangle((45,y,495,y+15),fill='#95684e')
            for j in range(7):
                x=62+j*64;draw.rectangle((x,y-54,x+42,y-8),fill=['#d7796b','#78a58c','#e9b56d'][j%3])
    elif title=='BAD':
        draw.rectangle((80,190,460,480),fill='#f8faf9')
        draw.ellipse((180,355,360,415),fill='#a9d2dd')
    elif title=='UNTERWEGS':
        draw.rounded_rectangle((45,265,495,510),radius=25,fill='#397ba6')
        for x in (85,190,295):draw.rectangle((x,300,x+85,400),fill='#c0e1ec')
    elif title=='ZU HAUSE':
        draw.rectangle((65,420,480,600),fill='#6179ac')
        draw.rectangle((95,400,450,465),fill='#eee4d6')
    else:
        for j in range(5):
            x=30+j*105;draw.rectangle((x,240+j%2*60,x+88,630),fill='#84a5bc')
    # Person (fully 2D, no 3D assets)
    draw.ellipse((205,345,330,470),fill='#efc5a1')
    draw.pieslice((205,332,330,435),180,360,fill='#3e3543')
    draw.rounded_rectangle((182,475,353,680),radius=38,fill='#416b9c')
    draw.line((195,510,145,615),fill='#efc5a1',width=26)
    draw.line((338,510,390,615),fill='#efc5a1',width=26)
    draw.ellipse((240,403,250,413),fill='#243344')
    draw.ellipse((286,403,296,413),fill='#243344')
    draw.arc((247,420,292,446),0,180,fill='#8e554a',width=3)
    draw.rectangle((0,820,w,h),fill='#132239')
    f=font(31);lines=wrap(draw,sentence,f,w-55)
    if len(lines)>3:
        f=font(24);lines=wrap(draw,sentence,f,w-45)
    for j,line in enumerate(lines[:5]):
        bb=draw.textbbox((0,0),line,font=f)
        draw.text(((w-(bb[2]-bb[0]))/2,838+j*36),line,font=f,fill='white')
    draw.rectangle((0,h-13,round(w*(index+1)/count),h),fill='#7de3c5')

async def synth(text, voice, path):
    tts=edge_tts.Communicate(text,voice)
    await asyncio.wait_for(tts.save(str(path)), timeout=60)

def duration(path):
    p=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(path)],capture_output=True,text=True,check=True)
    return float(p.stdout.strip())

async def main():
    p=argparse.ArgumentParser()
    p.add_argument('--text',required=True)
    p.add_argument('--lang',choices=['de','en'],default='de')
    p.add_argument('--out',default='output/final.mp4')
    args=p.parse_args()
    text=args.text.strip()
    if not text or len(text)>3000:raise ValueError('Text must be 1..3000 characters')
    sentences=[s.strip() for s in re.findall(r'[^.!?\n]+[.!?]?',text) if s.strip()]
    voice={'de':'de-DE-KatjaNeural','en':'en-US-JennyNeural'}[args.lang]
    out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        root=Path(tmp);segments=[]
        for i,s in enumerate(sentences):
            audio=root/f'a{i:03}.mp3'
            print(f'Rendering scene {i+1}/{len(sentences)}',flush=True)
            await synth(s,voice,audio)
            d=duration(audio)
            image=root/f'i{i:03}.png'
            im=Image.new('RGB',(540,960))
            scene(ImageDraw.Draw(im),540,960,s,i,len(sentences))
            im.save(image)
            seg=root/f's{i:03}.mp4'
            run('ffmpeg','-hide_banner','-loglevel','error','-y','-loop','1','-framerate','15','-i',str(image),'-i',str(audio),'-t',str(d),'-c:v','libx264','-preset','ultrafast','-crf','24','-threads','2','-pix_fmt','yuv420p','-r','15','-c:a','aac','-b:a','96k','-movflags','+faststart',str(seg))
            segments.append(seg)
        concat=root/'concat.txt'
        concat.write_text(''.join("file '"+str(seg)+"'\n" for seg in segments))
        run('ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(out))
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(out)]))
    streams=probe.get('streams', [])
    videos=[s for s in streams if s.get('codec_type')=='video']
    audios=[s for s in streams if s.get('codec_type')=='audio']
    if not videos or not audios:
        raise RuntimeError('MP4 lacks audio/video stream: '+json.dumps(streams))
    if videos[0].get('codec_name')!='h264':
        raise RuntimeError('Video must be H.264, got '+str(videos[0].get('codec_name')))
    if audios[0].get('codec_name')!='aac':
        raise RuntimeError('Audio must be AAC, got '+str(audios[0].get('codec_name')))
    if out.stat().st_size < 10000:
        raise RuntimeError('MP4 is unexpectedly small')
    final_duration=duration(out)
    if not math.isfinite(final_duration) or final_duration <= 0:
        raise RuntimeError('Invalid final MP4 duration')
    print('PASS:',out,'video=h264 audio=aac duration=',round(final_duration,2),'bytes=',out.stat().st_size,flush=True)
if __name__=='__main__':asyncio.run(main())
