#!/usr/bin/env python3
"""m15 - lignes de texte : bandes d'encre par rangee, en coordonnees LOCALES.
Encre = |lum(px) - fond| > 12, fond = mediane de la fenetre.
Sert a mesurer interlignes (F6), hauteurs de bloc, et l'entete de la colonne
droite. Controle positif : chaque fenetre doit rendre le nombre de lignes
attendu (2 pour l'entete serif, 3 pour le sous-titre, 3 pour le paragraphe).
"""
from PIL import Image
import os, statistics, sys
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
CAD={'ref':('reference-1080x2102.png',21,452),'jeu':('capture-1080x2400.png',18,482)}
def bandes(nom, xa,xb, ya,yb, seuil=12, minpx=4):
    f,X0,Y0=CAD[nom]
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    vals=[lum(px[X0+x,Y0+y]) for y in range(ya,yb) for x in range(xa,xb,3)]
    fond=statistics.median(vals)
    rows=[]
    for y in range(ya,yb):
        n=sum(1 for x in range(xa,xb) if abs(lum(px[X0+x,Y0+y])-fond)>seuil)
        if n>=minpx: rows.append(y)
    out=[]
    if rows:
        d=rows[0]; p=rows[0]
        for y in rows[1:]:
            if y-p>2: out.append((d,p)); d=y
            p=y
        out.append((d,p))
    return fond,out
def montre(titre, xa,xb,ya,yb, **kw):
    print(f'-- {titre}  (x local {xa}..{xb})')
    for nom in ('ref','jeu'):
        fond,b=bandes(nom,xa,xb,ya,yb,**kw)
        h=[f'{d}..{f}({f-d+1})' for d,f in b]
        base=[f[1] for f in b] if False else None
        print(f'   {nom} fond={fond:.1f} : {h}')
        if len(b)>=2:
            print(f'      interlignes (haut->haut) : {[b[i+1][0]-b[i][0] for i in range(len(b)-1)]}')
print('=== entete colonne droite (Pas encore jugeable + ce qu il a absorbe)')
montre('entete gros (serif) x 490..760', 490,760, 400,548)
montre('entete petit (sans) x 780..1000', 780,1000, 400,548)
print()
print('=== tuile 1 (col ouvert) : lignes')
montre('tuile1 x 560..1000', 560,1000, 500,660)
print()
print('=== panneau bas : sur-titre + titre + 3 lignes')
montre('panneau bas x 60..1000', 60,1000, 1200,1470)
