#!/usr/bin/env python3
"""01 - Profil de l'image : taille, luminance par ligne, sondes de couleur.
But : trouver les frontieres MESURABLES (bandeau haut, dock bas, bord de l'eau)
et donner les valeurs brutes qui serviront a construire le classifieur de 02.
Aucune valeur n'est devinee : tout est imprime."""
from PIL import Image
import sys, os

SRC = os.path.join(os.path.dirname(__file__), '..', 'capture-nuit-1080x1920.png')
im = Image.open(SRC).convert('RGB')
W, H = im.size
print("== IMAGE ==")
print("fichier :", os.path.basename(SRC))
print("taille  : %d x %d  mode=%s" % (W, H, im.mode))
px = im.load()

def lum(r, g, b):
    return 0.2126*r + 0.7152*g + 0.0722*b

# --- profil de luminance et de saturation par ligne (echantillon 1 px sur 4 en x)
print("\n== PROFIL PAR LIGNE (y, lum moyenne, R moy, G moy, B moy, ecart-type lum) ==")
prof = []
for y in range(H):
    s = sr = sg = sb = 0.0
    s2 = 0.0
    n = 0
    for x in range(0, W, 4):
        r, g, b = px[x, y]
        L = lum(r, g, b)
        s += L; s2 += L*L; sr += r; sg += g; sb += b; n += 1
    m = s/n
    prof.append((m, sr/n, sg/n, sb/n, (max(0.0, s2/n - m*m))**0.5))
for y in range(0, H, 20):
    m, r, g, b, sd = prof[y]
    print("y=%4d  L=%6.1f  R=%5.1f G=%5.1f B=%5.1f  sd=%5.1f" % (y, m, r, g, b, sd))

# --- detection des frontieres franches : plus grosses ruptures de luminance moyenne
print("\n== RUPTURES DE LUMINANCE (|dL| > 6 entre deux lignes consecutives) ==")
for y in range(1, H):
    d = prof[y][0] - prof[y-1][0]
    if abs(d) > 6:
        print("y=%4d  dL=%+7.2f   (L %6.2f -> %6.2f)" % (y, d, prof[y-1][0], prof[y][0]))

# --- sondes ponctuelles : 9x9 autour de points choisis A L'OEIL, valeurs MESUREES
print("\n== SONDES (moyenne 9x9) ==")
sondes = {
 "chrome_bandeau_haut":   (120, 60),
 "chrome_dock_bas":       (120, 1880),
 "lointain_sombre_haut":  (150, 200),
 "lointain_clair_haut":   (620, 190),
 "sol_vide_diagonal":     (760, 380),
 "sol_vide_gauche":       (120, 470),
 "rue_entre_batiments":   (330, 1180),
 "quai_dalle":            (900, 1400),
 "eau_plein":             (300, 1650),
 "eau_pres_quai":         (760, 1560),
 "facade_eclairee":       (500, 810),
 "toit_ardoise":          (300, 470),
 "usine_toit_vert":       (640, 1120),
}
for k, (cx, cy) in sondes.items():
    sr = sg = sb = 0; n = 0
    for x in range(cx-4, cx+5):
        for y in range(cy-4, cy+5):
            r, g, b = px[x, y]; sr += r; sg += g; sb += b; n += 1
    r, g, b = sr/n, sg/n, sb/n
    mx, mn = max(r, g, b), min(r, g, b)
    sat = 0.0 if mx == 0 else (mx-mn)/mx
    print("%-22s (%4d,%4d)  RGB=(%5.1f,%5.1f,%5.1f)  L=%6.1f  sat=%.3f  B-R=%+6.1f  G-R=%+6.1f"
          % (k, cx, cy, r, g, b, lum(r, g, b), sat, b-r, g-r))
