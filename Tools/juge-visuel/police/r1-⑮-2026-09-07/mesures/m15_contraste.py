# -*- coding: utf-8 -*-
"""m15 — couleur PURE des textes (pixel le plus clair d'un glyphe epais) + contraste WCAG sur le fond mesure.
Contrôle positif : le blanc pur sur le fond mesure doit rendre un contraste > 18:1.
Contrôle negatif : le fond contre lui-meme doit rendre exactement 1,00:1.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im = Image.open(os.path.join(D, 'capture-1080x2400.png')).convert('RGB')
can = Image.open(os.path.join(D, 'etats/inspections-canon.png')).convert('RGB')
print("OUVERT capture %s ; canon %s" % (im.size, can.size)); px = im.load(); pc = can.load()

def lum(c):
    def f(v):
        v = v/255.0
        return v/12.92 if v <= 0.03928 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2])
def contraste(a, b):
    la, lb = lum(a), lum(b)
    if la < lb: la, lb = lb, la
    return (la+0.05)/(lb+0.05)
def pur(p, x0, y0, x1, y1):
    best = None
    for y in range(y0, y1+1):
        for x in range(x0, x1+1):
            c = p[x, y]; s = sum(c)
            if best is None or s > best[0]: best = (s, c)
    return best[1]

FOND = px[900, 700]
print("fond capture mesure a (900,700) = %s" % (FOND,))
print("CONTROLE POSITIF blanc pur sur ce fond : %.2f:1" % contraste((255,255,255), FOND))
print("CONTROLE NEGATIF fond contre lui-meme : %.2f:1" % contraste(FOND, FOND))
print()
CIBLES = [
 ('titre LES INSPECTIONS',      396, 268, 828, 303, 'grand'),
 ('sous-titre district-1',      338, 344, 585, 368, 'petit'),
 ('entete PAR GRAVITE',          38, 457, 239, 482, 'petit'),
 ('libelle Critique (dim)',      37, 515, 154, 545, 'petit'),
 ('libelle Moyenne (dim)',       38, 630, 173, 659, 'petit'),
 ('libelle Medico-legal (dim)',  38,1082, 226,1113, 'petit'),
 ('valeur None (dim)',          491, 515, 553, 545, 'petit'),
 ('libelle Faible (vif)',        38, 687, 122, 712, 'petit'),
 ('valeur Predominant',         491, 687, 648, 712, 'petit'),
 ('valeur Moderate',            674, 404, 789, 435, 'petit'),
 ('pastille eteinte (trait)',   284, 516, 340, 540, 'trait'),
 ('pastille allumee khaki',     284, 688, 340, 712, 'trait'),
 ('pastille allumee orange',    427, 404, 465, 432, 'trait'),
]
print("%-30s %-18s %-8s %-8s" % ("element", "couleur pure", "contr.", "seuil"))
for nom, x0, y0, x1, y1, cls in CIBLES:
    c = pur(px, x0, y0, x1, y1)
    r = contraste(c, FOND)
    seuil = 3.0 if cls == 'grand' else (4.5 if cls == 'petit' else 3.0)
    verdict = "OK" if r >= seuil else "SOUS LE SEUIL"
    print("%-30s %-18s %6.2f:1  >=%.1f  %s" % (nom, str(c), r, seuil, verdict))

print()
print("== TEMOIN : le canon de serie 2, memes classes de texte ==")
FC = pc[700, 1160]
print("fond canon mesure a (700,1160) = %s" % (FC,))
for nom, x0, y0, x1, y1 in [('titre', 152, 64, 628, 97), ('sous-titre', 149, 125, 504, 152),
                            ('libelle GRAVITE', 73, 385, 187, 415), ('chip aucune', 465, 390, 610, 460),
                            ('texte du bandeau vide', 81, 1244, 817, 1328)]:
    c = pur(pc, x0, y0, x1, y1)
    print("  %-24s pur=%-18s contraste sur le fond du canon = %.2f:1" % (nom, str(c), contraste(c, FC)))
