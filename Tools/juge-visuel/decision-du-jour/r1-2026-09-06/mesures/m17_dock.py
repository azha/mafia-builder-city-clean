#!/usr/bin/env python3
"""m17 - DOCK : les pastilles d'onglet portent-elles une ICONE ?
Temoin = le canon du HUD designe par le dossier (Tools/juge-visuel/ecran-principal/ecran-canon.png,
1176 px = 392 CSS, x3). Mesure : encre CLAIRE (glyphe blanc) a l'interieur du disque de chaque onglet.
Controle positif : le canon doit rendre une aire d'icone >> 0 sur les 4 onglets.
"""
from PIL import Image
import os, math
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CANON='/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png'
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
can = Image.open(CANON).convert('RGB')
print(f"[CAP] capture-1080x2400.png {cap.size}   [CANON] ecran-canon.png {can.size}")

def cercles(im,y0,y1,x0,x1,label,seuil):
    """detecte les disques d'onglet : pour chaque colonne, hauteur du contour clair"""
    px=im.load()
    # trouve les centres par la ligne mediane
    ym=(y0+y1)//2
    runs=[];cur=None
    for x in range(x0,x1):
        v=max(L(px[x,y]) for y in range(y0,y1))
        if v>seuil:
            if cur is None: cur=[x,x]
            else: cur[1]=x
        else:
            if cur and cur[1]-cur[0]>40: runs.append(tuple(cur))
            cur=None
    if cur and cur[1]-cur[0]>40: runs.append(tuple(cur))
    print(f"[{label}] {len(runs)} disques : {runs}")
    return runs

def icone(im,cx,cy,r,label,i,seuil):
    px=im.load(); n=0; tot=0
    for y in range(cy-r,cy+r):
        for x in range(cx-r,cx+r):
            if (x-cx)**2+(y-cy)**2 <= r*r:
                tot+=1
                if L(px[x,y])>seuil: n+=1
    print(f"   {label} onglet {i} centre=({cx},{cy}) r={r} : px clairs (lum>{seuil}) = {n}/{tot} = {n/tot*100:.2f}%")
    return n/tot*100

print("\n-- CANON (temoin) : disques du dock --")
# dock du canon : y ~ 0.885*2091 .. 0.95*2091
r1=cercles(can,1855,1960,150,1050,'CANON',95)
print("\n-- CAPTURE : disques du dock --")
r2=cercles(cap,2190,2300,120,1000,'CAP',60)

print("\n-- ICONE a l'interieur de chaque disque (rayon = 45% du disque, centre du disque) --")
print("[CANON] CONTROLE POSITIF (les icones doivent etre presentes)")
tc=[]
for i,(a,b) in enumerate(r1):
    cx=(a+b)//2; rr=int((b-a+1)*0.30)
    tc.append(icone(can,cx,1905,rr,'[CANON]',i+1,150))
print("[CAP]")
tp=[]
for i,(a,b) in enumerate(r2):
    cx=(a+b)//2; rr=int((b-a+1)*0.30)
    tp.append(icone(cap,cx,2245,rr,'[CAP]',i+1,120))
print(f"\n  CANON : icone presente sur {sum(1 for v in tc if v>1.0)}/{len(tc)} onglets (seuil 1% de px clairs)")
print(f"  CAP   : icone presente sur {sum(1 for v in tp if v>1.0)}/{len(tp)} onglets")
