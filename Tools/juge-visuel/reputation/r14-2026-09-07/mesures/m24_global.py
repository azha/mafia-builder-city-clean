"""m24 — couche GLOBALE + bords. Palette (histogramme quantifie a 16), luminance moyenne,
densite d'encre, et verification que rien n'est coupe au bord de chaque capture.
La comparaison de palette se fait SUR LE CADRE SEUL (le chrome n'est pas a la meme echelle
et n'existe pas dans la reference de serie 6).
"""
import sys, collections; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane

def couche(im, x0, y0, x1, y1, nom):
    px = im.load()
    h = collections.Counter(); s = 0; n = 0; encre = 0
    for y in range(y0, y1+1):
        for x in range(x0, x1+1):
            p = px[x, y]; h[(p[0]//16, p[1]//16, p[2]//16)] += 1
            L = lum(p); s += L; n += 1
            if L > 45: encre += 1
    print(f"\n== {nom} : x{x0}..{x1} y{y0}..{y1} ({n} px) ==")
    print(f"   luminance moyenne = {s/n:.2f} · densite d'encre (L>45) = {encre/n*100:.2f} %")
    for c, k in h.most_common(6):
        print(f"      {tuple(v*16+8 for v in c)}  {k/n*100:5.2f} %")

REF = ouvrir('../reference-1080x2102.png')
J24 = ouvrir('../capture-1080x2400.png')
J19 = ouvrir('../capture-1080x1920.png')
couche(REF, 21, 452, 1058, 2078, 'REFERENCE — cadre')
couche(J24, 18, 482, 1061, 2109, 'JEU 2400 — cadre')
couche(J19, 18, 162, 1061, 1629, 'JEU 1920 — cadre')

print("\n== rien de coupe : encre sur les 8 rangees/colonnes de bord ==")
for nom, im in [('JEU2400', J24), ('JEU1920', J19)]:
    px = im.load(); W, H = im.size
    for lbl, pts in [('rangee 4', [(x, 4) for x in range(W)]),
                     ('rangee H-5', [(x, H-5) for x in range(W)]),
                     ('colonne 4', [(4, y) for y in range(H)]),
                     ('colonne W-5', [(W-5, y) for y in range(H)])]:
        v = [lum(px[x, y]) for x, y in pts]
        n = sum(1 for L in v if L > 45)
        print(f"   {nom} {lbl:12s} : max L={max(v):.1f}  px>45 : {n}")

print("\n== sur-titre du panneau bas : hauteur de capitale sur une LETTRE seule ==")
# 'P' de PAS JUGEABLE : premiere lettre apres le chevron
for nom, im, y0, y1, xa, xb in [('REF', REF, 1675, 1705, 120, 400), ('JEU', J24, 1610, 1640, 115, 395)]:
    px = im.load()
    vals = [lum(px[x, y]) for y in range(y0, y1) for x in range(xa, xb)]
    lo = sorted(vals)[len(vals)//10]; hi = sorted(vals)[int(len(vals)*0.99)]
    s = lo + 0.5*(hi-lo)
    ys = [y for y in range(y0, y1) if sum(1 for x in range(xa, xb) if lum(px[x, y]) >= s) >= 3]
    print(f"   {nom} : lettres capitales de x{xa}..{xb} -> y{min(ys)}..{max(ys)} h={max(ys)-min(ys)+1}")
