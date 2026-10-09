#!/usr/bin/env python3
"""P4 — E11 ⑤ : l'eyebrow « CE QUI PESE LE PLUS ... ».
   ou il se pose (tapis ou carte), couleur d'encre, centrage, contraste.

  support   : couleur mediane du fond immediatement AUTOUR de l'encre (3 px au-dessus et au-dessous
              de la bande), comparee au vert du tapis et au creme de la carte, tous deux echantillonnes
              dans la MEME image -> on nomme le support par identification, pas par impression.
  encre     : mediane des pixels les plus eloignes du fond dans la bande (coeur des glyphes)
  centrage  : centre de l'ENCRE (x0+x1)/2 contre le centre du PANNEAU vert, pas le centre de l'ecran
  contraste : WCAG encre / support
Echelle : 1 px CSS = 3,6 px image des deux cotes.
Controle positif : le creme de la carte et le vert du tapis doivent etre bien separes dans chaque image.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from metrique import *

def coeur(im, box, fond, q=0.90):
    """Mediane RGB des pixels de la fenetre les plus eloignes du fond (le coeur des glyphes)."""
    px = list(im.crop(box).getdata())
    px.sort(key=lambda p: -(abs(p[0] - fond[0]) + abs(p[1] - fond[1]) + abs(p[2] - fond[2])))
    k = max(1, int(len(px) * 0.04))
    top = px[:k]
    return tuple(sorted(p[c] for p in top)[k // 2] for c in range(3))

CAS = [
    ("ref", "E11-cadre-04-la-carte-distribuee", (40, 780, 1040, 840), (60, 700, 1020, 1900), (200, 1100, 260, 1200)),
    ("cap", "E11_DecisionDetail_1080x2400",     (20, 1010, 1060, 1070), (20, 960, 1060, 1860), (200, 1300, 260, 1400)),
    ("cap", "E11_DecisionDetail_1080x1920",     (20,  810, 1060,  870), (20, 760, 1060, 1660), (200, 1100, 260, 1200)),
]
print("=== P4 : l'eyebrow de E11 ⑤ ===")
for kind, nom, box, pan, carte in CAS:
    im = ouvrir(kind, nom)
    W, H, bits, f = masque(im, box)
    bs, _ = bandes(bits, W, H)
    a, b = bs[0]
    m = metrique(bits, W, a, b)
    ya, yb = box[1] + a, box[1] + b
    xa, xb = box[0] + m['x0'], box[0] + m['x1']
    # support : 6 px au-dessus de la bande, sur toute sa largeur
    (sup, _) = med(im, xa, ya - 10, xb, ya - 4)
    enc = coeur(im, (xa, ya, xb + 1, yb + 1), sup)
    # temoins de matiere dans la MEME image
    (vert, _) = med(im, 60, ya + 40, 120, ya + 90)        # tapis a gauche de la carte
    (crm, _) = med(im, *carte)                             # interieur de la carte
    print(f"   {nom}")
    print(f"      bande y={ya}..{yb}  encre x={xa}..{xb} (largeur {xb-xa+1}px = {(xb-xa+1)/K:.1f} css)"
          f"  capH={m['capH']}px = {m['capH']/K:.2f} css  interlettre={m['trait']}px")
    print(f"      support sous/au-dessus de l'encre RGB={sup}   tapis vert RGB={vert}   carte creme RGB={crm}")
    dv = sum(abs(sup[c] - vert[c]) for c in range(3))
    dc = sum(abs(sup[c] - crm[c]) for c in range(3))
    print(f"      distance au tapis={dv}  distance a la carte={dc}  ->  POSE SUR "
          + ("LE TAPIS" if dv < dc else "LA CARTE"))
    print(f"      encre RGB={enc}   contraste encre/support = {contraste(enc, sup):.2f}:1")
    centre_encre = (xa + xb) / 2
    print(f"      centre de l'encre x={centre_encre:.1f}  centre de l'ecran x=539.5  "
          f"decalage={centre_encre-539.5:+.1f}px = {(centre_encre-539.5)/K:+.2f} css")
    print(f"      marge gauche={xa}px = {xa/K:.1f} css   marge droite={1079-xb}px = {(1079-xb)/K:.1f} css")
    print(f"      CONTROLE POSITIF : tapis vs carte separes de {sum(abs(vert[c]-crm[c]) for c in range(3))} "
          + ("(OK)" if sum(abs(vert[c] - crm[c]) for c in range(3)) > 150 else "(TROP PROCHE)"))
