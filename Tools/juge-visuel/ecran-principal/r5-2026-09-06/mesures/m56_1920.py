# Les memes grandeurs decisives sur la capture 1080x1920 (resolution native de l'art).
from common import *
c=op(C19); px=c.load()
print('  aile droite a 1920 : encre par ligne, x 960..1080')
base=20
for y in range(28,140,2):
    xs=[x for x in range(960,1080) if lum(px[x,y])-base>35]
    if xs: print(f'    y={y:3d} ({y/CAP_S:6.2f} CSS) x {min(xs)}..{max(xs)} = {min(xs)/CAP_S:6.2f}..{(max(xs)+1)/CAP_S:6.2f} CSS  {"COUPE" if max(xs)>=1078 else ""}')
print()
print('  ronds du dock a 1920 :')
for y in (1745,1755):
    vals=[lum(px[x,y]) for x in range(100,1000)]
    b=sorted(vals)[len(vals)//2]
    hits=[x for x in range(100,1000) if lum(px[x,y])-b>5]
    segs=[];cur=None
    for x in hits:
        if cur is None: cur=[x,x]
        elif x-cur[1]<=4: cur[1]=x
        else: segs.append(tuple(cur)); cur=[x,x]
    if cur: segs.append(tuple(cur))
    if len(segs)>=8:
        for i in range(0,len(segs)-1,2):
            a,b2=segs[i],segs[i+1]
            print(f'    y={y} rond diam {(b2[1]-a[0]+1)/CAP_S:.2f} CSS centre {(a[0]+b2[1])/2/CAP_S:.2f} CSS')
