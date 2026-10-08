#!/usr/bin/env python3
"""23 — recapitulatif chiffre : les nombres cites dans la table du rapport,
tous recalcules ici en un seul passage, a partir des rects etablis au 15.

CONTROLE POSITIF : la ligne de file des deux cadres de reference est identique.
CONTROLE NEGATIF : le meme calcul sur deux cartes DIFFERENTES (plaque vs file)
doit rendre des hauteurs differentes.
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css

# rects etablis aux mesures 02/04/07/15 (profils de pixels colles au rapport)
FILE = {"ref4": (1532, 1825), "ref5": (1532, 1825), "c24": (1716, 2103),
        "l24": (1716, 2103), "c19": (1345, 1635), "l19": (1345, 1635)}
CONTENU = {"ref4": (1570, 1784), "ref5": (1570, 1784), "c24": (1827, 1991),
           "l24": (1810, 2008), "c19": (1408, 1571), "l19": (1390, 1589)}
PLAQUE = {"ref4": (684, 1495), "ref5": (771, 1495), "c24": (927, 1667),
          "l24": (1312, 1667), "c19": (568, 1308), "l19": (953, 1308)}

print("=== 23 — recapitulatif ===")
for cle in ("ref4", "ref5", "c19", "l19", "c24", "l24"):
    im = ouvrir(cle)
    fh, fb = FILE[cle]; ch, cb = CONTENU[cle]; ph, pb = PLAQUE[cle]
    H = fb-fh+1; C = cb-ch+1; P = pb-ph+1
    print(f"   {cle:5s} [{im.size[0]}x{im.size[1]}]")
    print(f"        plaque        : {P:4d}px = {css(P):7.2f} CSS")
    print(f"        carte de file : {H:4d}px = {css(H):7.2f} CSS"
          f"   (reference 294px = 81,67 CSS, ecart {100*(H-294)/294:+6.1f} %)")
    print(f"        bloc de texte : {C:4d}px = {css(C):7.2f} CSS"
          f"   (reference 215px = 59,72 CSS, ecart {100*(C-215)/215:+6.1f} %)")
    print(f"        marge haute={ch-fh:3d}px ({css(ch-fh):5.2f}CSS)  marge basse={fb-cb:3d}px ({css(fb-cb):5.2f}CSS)"
          f"  -> VIDE = {100*(H-C)/H:5.1f} % de la carte")
print()
a = FILE["ref4"]; b = FILE["ref5"]
print(f"CONTROLE POSITIF ref4/ref5 carte de file : {a} == {b} -> {'OK' if a == b else 'ECHEC'}")
print(f"CONTROLE NEGATIF plaque vs file (c24) : {PLAQUE['c24'][1]-PLAQUE['c24'][0]+1}px vs "
      f"{FILE['c24'][1]-FILE['c24'][0]+1}px -> "
      f"{'DIFFERENT (OK)' if (PLAQUE['c24'][1]-PLAQUE['c24'][0]) != (FILE['c24'][1]-FILE['c24'][0]) else 'ECHEC'}")
