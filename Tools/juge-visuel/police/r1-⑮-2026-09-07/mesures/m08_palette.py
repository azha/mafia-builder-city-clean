# -*- coding: utf-8 -*-
"""m08 — (a) TEINTE de l'encre : R-B signe (chaud>0, neutre=0, froid<0) ; (b) palette quantifiee.
Contrôle positif : le titre de la capture DOIT sortir chaud (R-B > 100) — c'est de l'or.
Contrôle negatif : si l'instrument rendait 'chaud' partout il ne mesurerait rien ; on exige
                   qu'au moins une zone sorte NEUTRE (|R-B| <= 3) et une autre CHAUDE.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def ouvrir(rel):
    im = Image.open(os.path.join(D, rel)).convert('RGB')
    print("OUVERT %-30s taille=%s" % (rel, im.size)); return im

def med(v):
    v = sorted(v); n = len(v); return v[n//2] if n % 2 else (v[n//2-1]+v[n//2])//2

def teinte(im, x0, y0, x1, y1, frac=0.06):
    px = im.load(); pts = []
    for y in range(y0, y1+1):
        for x in range(x0, x1+1):
            r, g, b = px[x, y]; pts.append((0.299*r+0.587*g+0.114*b, r, g, b))
    pts.sort(reverse=True); k = max(5, int(len(pts)*frac)); top = pts[:k]
    R, G, B = med([p[1] for p in top]), med([p[2] for p in top]), med([p[3] for p in top])
    return (R, G, B, R-B)

cap = ouvrir('capture-1080x2400.png')
can = ouvrir('etats/inspections-canon.png')
print()
ZONES = [
 ('CAP titre',                 cap, 396, 268, 828, 303),
 ('CAP sous-titre',            cap, 338, 344, 740, 368),
 ('CAP entete PAR GRAVITE',    cap,  38, 457, 239, 482),
 ('CAP libelle Critique',      cap,  37, 515, 154, 545),
 ('CAP libelle Elevee',        cap,  38, 568, 136, 597),
 ('CAP libelle Moyenne',       cap,  38, 630, 173, 659),
 ('CAP libelle Indicateur',    cap,  38, 855, 190, 879),
 ('CAP libelle Cascade',       cap,  37,1026, 163,1051),
 ('CAP valeur None x1',        cap, 491, 515, 553, 545),
 ('CAP valeur None x6',        cap, 491,1082, 553,1113),
 ('CAP libelle Faible',        cap,  38, 687, 122, 712),
 ('CAP valeur Predominant',    cap, 491, 687, 648, 712),
 ('CAP jauge eteinte',         cap, 284, 515, 470, 545),
 ('CAP jauge allumee (Charge)',cap, 427, 404, 470, 435),
 ('CAP jauge or (Faible)',     cap, 284, 687, 470, 712),
 ('CAN titre',                 can, 152,  64, 628,  97),
 ('CAN sous-titre',            can, 149, 125, 504, 152),
 ('CAN libelle GRAVITE',       can,  72, 385, 200, 415),
 ('CAN chip aucune (faible)',  can, 465, 390, 610, 460),
 ('CAN chip braise',           can, 465, 520, 625, 610),
]
neutres = 0; chauds = 0
for nom, im, x0, y0, x1, y1 in ZONES:
    R, G, B, d = teinte(im, x0, y0, x1, y1)
    cl = 'NEUTRE' if abs(d) <= 3 else ('chaud' if d > 0 else 'froid')
    if cl == 'NEUTRE': neutres += 1
    if d > 100: chauds += 1
    print("  %-28s RGB=(%3d,%3d,%3d)  R-B=%+4d  %s" % (nom, R, G, B, d, cl))
print()
print("CONTROLE POSITIF titre chaud (R-B>100) :", chauds >= 1)
print("CONTROLE NEGATIF l'instrument discrimine (>=1 NEUTRE et >=1 chaud) :", neutres >= 1 and chauds >= 1,
      "-> %d zones NEUTRES, %d zones tres chaudes" % (neutres, chauds))

print()
print("== PALETTE quantifiee (16 couleurs) sur la zone de CONTENU ==")
for nom, im, box in (('CAPTURE y143..2210', cap, (0,143,1080,2210)),
                     ('CANON GARNI y231..1745', can, (0,231,900,1745))):
    sub = im.crop(box)
    q = sub.quantize(colors=16, method=Image.MEDIANCUT).convert('RGB')
    cols = q.getcolors(4096); cols.sort(reverse=True)
    tot = sum(c for c, _ in cols)
    print(" -- %s (aire=%d px)" % (nom, tot))
    for c, rgb in cols[:10]:
        print("      %6.2f %%  RGB=%s  R-B=%+d" % (100.0*c/tot, rgb, rgb[0]-rgb[2]))
