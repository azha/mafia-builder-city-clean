"""m08 — ㊳ E01 : la bande « Lt. Marr attend vos ordres — trancher » PASSE SUR LE CHROME.

On compare, pixel a pixel, la zone du manometre et de son losange entre ㊳ (ou la bande
existe) et ㉚ (ou elle n'existe pas) : les deux planches portent le MEME chrome
(m01 : ARGENT 19 px, anneau D=184, filet y=141-142 sur les 13 planches), donc toute
difference dans cette zone vient de ce qui est dessine PAR-DESSUS.

CONTROLE POSITIF : hors de la bande (y < 190), les deux planches doivent etre identiques
pixel a pixel sur la colonne du manometre.
CONTROLE NEGATIF : on compare aussi ㉚ a ㉘ (deux planches sans bande) — doit etre nul.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import outils as O


def diff(a, b, rect, etiq, seuil=10):
    x0, y0, x1, y1 = rect
    pa, pb = a.load(), b.load()
    n = 0
    lignes = {}
    for y in range(y0, y1):
        for x in range(x0, x1):
            if O.dist(pa[x, y], pb[x, y]) > seuil:
                n += 1
                lignes[y] = lignes.get(y, 0) + 1
    tot = (x1 - x0) * (y1 - y0)
    ys = sorted(lignes)
    print("   %-52s %d/%d px differents (%.1f%%)  lignes touchees : %s"
          % (etiq, n, tot, 100.0 * n / tot, ("%d..%d" % (ys[0], ys[-1])) if ys else "aucune"))
    return n


e01 = O.cap("E01_Journal_1080x2400.png")
e03 = O.cap("E03_Chanedappro_1080x2400.png")
e04 = O.cap("E04_Distribution_1080x2400.png")

print("=== m08 ㊳ : ce que la bande recouvre ===")
diff(e01, e03, (400, 0, 680, 190), "CONTROLE POSITIF  ㊳ vs ㉚, y=0..190 (au-dessus)")
diff(e03, e04, (400, 0, 680, 300), "CONTROLE NEGATIF  ㉚ vs ㉘, y=0..300")
diff(e01, e03, (400, 190, 680, 300), "㊳ vs ㉚, y=190..300 (zone losange + bas d'anneau)")

print()
print("   or present (r>110,g>80,b<r-40) par ligne, colonne x=400..680 :")
for nom, im in (("㉚ E03", e03), ("㊳ E01", e01)):
    px = im.load()
    out = []
    for y in range(185, 245):
        n = sum(1 for x in range(400, 680) if (lambda p: p[0] > 110 and p[1] > 80 and p[2] < p[0] - 40)(px[x, y]))
        if n:
            out.append((y, n))
    print("     %-8s %s" % (nom, out))

print()
print("   ligne du filet SUPERIEUR de la bande de ㊳ (ligne claire pleine largeur) :")
px = e01.load()
for y in range(205, 240):
    n = sum(1 for x in range(120, 960, 2) if O.lum(px[x, y]) > 0.12)
    if n * 2 > 500:
        print("     y=%d  %d px clairs  couleur mediane=%s" % (y, n * 2, O.mediane(e01, 300, y, 400, y + 1)))

print()
print("=== la bande existe-t-elle sur les autres planches ? ===")
for f in ["A01_AccueilFile2Cartes_1080x2400.png", "E01_Journal_1080x2400.png", "E02_Carnet_1080x2400.png",
          "E03_Chanedappro_1080x2400.png", "E04_Distribution_1080x2400.png", "E05_Loi_1080x2400.png",
          "E06_Dmolition_1080x2400.png", "E07_Boutique_1080x2400.png", "E08_Lasemaine_1080x2400.png",
          "E09_Inspections_1080x2400.png", "E10_Filire_1080x2400.png", "E11_DecisionDetail_1080x2400.png"]:
    im = O.cap(f)
    px = im.load()
    trouve = [y for y in range(200, 300)
              if sum(1 for x in range(120, 960, 2) if O.lum(px[x, y]) > 0.12) * 2 > 500]
    print("   %-44s lignes claires pleine largeur y=200..300 : %s" % (f, trouve))
