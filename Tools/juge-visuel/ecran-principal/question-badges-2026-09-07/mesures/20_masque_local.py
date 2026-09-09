# Masque local "surface claire/bleutee" (toit, parapet) vs "sol sombre", superpose a la decoupe.
# Sert a MESURER la distance de l'ancrage au bord de toit le plus proche, sans juger a l'oeil.
from PIL import Image, ImageDraw
import math,sys
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); W,H=im.size; px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
def go(k,ax,ay,R,Lmin,BRmin,excl):
    x0,y0=int(ax)-R,int(ay)-R
    base=im.crop((x0,y0,x0+2*R,y0+2*R)).convert('RGB')
    ov=base.copy(); op=ov.load()
    hits=[]
    for j in range(2*R):
        for i in range(2*R):
            X,Y=x0+i,y0+j
            if excl[0]<=X<=excl[2] and excl[1]<=Y<=excl[3]: continue
            r,g,b=px[X,Y]; L=(r*299+g*587+b*114)//1000
            if L>=Lmin and (b-r)>=BRmin:
                op[i,j]=(255,0,0); hits.append((X,Y))
    d=min((math.hypot(X-ax,Y-ay),X,Y) for X,Y in hits) if hits else None
    Z=8
    ov=ov.resize((2*R*Z,2*R*Z),Image.NEAREST)
    dr=ImageDraw.Draw(ov); pxx,pyy=(ax-x0)*Z,(ay-y0)*Z
    dr.line([pxx-8*Z,pyy,pxx+8*Z,pyy],fill=(0,255,0),width=2)
    dr.line([pxx,pyy-8*Z,pxx,pyy+8*Z],fill=(0,255,0),width=2)
    if d: dr.line([pxx,pyy,(d[1]-x0)*Z,(d[2]-y0)*Z],fill=(0,255,0),width=3)
    dr.text((6,6),f'G{k} rouge = L>={Lmin} et B-R>={BRmin} ; exclusion badge {excl}',fill=(0,255,0))
    ov.save(f'masque-G{k}.png')
    print(f'  G{k} : {len(hits)} px classes surface-claire dans la fenetre ({x0},{y0})-({x0+2*R},{y0+2*R})')
    if d: print(f'     plus proche : ({d[1]},{d[2]}) distance = {d[0]:.1f} px')
    print(f'     ecrit masque-G{k}.png')
go(5,347.5,765,60,85,26,(310,735,385,772))
