"""m09 — LA SECONDE RESOLUTION (1080x1920) : le chrome tient-il, et qu'est-ce qui est coupe ?

(a) le bandeau haut est-il PIXEL A PIXEL celui de 2400 ? (il doit l'etre : meme largeur,
    meme facteur x3,6)
(b) le dock : ou commence-t-il, et le corps mord-il dessus ?
(c) la derniere ligne d'encre avant le dock : est-elle coupee au ras ?

CONTROLE POSITIF : 1080 px de large des deux cotes ; le bandeau haut attendu identique.
CONTROLE NEGATIF : on compare le bandeau de 1920 a celui d'une AUTRE planche 1920 —
doit etre nul aussi (le chrome est le meme partout) ; et le CORPS, lui, doit differer.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import outils as O

PAIRES = [
    ("A01", "A01_AccueilFile2Cartes_1080x2400.png", "A01_AccueilFile2Cartes_1080x1920.png"),
    ("A01t", "A01_AccueilFile2Cartes_TeteRaisonLongue_1080x2400.png", "A01_AccueilFile2Cartes_TeteRaisonLongue_1080x1920.png"),
    ("E01", "E01_Journal_1080x2400.png", "E01_Journal_1080x1920.png"),
    ("E02", "E02_Carnet_1080x2400.png", "E02_Carnet_1080x1920.png"),
    ("E03", "E03_Chanedappro_1080x2400.png", "E03_Chanedappro_1080x1920.png"),
    ("E04", "E04_Distribution_1080x2400.png", "E04_Distribution_1080x1920.png"),
    ("E05", "E05_Loi_1080x2400.png", "E05_Loi_1080x1920.png"),
    ("E06", "E06_Dmolition_1080x2400.png", "E06_Dmolition_1080x1920.png"),
    ("E07", "E07_Boutique_1080x2400.png", "E07_Boutique_1080x1920.png"),
    ("E08", "E08_Lasemaine_1080x2400.png", "E08_Lasemaine_1080x1920.png"),
    ("E09", "E09_Inspections_1080x2400.png", "E09_Inspections_1080x1920.png"),
    ("E10", "E10_Filire_1080x2400.png", "E10_Filire_1080x1920.png"),
    ("E11", "E11_DecisionDetail_1080x2400.png", "E11_DecisionDetail_1080x1920.png"),
]


def diff(a, b, rect, seuil=10):
    x0, y0, x1, y1 = rect
    pa, pb = a.load(), b.load()
    n = 0
    for y in range(y0, y1):
        for x in range(x0, x1, 2):
            if O.dist(pa[x, y], pb[x, y]) > seuil:
                n += 1
    return n * 2, (x1 - x0) * (y1 - y0)


print("=== m09a LE BANDEAU HAUT (y=0..150) : 2400 vs 1920, par ecran ===")
for nom, f24, f19 in PAIRES:
    a = O.cap(f24); b = O.cap(f19)
    n, t = diff(a, b, (0, 0, 1080, 150))
    print("   %-5s %d/%d px differents (%.2f%%)" % (nom, n, t, 100.0 * n / t))

print()
print("=== m09b LE DOCK : premiere ligne du dock et derniere ligne d'encre du corps ===")


def dock_y(im):
    """Le dock est la bande du bas ou se trouvent les 4 pastilles ; on la repere par
    la ligne de la plus basse encre centree sur les 4 colonnes des libelles."""
    h = im.height
    px = im.load()
    # le libelle du dock : bande d'encre la plus basse au-dessus de h-20
    for y in range(h - 30, h - 200, -1):
        n = sum(1 for x in range(150, 900, 2) if O.lum(px[x, y]) > 0.09)
        if n * 2 > 60:
            return y
    return None


for nom, f24, f19 in PAIRES:
    for f in (f24, f19):
        im = O.cap(f)
        y = dock_y(im)
        print("   %-5s %-54s hauteur=%d  derniere ligne de libelle du dock y=%s (%.1f px du bas)"
              % (nom, f, im.height, y, (im.height - 1 - y) if y else -1))

print()
print("=== m09c LES PLANCHES _bas : y a-t-il de l'encre collee au bord bas du corps ? ===")
BAS = ["E01_Journal_bas_1080x2400.png", "E01_Journal_bas_1080x1920.png",
       "E02_Carnet_bas_1080x2400.png", "E02_Carnet_bas_1080x1920.png",
       "E05_Loi_bas_1080x1920.png", "E06_Dmolition_bas_1080x1920.png",
       "E07_Boutique_bas_1080x2400.png", "E07_Boutique_bas_1080x1920.png",
       "E08_Lasemaine_bas_1080x1920.png"]
for f in BAS:
    im = O.cap(f)
    print("   %-40s %dx%d" % (f, im.width, im.height))
