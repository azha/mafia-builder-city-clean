#!/usr/bin/env python3
"""Graisse du titre du bandeau — hors perimetre P1-P14 mais vu sans le chercher (A/B).

Deux mesures independantes :
  (a) mediane des segments horizontaux d'encre dans la bande d'x  (= largeur de fut)
  (b) COMPTE D'ENCRE sur le couple a contenu IDENTIQUE : E03 « Commander de la matiere premiere »
      est le MEME texte dans la reference et dans la capture ; a hauteur d'x egale, le rapport
      des comptes d'encre est le rapport des graisses, sans biais de contenu.

Controle positif : sur E03 le sous-titre est AUSSI le meme texte des deux cotes -> son rapport
                   d'encre doit valoir ~1,0 (meme graisse). C'est le temoin interne de la mesure (b).
Controle negatif : E06, dont le titre de la capture est visiblement gras, doit rendre trait=9 comme sa reference.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from metrique import *

def encre(kind, nom, box, idx):
    im = ouvrir(kind, nom)
    W, H, bits, f = masque(im, box)
    bs, _ = bandes(bits, W, H)
    a, b = bs[idx]
    m = metrique(bits, W, a, b)
    n = sum(1 for y in range(a, b + 1) for x in range(W) if bits[y][x])
    larg = m['x1'] - m['x0'] + 1
    return dict(n=n, xH=m['xH'], trait=m['trait'], larg=larg,
                dens=n / float(larg * m['xH']), y=(box[1] + a, box[1] + b))

print("=== (b) E03 : MEME texte de titre des deux cotes ===")
print("    reference  : « Commander de la matiere premiere »")
print("    capture    : « Commander de la matiere premiere »  (lu a l'image)")
r = encre("ref", "E03-cadre-48",              (40, 420, 1040, 600), 0)
c = encre("cap", "E03_Chanedappro_1080x2400", (40, 500, 1040, 670), 0)
c2 = encre("cap", "E03_Chanedappro_1080x1920", (40, 400, 1040, 570), 0)
for e, d in (("ref      ", r), ("cap 2400 ", c), ("cap 1920 ", c2)):
    print(f"   titre {e} encre={d['n']:6d}px  largeur={d['larg']:4d}px  xH={d['xH']}px "
          f"trait={d['trait']}px  densite={d['dens']:.3f}")
print(f"   RAPPORT d'encre titre capture/reference = {c['n']/r['n']:.3f} (2400) "
      f"/ {c2['n']/r['n']:.3f} (1920)")
print(f"   RAPPORT de largeur d'encre              = {c['larg']/r['larg']:.3f} (2400)")

print()
print("=== CONTROLE POSITIF interne : le SOUS-TITRE de E03 est aussi le meme texte ===")
rs = encre("ref", "E03-cadre-48",              (40, 420, 1040, 600), 1)
cs = encre("cap", "E03_Chanedappro_1080x2400", (40, 500, 1040, 670), 1)
print(f"   ssTitre ref  encre={rs['n']:6d}px largeur={rs['larg']}px xH={rs['xH']} trait={rs['trait']}")
print(f"   ssTitre cap  encre={cs['n']:6d}px largeur={cs['larg']}px xH={cs['xH']} trait={cs['trait']}")
print(f"   RAPPORT d'encre sous-titre capture/reference = {cs['n']/rs['n']:.3f}  (attendu ~1,0)")

print()
print("=== CONTROLE NEGATIF : E06 (titre visiblement gras en jeu) ===")
r6 = encre("ref", "E06-cadre-79",            (40, 420, 1040, 600), 0)
c6 = encre("cap", "E06_Dmolition_1080x2400", (40, 500, 1040, 700), 0)
print(f"   E06 ref titre trait={r6['trait']}px densite={r6['dens']:.3f}")
print(f"   E06 cap titre trait={c6['trait']}px densite={c6['dens']:.3f}")
print("   -> l'instrument NE rend PAS 6 partout :",
      "il discrimine" if c6['trait'] != 6 else "il ne discrimine pas")

print()
print("=== (a) largeur de fut, les 5 ecrans ===")
for ec, rn, rb, cn, cb in (
    ("E02", "E02-cadre-85", (40, 420, 1040, 600), "E02_Carnet_1080x2400",       (40, 500, 1040, 670)),
    ("E03", "E03-cadre-48", (40, 420, 1040, 600), "E03_Chanedappro_1080x2400",  (40, 500, 1040, 670)),
    ("E04", "E04-cadre-54", (40, 420, 1040, 600), "E04_Distribution_1080x2400", (40, 500, 1040, 670)),
    ("E05", "E05-cadre-67", (40, 420, 1040, 600), "E05_Loi_1080x2400",          (40, 500, 1040, 670)),
    ("E06", "E06-cadre-79", (40, 420, 1040, 600), "E06_Dmolition_1080x2400",    (40, 500, 1040, 700))):
    a = encre("ref", rn, rb, 0); b = encre("cap", cn, cb, 0)
    print(f"   {ec}: ref trait={a['trait']}px dens={a['dens']:.3f} | cap trait={b['trait']}px "
          f"dens={b['dens']:.3f} | delta dens={100*(b['dens']-a['dens'])/a['dens']:+6.1f} %")
