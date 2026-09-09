#!/usr/bin/env python3
"""Verification croisee : les 3 planches partagent-elles la MEME forme ?
(on compare chaque planche a la MAQUETTE, mais on verifie ici que la FORME est
stable entre campagnes, sinon un ecart serait une observation de campagne.)
Controle positif : la largeur du bloc doit valoir 274 CSS sur les 3 planches."""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def ech(f,y0,y1,x0,x1,pct=0.99):
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size; px=im.load()
    ps=[px[x,y] for y in range(y0,y1) for x in range(x0,x1)]; ps.sort(key=lum); n=len(ps)
    return tuple(int(statistics.median([p[i] for p in ps[int(n*pct):]])) for i in range(3)),(W,H)
def largeur(f,y):
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size; px=im.load()
    xs=[x for x in range(W) if px[x,y]==(22,22,28)]
    return (min(xs),max(xs),max(xs)-min(xs)+1) if xs else None

print("=== or du titre 'Le journal' (jeton) sur les 3 planches ===")
for f,(y0,y1) in [('capture-1080x2400.png',(304,370)),
                  ('capture-ecran-seul-1080x2400.png',(304,370)),
                  ('capture-ecran-seul-1080x1920.png',(300,375))]:
    c,(W,H)=ech(f,y0,y1,300,780)
    print(f"  [{f[:32]:32s} {W}x{H}] or = {c}   "
          f"ecart a #f2c96b(242,201,107) = ({c[0]-242:+d},{c[1]-201:+d},{c[2]-107:+d})")
print()
print("=== largeur du bloc de contenu (remplissage 22,22,28) ===")
for f,y in [('reference-1080x2102.png',0),
            ('capture-1080x2400.png',300),('capture-ecran-seul-1080x2400.png',300),
            ('capture-ecran-seul-1080x1920.png',330)]:
    if f.startswith('reference'):
        print(f"  [reference] bordures froides mesurees par 08_structure : x47..1032 = 986px = 273.9 CSS")
        continue
    r=largeur(f,y)
    im=Image.open(os.path.join(D,f)); 
    print(f"  [{f[:32]:32s} {im.size}] y={y} : x={r[0]}..{r[1]}  {r[2]}px = {r[2]/3.6:.2f} CSS "
          f"-> {'OK' if abs(r[2]/3.6-274)<2 else 'ECART'}")
print()
print("=== 1920 : reperes verticaux identiques a 2400 ? ===")
print("  enseigne 267-451 / compteurs 483-642 / carte1 675-888 / carte2 906-1121 : identiques (01_reperes)")
print("  1920 : la liste s'arrete a y=1272 (carte 3 tranchee) ; le panneau explicatif")
print("         occupe 1304-1636 ; il reste 1920-1636 = 284 px de vide sous lui.")
print("  2400 : la liste s'arrete a y=1752 (carte 5 tranchee) ; panneau 1784-2116 ;")
print("         il reste 2400-2116 = 284 px (le dock y loge sous chrome).")
