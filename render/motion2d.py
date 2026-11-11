"""CPU-only procedural 2D motion frames for the free cloud renderer."""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 540, 960, 12

def _font(size):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
              '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf'):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def classify(text):
    t = text.casefold()
    groups = [
        ('night', ('blackout','stromausfall','dunkel','dark','nacht','night','stadt','city')),
        ('market', ('supermarkt','market','shop','laden','einkauf','grocer')),
        ('hospital', ('krankenhaus','hospital','arzt','doctor','patient')),
        ('school', ('schule','school','classroom','unterricht')),
        ('transport', ('bus','zug','train','bahnhof','station')),
        ('home', ('wohnung','zimmer','home','house','bett','bed','aufwach','wake')),
    ]
    return next((name for name, words in groups if any(word in t for word in words)), 'city')

def _background(d, kind, tick):
    dark = kind == 'night'
    sky = '#10192c' if dark else '#d8e9ef'
    d.rectangle((0,0,W,H), fill=sky)
    if dark:
        d.ellipse((418,85,481,148), fill='#f3e6c6')
        for n in range(28):
            x=(n*97+13)%W; y=(n*71+37)%350
            brightness= '#e6f0fa' if (n+int(tick*3))%5 else '#74849b'
            d.ellipse((x,y,x+3,y+3),fill=brightness)
    else:
        d.ellipse((418,88,486,156),fill='#ffdc8b')
    if kind in ('night','city'):
        for layer in (0,1):
            offset=int(tick*(7 if layer==0 else 15))
            for j in range(-2,10):
                x=j*(94 if layer==0 else 76)-offset%(94 if layer==0 else 76)
                top=260+(j*37+layer*29)%180
                color=('#25344b' if dark else '#a1bdc9') if layer==0 else ('#172338' if dark else '#7196aa')
                d.rectangle((x,top,x+(90 if layer==0 else 73),785),fill=color)
                for yy in range(top+25,750,53):
                    for xx in range(x+14,x+70,28):
                        lit=(j+yy//53+xx//28)%4==0
                        d.rectangle((xx,yy,xx+13,yy+22),fill=('#f3c97b' if lit else '#0e192a') if dark else '#d9ebee')
        d.rectangle((0,775,W,830),fill='#30394b' if dark else '#6c7884')
        for j in range(5):
            x=(j*150-int(tick*75))%750-100
            d.rectangle((x,803,x+70,809),fill='#f5d99b')
    elif kind == 'market':
        d.rectangle((0,210,W,805),fill='#e5d4ba')
        for y in (290,425,560):
            d.rectangle((15,y,525,y+15),fill='#926e57')
            for j in range(8):
                x=25+j*65
                d.rounded_rectangle((x,y-65,x+43,y-8),radius=5,fill=['#d86e65','#77a58d','#efbb73'][j%3])
    elif kind == 'hospital':
        d.rectangle((0,210,W,805),fill='#e8f2f3')
        d.rectangle((60,270,480,620),fill='#b9d7df')
        d.rectangle((235,300,305,455),fill='#ffffff')
        d.rectangle((195,340,345,410),fill='#ffffff')
        d.rectangle((50,680,490,735),fill='#6c9fb0')
    elif kind == 'school':
        d.rectangle((0,215,W,805),fill='#f1dfc4')
        d.rectangle((55,260,485,550),fill='#3b7567')
        d.rectangle((90,590,450,650),fill='#ad7d55')
    elif kind == 'transport':
        d.rectangle((0,220,W,805),fill='#c2d6e3')
        shift=int(tick*42)%W
        d.rounded_rectangle((40-shift//5,370,510-shift//5,670),radius=35,fill='#3f7da6')
        for x in (90,205,320):
            d.rectangle((x-shift//5,410,x+85-shift//5,520),fill='#a7d6e6')
    else:
        d.rectangle((0,215,W,805),fill='#e9dfd1')
        d.rectangle((60,330,480,635),fill='#a5c5d2')
        d.rectangle((85,355,455,610),fill='#dce9e9')
        d.rectangle((40,655,500,750),fill='#7d8f9f')
    d.rectangle((0,810,W,960),fill='#111e32')

def _character(d, tick, kind):
    # Articulated limbs: walking gait is different in every animation frame.
    walk = kind in ('night','city','market','transport')
    gait=math.sin(tick*7) if walk else math.sin(tick*2)*0.2
    x=int(255 + (math.sin(tick*0.65)*42 if walk else 0))
    y=int(535+abs(gait)*5)
    skin='#e8b68f'; outfit='#4d83b6'
    d.line((x-23,y+125,x-31+int(26*gait),y+240),fill='#263c55',width=27)
    d.line((x+23,y+125,x+31-int(26*gait),y+240),fill='#263c55',width=27)
    d.ellipse((x-65,y-120,x+65,y+10),fill=skin)
    d.pieslice((x-67,y-130,x+67,y-18),180,360,fill='#303247')
    d.rounded_rectangle((x-70,y+12,x+70,y+155),radius=30,fill=outfit)
    d.line((x-60,y+36,x-98-int(30*gait),y+133),fill=skin,width=23)
    d.line((x+60,y+36,x+98+int(30*gait),y+133),fill=skin,width=23)
    d.ellipse((x-27,y-65,x-19,y-57),fill='#1b283b')
    d.ellipse((x+19,y-65,x+27,y-57),fill='#1b283b')
    d.arc((x-18,y-48,x+18,y-25),0,180,fill='#9c6257',width=3)

def frame(sentence, index, count, tick, duration):
    kind=classify(sentence)
    im=Image.new('RGB',(W,H))
    d=ImageDraw.Draw(im)
    _background(d,kind,tick)
    _character(d,tick,kind)
    # Animated caption highlight, synchronized to elapsed scene fraction.
    words=sentence.split()
    if words:
        active=min(len(words)-1,int(tick/max(duration,0.1)*len(words)))
        line=[]; lines=[]
        for j,word in enumerate(words):
            candidate=' '.join(line+[word])
            if d.textbbox((0,0),candidate,font=_font(27))[2]>W-54 and line:
                lines.append(line);line=[]
            line.append(word)
        if line:lines.append(line)
        flat=0
        for li,words_in_line in enumerate(lines[:4]):
            total=' '.join(words_in_line)
            width=d.textbbox((0,0),total,font=_font(27))[2]
            x=(W-width)//2; y=838+li*32
            for word in words_in_line:
                d.text((x,y),word,font=_font(27),fill='#f5d078' if flat==active else '#ffffff')
                x+=d.textbbox((0,0),word+' ',font=_font(27))[2]
                flat+=1
    progress=(index+min(1,tick/max(duration,0.1)))/max(count,1)
    d.rectangle((0,951,int(W*progress),960),fill='#6ce1c6')
    return im

def write_frames(sentence,index,count,duration,directory):
    directory=Path(directory);directory.mkdir(parents=True,exist_ok=True)
    total=max(1,math.ceil(duration*FPS))
    for n in range(total):
        frame(sentence,index,count,n/FPS,duration).save(directory/f'frame_{n:05d}.png')
    return total
