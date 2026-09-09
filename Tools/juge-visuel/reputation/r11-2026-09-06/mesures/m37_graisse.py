#!/usr/bin/env python3
"""m37 - GRAISSE : largeur MEDIANE des fûts verticaux, mesuree comme la longueur
mediane des runs horizontaux d'encre a mi-hauteur de capitale (3 rangees).
Convention de bord : COEUR (lum > fond + 55 % de l'amplitude) pour ne pas
compter la frange.
Controle positif : le paragraphe (graisse normale) doit rendre le meme fût des
deux cotes. Controle negatif : les chiffres (gras) doivent differer (m26 : 8 -> 6).
"""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
CAD={'ref':('reference-1080x2102.png',21,452),'jeu':('capture-1080x2400.png',18,482)}
BLOCS=[('chiffres 00 (gras)',        (140,230,273,310),(140,230,267,304)),
       ('col ouvert (gras)',         (600,990,573,594),(600,990,539,560)),
       ('la comptabilite tenue',     (600,990,608,623),(600,990,573,588)),
       ('CTA caps (gras)',           (200,900,1533,1562),(200,900,1538,1567)),
       ('paragraphe ligne 1',        (80,980,1339,1362),(80,980,1347,1370)),
       ('panneau titre serif',       (80,900,1269,1308),(80,900,1280,1319)),
       ('sous-titre caps',           (120,910,137,154),(120,910,143,160)),
       ('REGLES DONNEES (caps)',     (60,320,325,343),(60,320,320,338))]
print(f'{"bloc":26s} {"ref fût":>9s} {"jeu fût":>9s} {"jeu/ref":>8s}  {"n runs ref/jeu"}')
for lab,fr,fj in BLOCS:
    res=[]
    for nom,fen in (('ref',fr),('jeu',fj)):
        f,X0,Y0=CAD[nom]
        im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
        xa,xb,ya,yb=fen
        vals=sorted(lum(px[X0+x,Y0+y]) for y in range(ya,yb) for x in range(xa,xb))
        fond=statistics.median(vals[:len(vals)//2]); coeur=statistics.median(vals[-max(1,len(vals)//40):])
        seuil=fond+0.55*(coeur-fond)
        runs=[]
        for y in range((ya+yb)//2-1,(ya+yb)//2+2):
            cur=0
            for x in range(xa,xb):
                if lum(px[X0+x,Y0+y])>seuil: cur+=1
                else:
                    if 1<=cur<=25: runs.append(cur)
                    cur=0
            if 1<=cur<=25: runs.append(cur)
        res.append((statistics.median(runs) if runs else 0, len(runs)))
    (r1,n1),(r2,n2)=res
    print(f'{lab:26s} {r1:9.1f} {r2:9.1f} {(r2/r1 if r1 else 0):8.3f}  {n1}/{n2}')
