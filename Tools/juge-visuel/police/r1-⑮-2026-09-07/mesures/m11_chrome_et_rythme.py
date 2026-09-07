# -*- coding: utf-8 -*-
"""m11 — (a) geometrie du chrome de la capture (bandeau, dock, gouttiere) ; (b) collision ARGENT/medaillon ;
        (c) rythme vertical du contenu (pas des rangees) capture vs canon.
Contrôle positif : hauteur de bandeau derivee du code = 52 CSS-HUD x 2,755 = 143,3 px ; on doit
                   retrouver le filet a 141..143 (ecart <= 2 px).
Contrôle negatif : la meme sonde appliquee a y=1500 (plein vide) ne doit trouver aucun filet.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im = Image.open(os.path.join(D, 'capture-1080x2400.png')).convert('RGB')
print("OUVERT capture taille=%s" % (im.size,)); px = im.load(); g = im.convert('L'); pg = g.load()
W, H = im.size

def largeur_ligne(y, seuil=30):
    return sum(1 for x in range(W) if pg[x, y] > seuil)

print()
print("(a) FILETS pleine largeur (>700 px clairs) :")
for y in range(0, H):
    n = largeur_ligne(y)
    if n > 700: print("    y=%4d  %4d px clairs  RGB milieu-gauche=%s" % (y, n, px[200, y]))
print("CONTROLE POSITIF bandeau derive = 143,3 px ; filet mesure ci-dessus")
print("CONTROLE NEGATIF y=1500 -> %d px clairs (attendu 0)" % largeur_ligne(1500))

print()
print("(b) COLLISION ARGENT / MEDAILLON")
# bord gauche du disque du medaillon : chercher la 1re colonne 'braise' sur la ligne du centre du disque
cy = 95
bord = None
for x in range(300, 560):
    r, gg, b = px[x, cy]
    if r > 120 and r - b > 60: bord = x; break
print("    anneau braise du medaillon : 1re colonne chaude a x=%s (ligne y=%d, RGB=%s)" % (bord, cy, px[bord, cy] if bord else None))
# encre du montant ARGENT (or) : derniere colonne d'or avant/apres ce bord
derniere_or = None
for x in range(150, 560):
    for y in range(60, 110):
        r, gg, b = px[x, y]
        if r > 150 and gg > 110 and b < 110 and r-b > 70: derniere_or = x; break
print("    derniere colonne d'or du montant : x=%s" % derniere_or)
if bord and derniere_or:
    print("    => le montant %s le disque : recouvrement = %d px"
          % ("DEBORDE SOUS" if derniere_or > bord else "s'arrete avant", derniere_or - bord))

print()
print("(c) DOCK — extremites")
ys = [y for y in range(2100, H) if largeur_ligne(y, 24) > 3]
print("    premiere ligne d'encre du dock : y=%s ; derniere : y=%s" % (min(ys), max(ys)))
print("    hauteur du dock (encre) = %d px = %.1f CSS-HUD (/2,755)" % (max(ys)-min(ys)+1, (max(ys)-min(ys)+1)/2.755))
print("    gouttiere basse : du bas du contenu (y=1113) au haut du dock (y=%d) = %d px" % (min(ys), min(ys)-1113))

print()
print("(d) RYTHME VERTICAL du contenu de la capture — pas entre les rangees (centres d'encre)")
B = [(268,303,'titre'),(344,368,'sous-titre'),(404,435,'Charge'),(457,482,'PAR GRAVITE'),
     (515,545,'Critique'),(568,597,'Elevee'),(630,659,'Moyenne'),(687,712,'Faible'),
     (744,764,'PAR PROVENANCE'),(796,827,'Programmee'),(855,879,'Indicateur'),(912,941,'Faux rapport'),
     (968,998,'Rapport fonde'),(1026,1051,'Cascade'),(1082,1113,'Medico-legal')]
prev = None
for a, b, n in B:
    c = (a+b)/2.0
    print("    %-16s centre y=%7.1f  pas=%s" % (n, c, ("%.1f px / %.2f CSS" % (c-prev, (c-prev)/3.6)) if prev else "-"))
    prev = c
