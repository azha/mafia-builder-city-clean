#!/usr/bin/env python3
"""m34 - contraste WCAG des textes principaux, par bande d'encre auto-detectee.
Encre = 10 % des px les plus clairs de la bande ; fond = mediane des px sombres
de la fenetre. Coordonnees LOCALES du cadre.
Controle positif : le titre doit ressortir a ~11,8 (ref) / ~11,6 (jeu) (m06).
"""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lin(c):
    c/=255.0
    return c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
def Lu(p): return 0.2126*lin(p[0])+0.7152*lin(p[1])+0.0722*lin(p[2])
def contraste(a,b):
    la,lb=Lu(a),Lu(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
CAD={'ref':('reference-1080x2102.png',21,452),'jeu':('capture-1080x2400.png',18,482)}
FEN=[('titre Le miroir',        (320,780,500,600),(320,780,533,610)),
     ('sous-titre enseigne',    (120,960,120,215),(120,960,110,205)),
     ('libelle compteur 1',     (60,310,315,355),(60,310,310,350)),
     ('LT. X, VOTRE LIEUTENANT',(90,460,455,530),(90,460,450,525)),
     ('Il vous ecoute',         (90,460,995,1040),(90,460,988,1035)),
     ('entete Pas encore jug.', (490,770,430,520),(490,770,425,505)),
     ('entete ce qu il a...',   (780,1000,440,535),(780,1000,420,500)),
     ('tuile1 ligne 1',         (600,990,570,596),(600,990,536,562)),
     ('tuile1 ligne 2',         (600,990,604,630),(600,990,570,594)),
     ('panneau surtitre',       (60,1000,1222,1252),(60,1000,1234,1264)),
     ('panneau titre',          (60,1000,1262,1312),(60,1000,1274,1324)),
     ('panneau paragraphe',     (60,1000,1332,1432),(60,1000,1340,1440)),
     ('CTA',                    (60,1000,1520,1580),(60,1000,1525,1585))]
for lab,fr,fj in FEN:
    out=[]
    for nom,fen in (('ref',fr),('jeu',fj)):
        f,X0,Y0=CAD[nom]
        im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
        xa,xb,ya,yb=fen
        vals=[(lum(px[X0+x,Y0+y]),px[X0+x,Y0+y]) for y in range(ya,yb) for x in range(xa,xb)]
        vals.sort(key=lambda t:-t[0])
        top=vals[:max(1,len(vals)//12)]
        bas=vals[-len(vals)//3:]
        enc=tuple(int(statistics.median([t[1][i] for t in top])) for i in range(3))
        fnd=tuple(int(statistics.median([t[1][i] for t in bas])) for i in range(3))
        out.append((enc,fnd,contraste(enc,fnd)))
    (e1,f1,c1),(e2,f2,c2)=out
    print(f'{lab:26s} ref encre {str(e1):18s} fond {str(f1):16s} {c1:6.2f}  |  '
          f'jeu encre {str(e2):18s} fond {str(f2):16s} {c2:6.2f}   d={c2-c1:+.2f}')
