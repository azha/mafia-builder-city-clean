"""m20 — jetons d'accent localises par leur TEINTE (et non par une coordonnee devinee).
Controle positif : chaque famille doit rendre >=200 px dans les 2 images.
Controle negatif : la famille VERT ne doit rien rendre dans la boite du CTA (or).
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from collections import Counter
FAM = {
 'VERT  (Il vous ecoute)': lambda c: c[1]>c[0]+28 and c[1]>c[2]+28 and lum(c)>80,
 'CREME (col + CTA txt) ': lambda c: c[0]>190 and c[1]>180 and c[2]>170 and abs(c[0]-c[1])<25,
 'OR    (titre/CTA)     ': lambda c: c[0]>200 and (c[0]-c[2])>60 and c[1]>150,
 'CYAN  (chiffres)      ': lambda c: c[2]>150 and (c[2]-c[0])>50 and c[1]>140,
}
for nom in ('reference-1080x2102.png','capture-1080x2400.png'):
    print("="*60); im=ouvrir(nom); p=im.load(); W,H=im.size
    for lab,f in FAM.items():
        cnt=Counter(); ys=[]
        for y in range(0,H,1):
            for x in range(0,W,2):
                c=p[x,y]
                if f(c): cnt[c]+=1; ys.append(y)
        if cnt:
            dom,n=cnt.most_common(1)[0]
            print(f"  {lab} : n={sum(cnt.values())*2}  dominante={dom}  y {min(ys)}..{max(ys)}")
        else:
            print(f"  {lab} : AUCUN")
