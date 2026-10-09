#!/usr/bin/env python3
"""P10 — A01 ④, quatre etats.
   (a) la LIGNE DE FILE : hauteur de carte, part de vide, taille et interlettrage de l'etiquette
       de gravite — contre le cadre 4.
   (b) la CARTE DE TETE non-rapports — contre le cadre 5 : on compte les GESTES (boutons) et les
       CONSEQUENCES.

hauteur de carte : bbox du panneau, detecte par sa couleur de fond (plus claire que le decor)
                   sur une colonne traversante ; en px image et en px CSS.
part de vide     : 1 - (pixels d'encre / pixels du panneau), l'encre etant tout pixel s'ecartant
                   de > 28/255 du fond median du panneau.
etiquette        : hauteur de capitale et interlettrage median (ecart entre lettres voisines).
gestes           : composantes « filet d'or ferme » (rectangle arrondi) de plus de 150 px de large
                   dans la carte, + aplats d'or de plus de 10 000 px.

Echelle : 1 px CSS = 3,6 px image des deux cotes.
Controle positif : la ligne de file doit etre IDENTIQUE entre les 4 etats de la capture (meme
                   composant) — si elle ne l'est pas, c'est l'instrument qu'il faut revoir.
Controle negatif : la part de vide mesuree sur une zone de DECOR doit etre tres differente.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from metrique import *

def panneau(im, x, y0, y1, seuil=10):
    """Bornes verticales du panneau le long de la colonne x : paliers de couleur."""
    col = [im.getpixel((x, y)) for y in range(y0, y1)]
    segs, deb = [], 0
    for i in range(1, len(col)):
        if sum(abs(col[i][c] - col[i - 1][c]) for c in range(3)) > seuil:
            if i - deb >= 5:
                s = col[deb:i]
                segs.append((y0 + deb, y0 + i - 1, i - deb,
                             tuple(sorted(q[c] for q in s)[len(s) // 2] for c in range(3))))
            deb = i
    s = col[deb:]
    segs.append((y0 + deb, y1 - 1, len(s), tuple(sorted(q[c] for q in s)[len(s) // 2] for c in range(3))))
    return segs

def vide(im, box, seuil=28):
    px = list(im.crop(box).getdata())
    n = len(px)
    fr = sorted(p[0] for p in px)[n // 2]; fg = sorted(p[1] for p in px)[n // 2]
    fb = sorted(p[2] for p in px)[n // 2]
    enc = sum(1 for p in px if (abs(p[0] - fr) + abs(p[1] - fg) + abs(p[2] - fb)) / 3 > seuil)
    return 1 - enc / n, (fr, fg, fb), n

print("=== P10 (a) : la LIGNE DE FILE ===")
CAS = [("ref", "A01-cadre-4-la-suite", 1490, 1800),
       ("cap", "A01_AccueilFile2Cartes_1080x2400", 1750, 2120),
       ("cap", "A01_AccueilFile2Cartes_TeteRaisonLongue_1080x2400", 1750, 2120),
       ("cap", "A01_AccueilFile2Cartes_TeteDeuxOptions_1080x2400", 1750, 2120),
       ("cap", "A01_AccueilFile2Cartes_TeteNonRapports_1080x2400", 1750, 2120)]
for kind, nom, y0, y1 in CAS:
    im = ouvrir(kind, nom)
    segs = [s for s in panneau(im, 70, y0, y1) if s[2] >= 20]
    print(f"   {nom}")
    print(f"      paliers colonne x=70 : {[(a, b, n, m) for a, b, n, m in segs]}")

print()
print("=== P10 (a) : etiquette de gravite (« LEGERE » ref / « MODEREE » jeu) ===")
ETQ = [("ref", "A01-cadre-4-la-suite", (120, 1620, 420, 1660)),
       ("cap", "A01_AccueilFile2Cartes_1080x2400", (120, 1830, 420, 1870)),
       ("cap", "A01_AccueilFile2Cartes_1080x1920", (120, 1430, 420, 1470))]
for kind, nom, box in ETQ:
    im = ouvrir(kind, nom)
    W, H, bits, f = masque(im, box)
    bs, _ = bandes(bits, W, H)
    if not bs:
        print(f"   {nom} : AUCUNE bande dans {box}")
        continue
    a, b = bs[0]
    ls = [l for l in lettres(bits, W, a, b) if l[1] - l[0] + 1 >= 3]
    hs = sorted(l[3] - l[2] + 1 for l in ls)
    ec = sorted(ls[j + 1][0] - ls[j][1] - 1 for j in range(len(ls) - 1))
    m = metrique(bits, W, a, b)
    print(f"   {nom}  bande y={box[1]+a}..{box[1]+b}  {len(ls)} lettres  "
          f"capH median={hs[len(hs)//2]}px = {hs[len(hs)//2]/K:.2f} css  "
          f"interlettre median={ec[len(ec)//2] if ec else '-'}px = "
          f"{(ec[len(ec)//2]/K if ec else 0):.2f} css  encre x={box[0]+m['x0']}..{box[0]+m['x1']}")

print()
print("=== P10 (b) : carte de tete NON-RAPPORTS contre le cadre 5 — gestes et consequences ===")
oraplat = lambda p: p[0] > 180 and p[0] - p[2] > 80
orfilet = lambda p: 90 < p[0] < 230 and p[0] - p[2] > 40
for kind, nom, box in (("ref", "A01-cadre-5-tete-sur-ligne-haute", (60, 1020, 1030, 1300)),
                       ("cap", "A01_AccueilFile2Cartes_TeteNonRapports_1080x2400", (60, 1480, 1030, 1720))):
    im = ouvrir(kind, nom)
    n_aplat = sum(1 for y in range(box[1], box[3]) for x in range(box[0], box[2])
                  if oraplat(im.getpixel((x, y))))
    print(f"   {nom}  boite des gestes {box} : aplat d'or = {n_aplat} px "
          f"= {100*n_aplat/((box[2]-box[0])*(box[3]-box[1])):.1f} % de la boite")

print()
print("=== CONTROLE POSITIF : la ligne de file est-elle identique entre les 4 etats ? ===")
base = ouvrir("cap", "A01_AccueilFile2Cartes_1080x2400")
for n in ("A01_AccueilFile2Cartes_TeteDeuxOptions_1080x2400",
          "A01_AccueilFile2Cartes_TeteNonRapports_1080x2400"):
    im = ouvrir("cap", n)
    d = sum(1 for y in range(1780, 2100) for x in range(60, 1020)
            if max(abs(base.getpixel((x, y))[c] - im.getpixel((x, y))[c]) for c in range(3)) > 8)
    print(f"   {n} : {d} px differents de l'etat de base sur 307200 ({100*d/307200:.2f} %)")
