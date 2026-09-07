# -*- coding: utf-8 -*-
"""m20 — mesure les trois boites que l'inventaire n'avait qu'ESTIMEES a l'oeil
        (rond de retour du canon, bandeau pointille du canon, fleche de retour de la capture).
Un chiffre non produit par un script n'a pas sa place dans le rapport.
Contrôle positif : le rond de retour du canon doit etre a peu pres CARRE (largeur ~ hauteur, ecart <=3 px).
Contrôle negatif : le bandeau pointille, lui, doit etre nettement plus large que haut.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def ouvrir(rel):
    im = Image.open(os.path.join(D, rel)).convert('RGB')
    print("OUVERT %-30s taille=%s" % (rel, im.size)); return im
can = ouvrir('etats/inspections-canon.png'); pc = can.convert('L').load()
cap = ouvrir('capture-1080x2400.png');       pk = cap.convert('L').load()

def bbox(p, x0, y0, x1, y1, s):
    xs = [x for x in range(x0, x1) if any(p[x, y] > s for y in range(y0, y1))]
    ys = [y for y in range(y0, y1) if any(p[x, y] > s for x in range(x0, x1))]
    return (min(xs), min(ys), max(xs), max(ys)) if xs and ys else None

print()
b = bbox(pc, 30, 70, 145, 190, 24)
print("canon .retour  bbox=%s  %dx%d px = %.1fx%.1f CSS" % (b, b[2]-b[0]+1, b[3]-b[1]+1, (b[2]-b[0]+1)/3.0, (b[3]-b[1]+1)/3.0))
print("   CONTROLE POSITIF quasi carre : ecart largeur/hauteur = %d px" % abs((b[2]-b[0])-(b[3]-b[1])))
v = bbox(pc, 30, 1150, 875, 1400, 24)
print("canon .vide    bbox=%s  %dx%d px = %.1fx%.1f CSS" % (v, v[2]-v[0]+1, v[3]-v[1]+1, (v[2]-v[0]+1)/3.0, (v[3]-v[1]+1)/3.0))
print("   CONTROLE NEGATIF nettement plus large que haut : %.1fx" % ((v[2]-v[0]+1)/float(v[3]-v[1]+1)))
c = bbox(pk, 20, 40, 160, 120, 60)
print("capture fleche bbox=%s  %dx%d px" % (c, c[2]-c[0]+1, c[3]-c[1]+1))
t = bbox(pc, 30, 1420, 875, 1730, 24)
print("canon .cta     bbox=%s  %dx%d px = %.1fx%.1f CSS" % (t, t[2]-t[0]+1, t[3]-t[1]+1, (t[2]-t[0]+1)/3.0, (t[3]-t[1]+1)/3.0))
