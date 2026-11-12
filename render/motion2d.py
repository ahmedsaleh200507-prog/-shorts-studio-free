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
        ('night', ('blackout','stromausfall','dunkel','dark','nacht','night')),
        ('market', ('supermarkt','market','shop','laden','einkauf','grocer')),
        ('hospital', ('krankenhaus','hospital','arzt','doctor','patient')),
        ('school', ('schule','school','classroom','unterricht')),
        ('transport', ('bus','zug','train','bahnhof','station')),
        ('home', ('wohnung','zimmer','home','house','bett','bed','aufwach','wake','erwacht','wacht auf')),
        ('bathroom', ('badezimmer','bathroom','zähne','zahnbürste','toothbrush','teeth','zähneputzen')),
        ('cafe', ('café','cafe','kaffee','coffee','restaurant')),
        ('office', ('büro','office','computer','laptop','arbeit','work')),
        ('park', ('park','baum','tree','forest','wald','nature')),
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
    elif kind == 'bathroom':
        d.rectangle((0,190,W,810),fill='#cce7ec')
        for yy in range(210,810,90): d.line((0,yy,W,yy),fill='#a7d2d9',width=3)
        for xx in range(0,W,90): d.line((xx,190,xx,810),fill='#a7d2d9',width=3)
        d.rounded_rectangle((55,235,485,530),radius=24,fill='#f8ffff',outline='#6b9daa',width=9)
        d.rounded_rectangle((80,690,460,775),radius=35,fill='#f8ffff',outline='#9abfc6',width=6)
    elif kind == 'cafe':
        d.rectangle((0,210,W,810),fill='#e8d5bb')
        d.rectangle((45,265,495,500),fill='#9e7358')
        for xx in (105,260,415): d.ellipse((xx-30,350,xx+30,410),fill='#eacb91')
        d.rounded_rectangle((60,665,480,710),radius=15,fill='#86583f')
    elif kind == 'office':
        d.rectangle((0,200,W,810),fill='#d7e2e9')
        d.rectangle((70,275,470,530),fill='#8fb4c9',outline='#f4f9fc',width=16)
        d.rectangle((55,675,485,720),fill='#8a6c57')
        d.rounded_rectangle((180,555,370,670),radius=10,fill='#2d455d')
        d.rectangle((200,575,350,642),fill='#76bbd3')
    elif kind == 'park':
        d.rectangle((0,600,W,810),fill='#83b38a')
        for xx in (75,430):
            d.rectangle((xx-15,360,xx+15,720),fill='#78543d')
            d.ellipse((xx-90,240,xx+90,465),fill='#4f966c')
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


def action_kind(sentence):
    t=sentence.casefold()
    if any(w in t for w in ('zähne','zahn','teeth','tooth','brush','putzt')): return 'brush'
    if any(w in t for w in ('kasse','bezahlt','bezahlen','checkout','cashier','pays')): return 'checkout'
    if any(w in t for w in ('apfel','apple','nimmt','picks up')): return 'pick'
    if any(w in t for w in ('aufwach','wacht','erwacht','wake','bett','bed')): return 'wake'
    if any(w in t for w in ('kaffee','coffee','trinkt','drinks','cup')): return 'drink'
    if any(w in t for w in ('telefon','handy','phone','message','nachricht')): return 'phone'
    if any(w in t for w in ('liest','lesen','reading','reads','buch','book')): return 'read'
    return 'walk'

def _wake_action(d, tick):
    """Show an actual lying-to-sitting-to-standing wake-up sequence."""
    skin='#e8b68f'
    # Bedroom, window, bedside table and a clearly visible bed.
    d.rectangle((0,190,W,810),fill='#e8ddd2')
    d.rectangle((38,255,205,490),fill='#9bc6d8',outline='#ffffff',width=12)
    d.line((120,260,120,485),fill='#ffffff',width=9)
    d.line((44,370,200,370),fill='#ffffff',width=9)
    d.rectangle((430,565,515,740),fill='#9a755a')
    d.ellipse((447,525,499,578),fill='#f3d8a1')
    d.rounded_rectangle((45,565,425,765),radius=22,fill='#6e85b4')
    d.rounded_rectangle((60,560,410,632),radius=24,fill='#f4eee3')
    # First lie down, then sit up, then stand next to the bed.
    if tick < 1.2:
        lift=min(1.0,tick/1.2)
        hx=160+int(50*lift); hy=605-int(60*lift)
        d.rounded_rectangle((175,603,390,690),radius=28,fill='#487fae')
        d.ellipse((hx-51,hy-47,hx+51,hy+47),fill=skin)
        d.pieslice((hx-53,hy-50,hx+53,hy+38),180,360,fill='#2b344b')
        for ey in (-18,18):
            d.arc((hx-20,hy+ey-2,hx-4,hy+ey+4),0,180,fill='#253449',width=2)
        d.line((250,655,320,675),fill=skin,width=19)
    elif tick < 2.4:
        progress=min(1.0,(tick-1.2)/1.2)
        hx=215+int(35*progress);hy=545-int(45*progress)
        d.rounded_rectangle((170,560,330,685),radius=25,fill='#487fae')
        d.line((200,670,200,760),fill='#263b55',width=24)
        d.line((295,670,305,760),fill='#263b55',width=24)
        d.ellipse((hx-52,hy-55,hx+52,hy+55),fill=skin)
        d.pieslice((hx-54,hy-61,hx+54,hy+32),180,360,fill='#2b344b')
        d.line((190,605,145,665-int(20*progress)),fill=skin,width=20)
        d.line((315,605,365,650-int(30*progress)),fill=skin,width=20)
    else:
        progress=min(1.0,(tick-2.4)/0.8)
        x=315+int(70*progress);y=540-int(45*progress)
        d.line((x-25,y+140,x-30,y+245),fill='#263b55',width=27)
        d.line((x+25,y+140,x+30,y+245),fill='#263b55',width=27)
        d.rounded_rectangle((x-70,y+10,x+70,y+155),radius=28,fill='#487fae')
        d.ellipse((x-61,y-115,x+61,y+15),fill=skin)
        d.pieslice((x-64,y-127,x+64,y-18),180,360,fill='#2b344b')
        for dx in (-23,23): d.ellipse((x+dx-5,y-62,x+dx+5,y-53),fill='#253449')
        d.line((x-60,y+42,x-90,y+110-int(15*math.sin(tick*3))),fill=skin,width=21)
        d.line((x+60,y+42,x+90,y+110+int(15*math.sin(tick*3))),fill=skin,width=21)
    return True

def _action(d, sentence, tick):
    action=action_kind(sentence)
    if action=='walk': return False
    if action=='wake': return _wake_action(d,tick)
    x,y=265,535
    skin='#e8b68f'
    if action=='brush':
        d.rectangle((0,180,W,810),fill='#d8eff0')
        for a in range(0,W,75): d.line((a,180,a,810),fill='#b8d9e0',width=3)
        d.rounded_rectangle((75,250,465,510),radius=15,fill='#f8ffff',outline='#85b4be',width=8)
        d.ellipse((95,690,445,785),fill='#ffffff',outline='#779fa9',width=8)
    elif action in ('pick','checkout'):
        d.rectangle((0,190,W,810),fill='#e9d8bc')
        for yy in (350,535): d.rectangle((0,yy,W,yy+28),fill='#996e50')
        for xx in range(30,520,90):
            d.ellipse((xx,295,xx+43,337),fill='#d44e42')
    elif action in ('drink','phone','read'):
        d.rectangle((0,190,W,810),fill='#e6d9ca')
        d.rectangle((45,290,495,510),fill='#a7c8d6',outline='#ffffff',width=12)
        d.rounded_rectangle((40,710,500,755),radius=12,fill='#8b674f')
    else:
        d.rectangle((0,190,W,810),fill='#e9ded4')
        d.rectangle((50,315,230,530),fill='#a3cfe0',outline='#ffffff',width=12)
        d.rounded_rectangle((50,680,490,790),radius=18,fill='#6581ac')
    d.line((x-25,y+140,x-30,y+245),fill='#263b55',width=29)
    d.line((x+25,y+140,x+30,y+245),fill='#263b55',width=29)
    d.rounded_rectangle((x-70,y+10,x+70,y+155),radius=28,fill='#487fae')
    d.ellipse((x-61,y-115,x+61,y+15),fill=skin)
    d.pieslice((x-64,y-127,x+64,y-18),180,360,fill='#2b344b')
    for dx in (-23,23): d.ellipse((x+dx-5,y-62,x+dx+5,y-53),fill='#253449')
    d.arc((x-17,y-45,x+17,y-23),0,180,fill='#9a615a',width=3)
    d.line((x-60,y+42,x-98,y+126),fill=skin,width=23)
    if action=='brush':
        hx,hy=x+17,y-26+int(15*math.sin(tick*12))
        d.line((x+60,y+42,hx,hy),fill=skin,width=23)
        d.line((hx,hy-15,hx,hy+14),fill='#ffffff',width=9)
        d.rectangle((hx-8,hy-18,hx+8,hy-12),fill='#3aa6d4')
    elif action=='pick':
        reach=(1-math.cos(min(1,tick/1.3)*math.pi))/2
        hx,hy=int(x+65+105*reach),int(y+70-145*reach)
        d.line((x+60,y+42,hx,hy),fill=skin,width=23)
        ax,ay=(hx+14,hy-18) if reach>0.65 else (445,455)
        d.ellipse((ax-20,ay-20,ax+20,ay+20),fill='#d64e40')
        d.line((ax,ay-20,ax+4,ay-31),fill='#477944',width=4)
    elif action=='checkout':
        hx,hy=x+100+int(25*math.sin(tick*4)),y+55
        d.line((x+60,y+42,hx,hy),fill=skin,width=23)
        d.rounded_rectangle((hx-12,hy-10,hx+33,hy+16),radius=4,fill='#edc76f')
        d.rounded_rectangle((395,455,505,605),radius=12,fill='#304659')
        d.rectangle((412,476,487,520),fill='#9bd4b0')
    elif action in ('drink','phone','read'):
        wave=math.sin(tick*3)
        hx,hy=x+28+int(7*wave),y-8+int(6*wave)
        d.line((x+60,y+42,hx,hy),fill=skin,width=23)
        if action=='drink':
            d.rounded_rectangle((hx-18,hy-23,hx+22,hy+15),radius=6,fill='#f7f5e9',outline='#b38b68',width=3)
            d.arc((hx+12,hy-17,hx+37,hy+12),270,90,fill='#f7f5e9',width=6)
        elif action=='phone':
            d.rounded_rectangle((hx-15,hy-34,hx+15,hy+20),radius=5,fill='#27374a')
            d.rectangle((hx-11,hy-27,hx+11,hy+10),fill='#78c2d8')
        else:
            d.polygon([(hx-52,hy-15),(hx,hy-28),(hx,hy+30),(hx-52,hy+18)],fill='#f5f0dc')
            d.polygon([(hx,hy-28),(hx+52,hy-15),(hx+52,hy+18),(hx,hy+30)],fill='#fff8e8')
    else:
        d.line((x+60,y+42,x+90,y+92-int(24*math.sin(tick*3))),fill=skin,width=23)
    return True

def frame(sentence, index, count, tick, duration):
    kind=classify(sentence)
    im=Image.new('RGB',(W,H))
    d=ImageDraw.Draw(im)
    _background(d,kind,tick)
    if not _action(d,sentence,tick):
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
