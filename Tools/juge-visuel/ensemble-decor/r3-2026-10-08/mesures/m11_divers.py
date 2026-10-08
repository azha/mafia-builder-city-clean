"""m11 — derniers appariements : (a) le dock (diametre des pastilles), (b) le jeton
« 50 Marks » de ㉓, (c) la bande basse (le socle du geste) sur les ecrans qui en ont une,
(d) la luminance du decor de scene de A01.

CONTROLE POSITIF : le dock est le meme sur les 12 planches (m09b : libelle a 58 px du bas
partout) ; son diametre doit l'etre aussi.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import outils as O

print("=== m11a DOCK : diametre de la 1re pastille ===")


def pastille(im, y, x0, x1, fond, etiq):
    px = im.load()
    xs = [x for x in range(x0, x1) if O.dist(px[x, y], fond) > 10]
    print("   %-44s y=%d : encre de x=%s a x=%s  => D=%s px (%.1f px CSS)"
          % (etiq, y, xs[0] if xs else None, xs[-1] if xs else None,
             (xs[-1] - xs[0] + 1) if xs else None, O.css(xs[-1] - xs[0] + 1) if xs else -1))


pastille(O.ref("A01-cadre-4-la-suite.png"), 1975, 150, 400, (9, 13, 22), "REF cadre 4")
pastille(O.cap("A01_AccueilFile2Cartes_1080x2400.png"), 2230, 150, 400, (9, 13, 22), "JEU A01 2400")
pastille(O.cap("E03_Chanedappro_1080x2400.png"), 2230, 150, 400, (9, 13, 22), "JEU E03 2400")

print()
print("=== m11b ㉓ le jeton « 50 Marks » du bandeau ===")
r = O.ref("E07-cadre-98.png"); c = O.cap("E07_Boutique_1080x2400.png")
for etiq, im, rect, fond in (("REF", r, (690, 450, 1000, 540), (26, 20, 16)),
                             ("JEU", c, (580, 520, 900, 620), (26, 20, 16))):
    bb = O.bbox_encre(im, *rect, fond, 40)
    print("   %-4s cadre du jeton : bbox=%s  largeur=%s px (%.1f px CSS)" % (etiq, bb[:4], bb[2] - bb[0] + 1, O.css(bb[2] - bb[0] + 1)))
    for b in O.bandes(O.profil_lignes(im, rect[0], rect[1], rect[2], rect[3], fond, 40), 3):
        print("        bande y=%d..%d (h=%d)" % b)

print()
print("=== m11c LA BANDE BASSE (socle du geste) : couleur sur les ecrans qui en ont une ===")
for etiq, f, rect in (("REF ㉚ cadre 48", "E03-cadre-48.png", (60, 1800, 300, 1850)),
                      ("JEU ㉚ 2400", "E03_Chanedappro_1080x2400.png", (60, 1880, 300, 1930)),
                      ("REF ㉘ cadre 54", "E04-cadre-54.png", (60, 1600, 300, 1650)),
                      ("JEU ㉘ 2400", "E04_Distribution_1080x2400.png", (60, 1880, 300, 1930)),
                      ("REF ㉛ cadre 67", "E05-cadre-67.png", (60, 1760, 300, 1810)),
                      ("JEU ㉛ 2400", "E05_Loi_1080x2400.png", (60, 1930, 300, 1980))):
    im = O.ref(f) if f.startswith(("E0", "A0")) and "cadre" in f else O.cap(f)
    print("   %-18s mediane=%s" % (etiq, O.mediane(im, *rect)))

print()
print("=== m11d A01 : luminance du decor de scene (fenetre commune, hors panneaux) ===")
for etiq, f, rect in (("REF cadre 4", "A01-cadre-4-la-suite.png", (60, 300, 1020, 700)),
                      ("REF cadre 5", "A01-cadre-5-tete-sur-ligne-haute.png", (60, 300, 1020, 700)),
                      ("JEU A01 2400", "A01_AccueilFile2Cartes_1080x2400.png", (60, 300, 1020, 700)),
                      ("JEU A01t 2400", "A01_AccueilFile2Cartes_TeteRaisonLongue_1080x2400.png", (60, 300, 1020, 700))):
    im = O.ref(f) if "cadre" in f else O.cap(f)
    px = im.load()
    ls = [O.lum(px[x, y]) for y in range(rect[1], rect[3], 3) for x in range(rect[0], rect[2], 3)]
    moy = sum(ls) / len(ls)
    ls.sort()
    print("   %-16s lum moyenne=%.4f  mediane=%.4f  p95=%.4f  mediane RGB=%s"
          % (etiq, moy, ls[len(ls) // 2], ls[int(len(ls) * 0.95)], O.mediane(im, 400, 400, 500, 450)))
