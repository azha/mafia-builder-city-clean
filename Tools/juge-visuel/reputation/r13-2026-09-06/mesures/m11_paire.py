# m11 — ANIMATION : la paire T / T+1 s (ecran seul, 1920). Ruling user 2026-08-27 : AUCUNE animation
#   sur un nouvel ecran. Tout px qui bouge est un ecart.
# Controle positif : la meme sonde entre T et la planche SOUS CHROME de la meme resolution doit rendre
#   un compte MASSIF (les deux images ne sont pas identiques) — l'instrument sait voir une difference.
# Controle negatif : T contre LUI-MEME doit rendre 0.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

T=ouvrir('capture-ecran-seul-1080x1920-T.png')
T1=ouvrir('capture-ecran-seul-1080x1920-T+1s.png')
SC=ouvrir('capture-1080x1920.png')
a,b,c=px(T),px(T1),px(SC)
W,H=T.size
cnt={1:0,8:0,32:0}; mx=(0,None); cols=set(); rows=set()
for y in range(H):
    for x in range(W):
        d=dist(a[x,y],b[x,y])
        if d>=1:
            cnt[1]+=1; cols.add(x); rows.add(y)
            if d>=8: cnt[8]+=1
            if d>=32: cnt[32]+=1
            if d>mx[0]: mx=(d,(x,y))
print(f"\n  T vs T+1 s : px >=1/255 : {cnt[1]} ({100*cnt[1]/(W*H):.5f} %) · >=8 : {cnt[8]}"
      f" · >=32 : {cnt[32]} · max {mx[0]}/255 en {mx[1]}")
if cols:
    print(f"  colonnes mobiles x {min(cols)}..{max(cols)} ; rangees mobiles y {min(rows)}..{max(rows)}")
    seg=[];rs=sorted(rows)
    for y in rs:
        if seg and y-seg[-1][-1]<=3: seg[-1].append(y)
        else: seg.append([y])
    print(f"  blocs de rangees mobiles : {[(s[0],s[-1]) for s in seg]}")
n=sum(1 for y in range(0,H,3) for x in range(0,W,3) if dist(a[x,y],c[x,y])>=1)
print(f"  [controle positif] T vs planche SOUS CHROME (echantillon 1/9) : {n} px differents")
n0=sum(1 for y in range(0,H,3) for x in range(0,W,3) if dist(a[x,y],a[x,y])>=1)
print(f"  [controle negatif] T contre lui-meme : {n0} px")
# le nom du lieutenant est-il la des T ?  (libelle de la carte portrait)
def clair(p,x,y): return p[x,y][0]>90 and p[x,y][1]>90
for nom,p in (('T',a),('T+1s',b)):
    ys=[y for y in range(600,780) if sum(1 for x in range(95,490) if clair(p,x,y))>3]
    seg=[]
    for y in ys:
        if seg and y-seg[-1][-1]<=4: seg[-1].append(y)
        else: seg.append([y])
    print(f"  libelle de la carte, {nom} : {len(seg)} ligne(s) -> {[(s[0],s[-1]) for s in seg]}")

print("\n  Detail par bloc de rangees mobiles (x mobiles, nb px) :")
par={}
for y in range(H):
    xs=[x for x in range(W) if dist(a[x,y],b[x,y])>=8]
    if xs: par[y]=xs
seg=[];rs=sorted(par)
for y in rs:
    if seg and y-seg[-1][-1]<=3: seg[-1].append(y)
    else: seg.append([y])
for s in seg:
    xs=[x for y in s for x in par[y]]
    print(f"   y {s[0]}..{s[-1]} : x {min(xs)}..{max(xs)} ; {len(xs)} px")
