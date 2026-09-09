#!/usr/bin/env python3
"""m02 - gouttiere : bas du bandeau, haut du dock, bornes du cadre.
Convention de bord : NOMINALE a mi-alpha -> un pixel appartient au trait si sa
luminance (ou son 'or-ness') depasse la moitie entre fond local et coeur.
Ici on repere : (a) le filet horizontal du bandeau (bande or pleine largeur la
plus haute), (b) le haut du dock = premier y, en partant du bas, ou une rangee
contient un pixel du CERCLE d'onglet (liseré bleute clair sur fond sombre).
Controle positif : la largeur mesuree du bandeau doit valoir 1080 px.
Controle negatif : une rangee prise au milieu du cadre ne doit contenir aucun
pixel de cercle d'onglet.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

for f,h in [('reference-1080x2102.png',2102),('capture-1080x1920.png',1920),('capture-1080x2400.png',2400)]:
    im = Image.open(os.path.join(D,f)).convert('RGB'); px = im.load(); w,H = im.size
    print(f'=== {f} taille={im.size}')
    assert H==h
    # profil de luminance moyenne par rangee, colonnes 100..980 (evite les filets verticaux)
    prof = []
    for y in range(H):
        s=0
        for x in range(100,980,4): s += lum(px[x,y])
        prof.append(s/220)
    # bas du bandeau : le filet or plein largeur le plus haut (m01) ; on le redonne
    # haut du dock : on cherche, dans le tiers bas, le premier y (du bas vers le haut)
    # ou la rangee contient >=4 groupes de pixels 'liseré d'onglet'
    # liseré = pixel plus clair que son voisinage a 30 px, dans la moitie basse
    def rangee_cercles(y):
        n=0; prev=False
        for x in range(60,1020):
            p=px[x,y]; l=lum(p)
            fond = (lum(px[max(0,x-35),y])+lum(px[min(1079,x+35),y]))/2
            c = (l-fond) > 6
            if c and not prev: n+=1
            prev=c
        return n
    haut_dock=None
    for y in range(H-1, H//2, -1):
        if rangee_cercles(y)>=6:
            haut_dock=y
    print('  premier y (du haut) portant >=6 transitions de liseré dans le tiers bas :', haut_dock)
    # profil imprime toutes les 20 rangees dans les 400 dernieres
    print('  luminance moyenne, 30 dernieres rangees par pas de 10 :',
          [f'{y}:{prof[y]:.1f}' for y in range(H-300,H,20)])
    print('  luminance moyenne autour du bandeau :',
          [f'{y}:{prof[y]:.1f}' for y in range(120,230,10)])
