#!/usr/bin/env python3
"""m36 - EPAISSEUR de trait des textes : a largeur et hauteur d'encre egales,
combien de px depassent la moitie du chemin fond->coeur (convention NOMINALE,
mi-alpha) ? Le rapport jeu/ref donne la difference de graisse APPARENTE.
Controle positif : la largeur d'encre doit rester a <=2 % (r10 C11).
Controle negatif : au moins un bloc doit sortir a ~1,00 si l'effet n'est pas
uniforme ; s'ils sortent TOUS au meme facteur, c'est un effet de MODELE.
"""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
CAD={'ref':('reference-1080x2102.png',21,452),'jeu':('capture-1080x2400.png',18,482)}
BLOCS=[('titre Le miroir (serif or)', (320,780,505,570),(320,780,538,603)),
       ('sous-titre caps espacees',   (100,960,130,185),(100,960,136,191)),
       ('chiffres 00 (compteur 1)',   (140,230,265,320),(140,230,259,314)),
       ('libelle REGLES DONNEES',     (60,320,318,352),(60,320,313,347)),
       ('LT. X VOTRE LIEUTENANT',     (90,460,458,528),(90,460,452,522)),
       ('Pas encore jugeable (serif)',(490,770,432,520),(490,770,425,505)),
       ('tuile1 ligne1 col ouvert',   (600,990,568,598),(600,990,534,564)),
       ('tuile1 ligne2 (petit)',      (600,990,602,632),(600,990,568,598)),
       ('Il vous ecoute (serif vert)',(90,460,995,1042),(90,460,988,1035)),
       ('panneau titre (serif creme)',(60,1000,1262,1312),(60,1000,1274,1324)),
       ('panneau paragraphe',         (60,1000,1332,1432),(60,1000,1340,1440)),
       ('CTA (caps or)',              (60,1000,1522,1578),(60,1000,1527,1583))]
print(f'{"bloc":30s} {"ref n":>7s} {"jeu n":>7s} {"jeu/ref":>8s}   {"l ref":>6s} {"l jeu":>6s}   {"h ref":>5s} {"h jeu":>5s}')
rat=[]
for lab,fr,fj in BLOCS:
    r=[]
    for nom,fen in (('ref',fr),('jeu',fj)):
        f,X0,Y0=CAD[nom]
        im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
        xa,xb,ya,yb=fen
        vals=[lum(px[X0+x,Y0+y]) for y in range(ya,yb) for x in range(xa,xb)]
        vals.sort()
        fond=statistics.median(vals[:len(vals)//2])
        coeur=statistics.median(vals[-max(1,len(vals)//60):])
        mi=(fond+coeur)/2
        pts=[(x,y) for y in range(ya,yb) for x in range(xa,xb) if lum(px[X0+x,Y0+y])>mi]
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        r.append((len(pts),max(xs)-min(xs)+1,max(ys)-min(ys)+1,mi))
    (n1,l1,h1,m1),(n2,l2,h2,m2)=r
    rat.append(n2/n1)
    print(f'{lab:30s} {n1:7d} {n2:7d} {n2/n1:8.3f}   {l1:6d} {l2:6d}   {h1:5d} {h2:5d}')
print(f'\n  rapport jeu/ref : min {min(rat):.3f} max {max(rat):.3f} moyenne {statistics.mean(rat):.3f} '
      f'ecart-type {statistics.pstdev(rat):.3f}')
