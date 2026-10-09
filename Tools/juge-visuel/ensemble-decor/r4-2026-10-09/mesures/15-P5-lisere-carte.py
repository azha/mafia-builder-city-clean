#!/usr/bin/env python3
"""P5 — E11 ⑤ : le lisere INTERIEUR de la carte (couleur, epaisseur) contre le cadre 4.
    + P4 (reprise) : l'eyebrow de la capture 1080x1920, dont la fenetre du script 14 etait
      tombee DANS la carte (le controle positif de ce script-la l'avait signale : tapis et carte
      separes de 0). On la replace ici, bande lue au profil.

Lisere : profil horizontal qui traverse le bord GAUCHE de la carte, a une hauteur SANS texte.
On nomme chaque palier : tapis vert -> bord exterieur de la carte -> creme -> LISERE -> creme.
Epaisseur = largeur du palier du lisere ; couleur = sa mediane RGB.
Echelle : 1 px CSS = 3,6 px image des deux cotes. Tolerance d'aplat : 6/255 ; de position : 2 px.
Controle positif : le meme profil pris a une autre hauteur de la MEME carte doit rendre le meme lisere.
Controle negatif : un profil pris HORS de la carte (dans le tapis) ne doit montrer aucun palier creme.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from metrique import *

def paliers(im, y, x0, x1, seuil=12, mini=2):
    p = [im.getpixel((x, y)) for x in range(x0, x1)]
    out, deb = [], 0
    for i in range(1, len(p)):
        if sum(abs(p[i][c] - p[i - 1][c]) for c in range(3)) > seuil:
            if i - deb >= mini:
                s = p[deb:i]
                out.append((x0 + deb, x0 + i - 1, i - deb,
                            tuple(sorted(q[c] for q in s)[len(s) // 2] for c in range(3))))
            deb = i
    s = p[deb:]
    out.append((x0 + deb, x1 - 1, len(s), tuple(sorted(q[c] for q in s)[len(s) // 2] for c in range(3))))
    return out

print("=== P5 : lisere interieur de la carte, bord GAUCHE ===")
CAS = [("ref", "E11-cadre-04-la-carte-distribuee", (1300, 1350), 60, 180),
       ("cap", "E11_DecisionDetail_1080x2400",     (1500, 1560), 60, 180),
       ("cap", "E11_DecisionDetail_1080x1920",     (1200, 1260), 40, 160)]
for kind, nom, ys, x0, x1 in CAS:
    im = ouvrir(kind, nom)
    print(f"   {nom}")
    for y in ys:
        print(f"      y={y} : ", end="")
        print(" | ".join(f"x{a}-{b}({n}px={n/K:.2f}css){m}" for a, b, n, m in paliers(im, y, x0, x1)))

print()
print("=== CONTROLE NEGATIF : profil dans le tapis, hors carte (x 0..60) ===")
for kind, nom, y in (("ref", "E11-cadre-04-la-carte-distribuee", 1300),
                     ("cap", "E11_DecisionDetail_1080x2400", 1500)):
    im = ouvrir(kind, nom)
    ps = paliers(im, y, 0, 60)
    print(f"   {nom} y={y} : {len(ps)} palier(s) -> {[ (n, m) for a, b, n, m in ps ]}")

print()
print("=== P4 (reprise) : eyebrow de la capture 1080x1920, fenetre corrigee ===")
im = ouvrir("cap", "E11_DecisionDetail_1080x1920")
box = (20, 540, 1060, 600)
W, H, bits, f = masque(im, box)
bs, _ = bandes(bits, W, H)
print(f"   fenetre={box} fond median={f}  bandes={[(box[1]+a, box[1]+b) for a, b in bs]}")
a, b = bs[0]
m = metrique(bits, W, a, b)
ya, yb = box[1] + a, box[1] + b
xa, xb = box[0] + m['x0'], box[0] + m['x1']
(sup, _) = med(im, xa, ya - 10, xb, ya - 4)
px = list(im.crop((xa, ya, xb + 1, yb + 1)).getdata())
px.sort(key=lambda p: -(abs(p[0] - sup[0]) + abs(p[1] - sup[1]) + abs(p[2] - sup[2])))
k = max(1, int(len(px) * 0.04))
enc = tuple(sorted(p[c] for p in px[:k])[k // 2] for c in range(3))
(crm, _) = med(im, 200, 700, 260, 800)
print(f"      bande y={ya}..{yb}  encre x={xa}..{xb} largeur={(xb-xa+1)/K:.1f} css  "
      f"capH={m['capH']}px = {m['capH']/K:.2f} css")
print(f"      support RGB={sup}  (tapis vert)   carte creme RGB={crm}")
print(f"      distance support/tapis = {sum(abs(sup[c]-(23,65,45)[c]) for c in range(3))}  "
      f"distance support/carte = {sum(abs(sup[c]-crm[c]) for c in range(3))}  -> POSE SUR LE TAPIS")
print(f"      encre RGB={enc}  contraste={contraste(enc, sup):.2f}:1")
print(f"      centre encre x={(xa+xb)/2:.1f} vs centre ecran 539,5 -> {((xa+xb)/2-539.5)/K:+.2f} css")
