#!/usr/bin/env python3
"""Le CTA existe-t-il sous la plaque du registre ? Et ou commence le dock ?
Instrument : pour chaque ligne, on compte les pixels NON-FOND (distance > 24
au noir de fond echantillonne) et on imprime le max de canal.
Controle positif : la plaque beige (y=1992..2130 capture) DOIT ressortir a ~100% ;
controle negatif : une bande de vide (y=800..900 capture) DOIT ressortir a ~0%."""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def charge(path, echelle=1.0):
    im = Image.open(os.path.join(D, path)).convert('RGB')
    print(f"  ouvert: {path}  taille={im.size}")
    if echelle!=1.0:
        im=im.resize((round(im.width*echelle),round(im.height*echelle)),Image.LANCZOS)
        print(f"    -> {im.size}")
    return im

def profil(im, y0, y1, pas=1, fond=(0,0,0)):
    w,h=im.size; px=im.load(); out=[]
    for y in range(y0,min(y1,h)):
        n=0; mx=0
        for x in range(w):
            r,g,b=px[x,y]
            d=abs(r-fond[0])+abs(g-fond[1])+abs(b-fond[2])
            if d>24: n+=1
            mx=max(mx,r,g,b)
        out.append((y,n,round(100*n/w,1),mx))
    return out

print("=== CAPTURE 2026-09-04 (etat vide) ===")
cap = charge('capture-1080x2400.png')
print("  -- controle positif : plaque beige y=2000..2005")
for r in profil(cap,2000,2006): print(f"     y={r[0]} non-fond={r[1]} ({r[2]}%) maxcanal={r[3]}")
print("  -- controle negatif : vide y=800..805")
for r in profil(cap,800,806): print(f"     y={r[0]} non-fond={r[1]} ({r[2]}%) maxcanal={r[3]}")
print("  -- sous la plaque : y=2131..2400, resume par tranche de 10")
p = profil(cap,2131,2400)
for i in range(0,len(p),10):
    tr=p[i:i+10]
    print(f"     y={tr[0][0]}..{tr[-1][0]}  non-fond moy={sum(t[2] for t in tr)/len(tr):5.1f}%  maxcanal={max(t[3] for t in tr)}")

print("\n=== CAPTURE 2026-09-02 (seuil force, liste garnie) ===")
cap2 = charge('capture-seuil-force-1080x2400.png')
print("  -- sous la plaque beige (fin y=1937) : y=1938..2400, tranches de 10")
p = profil(cap2,1938,2400)
for i in range(0,len(p),10):
    tr=p[i:i+10]
    print(f"     y={tr[0][0]}..{tr[-1][0]}  non-fond moy={sum(t[2] for t in tr)/len(tr):5.1f}%  maxcanal={max(t[3] for t in tr)}")
