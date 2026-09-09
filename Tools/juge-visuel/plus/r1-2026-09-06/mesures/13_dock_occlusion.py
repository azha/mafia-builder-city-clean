#!/usr/bin/env python3
"""Occlusion par le dock : geometrie des 4 pastilles, et intersection avec l'encre des
libelles des rangees 17/18/19.
Instrument : la pastille est un disque plus BLEU que la rangee (B-R plus grand) ; on la
detecte par (B-R) > 14 ET lum > 18, puis bornes par colonne.
Controle positif : on doit trouver EXACTEMENT 4 amas ; leurs centres x doivent etre regulierement espaces.
Controle negatif : la meme detection sur une rangee du milieu (y 700) doit rendre 0 amas."""
import os
from PIL import Image
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(D,'capture-1080x2400.png')
im=Image.open(p).convert('RGB'); W,H=im.size; px=im.load()
print(f"ouvre {os.path.basename(p)} taille={im.size}")
def pastille(c): return (c[2]-c[0])>14 and (0.2126*c[0]+0.7152*c[1]+0.0722*c[2])>18
def amas(y):
    on=[x for x in range(W) if pastille(px[x,y])]
    grp=[];cur=[]
    for x in on:
        if cur and x-cur[-1]>4: grp.append(cur); cur=[]
        cur.append(x)
    if cur: grp.append(cur)
    return [(g[0],g[-1]) for g in grp if len(g)>10]
print("CONTROLE NEGATIF y=700 (rangee du milieu) amas =", amas(700))
print("\nprofil des pastilles (y ; amas [x0..x1])")
for y in range(2170,2360,10):
    print(f"  y={y}: {amas(y)}")
# bornes verticales des pastilles
ys=[y for y in range(2100,2400) if len(amas(y))>=4]
print(f"\npastilles presentes (>=4 amas) : y {min(ys)}..{max(ys)}  hauteur={max(ys)-min(ys)+1}")
ym=(min(ys)+max(ys))//2
print(f"  a mi-hauteur y={ym} : {amas(ym)}")

# encre des libelles 17/18/19 et son recouvrement par les pastilles
def Lu(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
print("\nencre claire (lum>95) des rangees basses, et part recouverte par une pastille :")
for a,b,nom in [(2106,2214,'r17 LA DISTRIBUTION'),(2228,2336,'r18 LA LOI'),(2351,2399,'r19 (coupee)')]:
    pts=[(x,y) for y in range(a,min(b,H)) for x in range(W) if Lu(px[x,y])>95]
    if not pts: print(f"  {nom}: aucune encre"); continue
    x0=min(p[0] for p in pts); x1=max(p[0] for p in pts)
    y0=min(p[1] for p in pts); y1=max(p[1] for p in pts)
    print(f"  {nom}: encre bbox x {x0}..{x1} y {y0}..{y1} ({len(pts)} px)")
