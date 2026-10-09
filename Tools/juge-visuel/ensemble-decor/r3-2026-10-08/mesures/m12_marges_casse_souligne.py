"""m12 — (a) MARGE GAUCHE du titre de bandeau sur les 5 ecrans qui en ont un (grille/marges) ;
        (b) CASSE du libelle de geste : hauteur du 1er glyphe vs celle du 2e
            (en CAPITALES les deux sont egaux ; en casse de phrase le 2e est plus bas) ;
        (c) ALIGNEMENT du libelle de geste dans son cadre (centre ou cale a gauche) ;
        (d) le SOULIGNE POINTILLE de la page d'accueil : present en maquette, en jeu ?

CONTROLE POSITIF (b) : « EN COMMANDER » de ㉚ (jeu) est en capitales => h1 == h2.
CONTROLE POSITIF (c) : « Y PRETER ATTENTION » de ㊳ est centre des deux cotes.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import outils as O


def glyphes(im, rect, fond, seuil=40, n=4, etiq=""):
    """Hauteur d'encre des n premiers glyphes d'une ligne."""
    x0, y0, x1, y1 = rect
    prof = O.profil_lignes(im, x0, y0, x1, y1, fond, seuil)
    bds = [b for b in O.bandes(prof, 2) if b[2] >= 6]
    if not bds:
        print("   %-34s AUCUNE BANDE" % etiq)
        return
    by0, by1, _ = bds[0]
    px = im.load()
    cols = []
    for x in range(x0, x1):
        cols.append(any(O.dist(px[x, y], fond) > seuil for y in range(by0, by1 + 1)))
    gl, deb = [], None
    for i, v in enumerate(cols):
        if v and deb is None:
            deb = i
        elif not v and deb is not None:
            gl.append((x0 + deb, x0 + i - 1))
            deb = None
    if deb is not None:
        gl.append((x0 + deb, x1 - 1))
    hs = []
    for (a, b) in gl[:n]:
        bb = O.bbox_encre(im, a, by0, b + 1, by1 + 1, fond, seuil)
        hs.append((a, b, bb[3] - bb[1] + 1))
    print("   %-34s bande y=%d..%d ; %d premiers glyphes (x0,x1,h) = %s" % (etiq, by0, by1, n, hs))
    return hs


print("=== m12a MARGE GAUCHE DU TITRE DE BANDEAU (px image ; /3,6 = px CSS) ===")
for nom, (fr, rr, fondr), (fc, rc, fondc) in [
    ("㉚ E03", ("E03-cadre-48.png", (20, 450, 980, 520), (26, 23, 20)), ("E03_Chanedappro_1080x2400.png", (20, 535, 980, 610), (26, 23, 20))),
    ("㉘ E04", ("E04-cadre-54.png", (20, 450, 980, 520), (30, 24, 18)), ("E04_Distribution_1080x2400.png", (20, 535, 980, 605), (32, 25, 18))),
    ("㉛ E05", ("E05-cadre-67.png", (20, 450, 980, 520), (20, 23, 32)), ("E05_Loi_1080x2400.png", (20, 535, 980, 610), (40, 42, 50))),
    ("㉝ E06", ("E06-cadre-79.png", (20, 450, 980, 520), (22, 20, 20)), ("E06_Dmolition_1080x2400.png", (20, 535, 980, 610), (24, 24, 26))),
    ("㉞ E02", ("E02-cadre-85.png", (20, 450, 980, 520), (24, 20, 18)), ("E02_Carnet_1080x2400.png", (20, 540, 980, 615), (24, 20, 18))),
    ("㉓ E07", ("E07-cadre-98.png", (20, 475, 500, 535), (30, 24, 20)), ("E07_Boutique_1080x2400.png", (20, 550, 500, 610), (30, 24, 20))),
]:
    a = O.bbox_encre(O.ref(fr), *rr, fondr, 40)
    b = O.bbox_encre(O.cap(fc), *rc, fondc, 40)
    print("   %-8s ref x0=%-4d (%.1f CSS)   jeu x0=%-4d (%.1f CSS)   ecart=%+d px (%+.1f CSS)"
          % (nom, a[0], O.css(a[0]), b[0], O.css(b[0]), b[0] - a[0], O.css(b[0] - a[0])))

print()
print("=== m12b CASSE DES LIBELLES DE GESTE ===")
glyphes(O.cap("E03_Chanedappro_1080x2400.png"), (80, 1980, 450, 2030), (28, 24, 18), 40, 4, "CONTROLE+ ㉚ « EN COMMANDER »")
glyphes(O.ref("E02-cadre-85.png"), (85, 1975, 470, 2020), (36, 28, 17), 40, 4, "REF ㉞ « LANCER LA SOIREE »")
glyphes(O.cap("E02_Carnet_1080x2400.png"), (125, 1985, 480, 2030), (22, 19, 22), 40, 4, "JEU ㉞ libelle du geste")
glyphes(O.cap("E02_Carnet_1080x2400.png"), (855, 865, 1000, 900), (209, 203, 184), 40, 5, "JEU ㉞ « Poser un ordre » (l.1)")

print()
print("=== m12c ALIGNEMENT DU LIBELLE DANS LE CADRE DU GESTE ===")
for etiq, f, cadre, texte, fond in (
    ("REF ㊵ « INJECTER »", "E10-cadre-140-pas-encore-de-filiere.png", (49, 1945, 1031, 2010), (49, 1955, 1031, 2000), (18, 24, 38)),
    ("JEU ㊵ « BLANCHIR »", "E10_Filire_1080x2400.png", (45, 1950, 1035, 2020), (45, 1960, 1035, 2010), (18, 24, 38)),
    ("REF ㊳ « Y PRETER ATTENTION »", "E01-cadre-125.png", (49, 1925, 1031, 1995), (60, 1935, 1020, 1985), (18, 24, 38)),
    ("JEU ㊳ « Y PRETER ATTENTION »", "E01_Journal_1080x2400.png", (49, 1940, 1035, 2010), (60, 1950, 1020, 2000), (14, 18, 24)),
):
    im = O.ref(f) if "cadre" in f else O.cap(f)
    bb = O.bbox_encre(im, *texte, fond, 40)
    cx_texte = (bb[0] + bb[2]) / 2
    cx_cadre = (cadre[0] + cadre[2]) / 2
    print("   %-30s texte x=%d..%d  centre=%.0f  centre du cadre=%.0f  decalage=%+.0f px (%+.1f CSS)"
          % (etiq, bb[0], bb[2], cx_texte, cx_cadre, cx_texte - cx_cadre, O.css(cx_texte - cx_cadre)))

print()
print("=== m12d LE SOULIGNE POINTILLE DE L'ACCUEIL ===")
print("   on compte, sous la ligne de base du titre de rangee 1, les lignes porteuses d'encre")
for etiq, f, rect, fond in (("REF cadre 4", "A01-cadre-4-la-suite.png", (95, 900, 590, 1010), (12, 18, 30)),
                            ("JEU A01 2400", "A01_AccueilFile2Cartes_1080x2400.png", (95, 1030, 590, 1140), (12, 18, 30))):
    im = O.ref(f) if "cadre" in f else O.cap(f)
    bds = O.bandes(O.profil_lignes(im, rect[0], rect[1], rect[2], rect[3], fond, 40), 2)
    print("   %-14s bandes (y0,y1,h) = %s" % (etiq, bds))
