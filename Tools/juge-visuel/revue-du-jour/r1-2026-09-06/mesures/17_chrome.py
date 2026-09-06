#!/usr/bin/env python3
"""Chrome partage : fond du bandeau, pastilles du dock (icone ou non), 2e ligne
du bloc JOUR. Compare au canon HUD remis a 1080 de large (1176 -> x0,9184).
Controle positif : le filet dore sous le bandeau doit etre trouve des DEUX cotes."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); print('capture',cap.size)
can=Image.open('/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png').convert('RGB')
print('canon HUD',can.size)
can=can.resize((1080,round(can.height*1080/can.width)),Image.LANCZOS); print('  -> ',can.size)
def med(im,cx,cy,r=8):
    px=im.load(); v=[px[x,y] for x in range(cx-r,cx+r+1) for y in range(cy-r,cy+r+1)]
    return tuple(sorted(c[i] for c in v)[len(v)//2] for i in range(3))
print("\n--- fond du bandeau (mediane 17x17), 4 sondes ---")
for x in [60,250,830,1020]:
    print(f"  x={x:4d} y=60 : capture={med(cap,x,60)}  canon={med(can,x,60)}")
print("\n--- variance du fond du bandeau (ecart-type de la luminance, y 20..120) ---")
def var(im,y0,y1):
    px=im.load(); v=[lum(px[x,y]) for y in range(y0,y1,3) for x in range(0,1080,5)]
    m=sum(v)/len(v); return round(m,1), round((sum((k-m)**2 for k in v)/len(v))**0.5,1)
print(f"  capture : moyenne/ecart-type = {var(cap,20,120)}")
print(f"  canon   : moyenne/ecart-type = {var(can,20,120)}")
print("\n--- filet dore sous le bandeau (controle positif) ---")
def filet(im,y0,y1,x=300):
    px=im.load()
    return [(y,tuple(px[x,y])) for y in range(y0,y1) if px[x,y][0]>100 and px[x,y][0]>px[x,y][2]+30]
print(f"  capture x=300 : {filet(cap,125,160)}")
print(f"  canon   x=300 : {filet(can,110,150)}")
print("\n--- pastilles du dock : encre CLAIRE a l'interieur du cercle ---")
def interieur(im,cx,cy,r,nom):
    px=im.load(); n=0; mx=0
    for y in range(cy-r,cy+r):
        for x in range(cx-r,cx+r):
            if (x-cx)**2+(y-cy)**2 <= (r*0.62)**2:
                l=lum(px[x,y]); mx=max(mx,l)
                if l>90: n+=1
    print(f"  [{nom}] centre=({cx},{cy}) r={r} : px clairs (L>90) = {n}, L max = {mx:.0f}")
# capture : cercles mesures visuellement, centres approx
# centres des 4 pastilles, mesures sur l'image : bbox des cercles
def cercles(im,y0,y1):
    px=im.load(); cols=[]
    for x in range(1080):
        n=sum(1 for y in range(y0,y1) if lum(px[x,y])>28)
        cols.append(n)
    segs=[];deb=None
    for x in range(1080):
        if cols[x]>4 and deb is None: deb=x
        elif cols[x]<=4 and deb is not None:
            if x-deb>40: segs.append((deb,x-1,(deb+x-1)//2))
            deb=None
    return segs
print("  capture, bande du dock y=2180..2310 :", cercles(cap,2180,2310))
print("  canon,   bande du dock y=%d..%d :"%(can.height-230,can.height-110), cercles(can,can.height-230,can.height-110))
for cx in [c[2] for c in cercles(cap,2180,2310)]:
    interieur(cap,cx,2245,65,f'capture pastille x={cx}')
for cx in [c[2] for c in cercles(can,can.height-230,can.height-110)]:
    interieur(can,cx,can.height-175,60,f'canon pastille x={cx}')
