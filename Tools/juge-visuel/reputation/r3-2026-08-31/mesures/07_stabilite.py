# -*- coding: utf-8 -*-
"""07 — STABILITÉ : la capture à T et celle à T+1 s doivent être IDENTIQUES (cet écran ne porte
aucune animation — ruling user 2026-08-27). On compte les pixels différents et on rend la boîte
englobante des différences. Aucun chrome n'est présent dans ces captures : rien à exclure.
Contrôle positif : l'image comparée à elle-même doit donner 0 pixel différent.
Contrôle négatif : la 1080x1920 comparée à la 1080x2400 (recadrée) doit en donner beaucoup —
sinon le comparateur ne compare rien."""
from PIL import Image, ImageChops
A='/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png'
B='/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920_t1s.png'
C='/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x2400.png'
def diff(p1,p2,crop=None):
    i1=Image.open(p1).convert('RGB'); i2=Image.open(p2).convert('RGB')
    print('  ',p1.split('/')[-1],i1.size,' vs ',p2.split('/')[-1],i2.size)
    if crop: i2=i2.crop(crop)
    d=ImageChops.difference(i1,i2)
    bb=d.getbbox(); n=sum(c for i,c in enumerate(d.convert('L').histogram()) if i>0)
    mx=max(i for i,c in enumerate(d.convert('L').histogram()) if c)
    return n,bb,mx
print('T vs T+1s        :', diff(A,B))
print('contrôle positif :', diff(A,A))
print('contrôle négatif :', diff(A,C,(0,0,1080,1920)))
