# -*- coding: utf-8 -*-
"""Bandeau du chrome : filet, medaillon, ailes. Capture vs canon HUD.
Repere : 392 CSS-HUD ; capture x2,7551 (1080 px) ; canon x3,0000 (1176 px).
Controle POSITIF : la hauteur derivee du code (52 CSS = 143 px) doit se retrouver sur l'image.
"""
from lib_mes import *

CAP = ouvrir('../capture-1080x2400.png')
CAN = ouvrir('../hud-canon-1176.png')
KCAP, KCAN = 1080/392.0, 1176/392.0
print('   facteur capture=%.4f px/CSS   canon=%.4f px/CSS' % (KCAP, KCAN))
print()

def dore(c):   # famille or (jaune/laiton), sature
    r, g, b = c
    return r > 120 and g > 85 and b < g-25 and r >= g

def braise(c):  # --braise 224,102,74 et sa famille rouge
    r, g, b = c
    return r > 110 and g < r-45 and b < r-45

print('--- filet du bandeau (ligne mediane par y) ---')
for nom, im, y0, y1 in [('CAPTURE', CAP, 130, 160), ('CANON', CAN, 140, 170)]:
    p = im.load(); w = im.size[0]
    for y in range(y0, y1):
        ech = [p[x, y] for x in range(60, w-60, 5)]
        ech.sort(key=lum)
        med = ech[len(ech)//2]
        nd = sum(1 for c in ech if dore(c)); nb = sum(1 for c in ech if braise(c))
        if nd > len(ech)*0.5 or nb > len(ech)*0.5:
            print('   %-8s y=%4d  mediane=%-16s  or=%3d/%d braise=%3d/%d' % (nom, y, str(med), nd, len(ech), nb, len(ech)))
print()

print('--- medaillon (anneau) : bbox de la couleur d anneau ---')
b = bbox(CAP, braise, 380, 0, 700, 230)
print('   CAPTURE anneau braise bbox=%s  larg=%s haut=%s  centre_x=%.1f' % (
    b[:4], b[2]-b[0]+1 if b[0] is not None else None, b[3]-b[1]+1 if b[1] is not None else None,
    (b[0]+b[2])/2.0 if b[0] is not None else -1))
b2 = bbox(CAN, dore, 430, 0, 740, 240)
print('   CANON   anneau or     bbox=%s  larg=%s haut=%s  centre_x=%.1f' % (
    b2[:4], b2[2]-b2[0]+1 if b2[0] is not None else None, b2[3]-b2[1]+1 if b2[1] is not None else None,
    (b2[0]+b2[2])/2.0 if b2[0] is not None else -1))
if b[0] is not None and b2[0] is not None:
    print('   diametre CSS : capture=%.2f   canon=%.2f   delta=%.2f CSS' % (
        (b[2]-b[0]+1)/KCAP, (b2[2]-b2[0]+1)/KCAN, (b[2]-b[0]+1)/KCAP - (b2[2]-b2[0]+1)/KCAN))
    print('   centre_x CSS : capture=%.2f   canon=%.2f  (attendu 196 = milieu)' % (
        ((b[0]+b[2])/2.0)/KCAP, ((b2[0]+b2[2])/2.0)/KCAN))
print()

print('--- aile GAUCHE : argent (texte or) ---')
for nom, im, K, yb in [('CAPTURE', CAP, KCAP, (55, 105)), ('CANON', CAN, KCAN, (60, 115))]:
    seg = profil_colonnes(im, yb[0], yb[1], dore, 0, im.size[0]//2)
    tot = [s for s in seg if s[1]-s[0] >= 1]
    if tot:
        print('   %-8s valeur ARGENT : x=%d..%d (%d px = %.1f CSS)  %d segments' % (
            nom, tot[0][0], tot[-1][1], tot[-1][1]-tot[0][0]+1, (tot[-1][1]-tot[0][0]+1)/K, len(tot)))
print()

print('--- collision argent / medaillon ---')
p = CAP.load()
# derniere colonne d encre or de la ligne argent, et premiere colonne d anneau braise
segA = profil_colonnes(CAP, 55, 105, dore, 0, 540)
segM = profil_colonnes(CAP, 55, 105, braise, 400, 700)
print('   CAPTURE  encre or (aile gauche) jusqu a x=%s' % (segA[-1][1] if segA else None))
print('   CAPTURE  anneau braise a partir de x=%s' % (segM[0][0] if segM else None))
if segA and segM:
    print('   ecart = %d px = %.2f CSS   %s' % (segM[0][0]-segA[-1][1], (segM[0][0]-segA[-1][1])/KCAP,
          'CHEVAUCHEMENT' if segM[0][0] <= segA[-1][1] else 'pas de chevauchement'))
segA2 = profil_colonnes(CAN, 60, 115, dore, 0, 460)
segM2 = profil_colonnes(CAN, 60, 115, dore, 460, 760)
print('   CANON    encre or (aile gauche) jusqu a x=%s ; anneau a partir de x=%s ; ecart=%s px = %.2f CSS' % (
    segA2[-1][1] if segA2 else None, segM2[0][0] if segM2 else None,
    (segM2[0][0]-segA2[-1][1]) if (segA2 and segM2) else None,
    ((segM2[0][0]-segA2[-1][1])/KCAN) if (segA2 and segM2) else -1))
