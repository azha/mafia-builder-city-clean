"""m03b — BANDEAU DE TITRE : hauteur de CAPITALE mesuree sur la PREMIERE LETTRE SEULE.

Pourquoi : la bande entiere d'une ligne de titre inclut jambages et accents ; deux titres
de textes differents ne sont alors pas comparables. On isole donc le premier glyphe
(une capitale, sans jambage ni accent) et on mesure SON encre. C'est « ce que l'oeil voit »
au sens du mandat.

Methode : dans un rect genereux, on prend la 1re bande de lignes porteuses d'encre ;
depuis son x0 on avance jusqu'a la 1re colonne entierement vide -> c'est le glyphe 1 ;
on re-mesure la hauteur d'encre sur CETTE colonne-la seulement.

CONTROLE POSITIF : « LA VITRINE » de ㉓ (m02b : 29 -> 30 px) doit ressortir egal ici aussi.
CONTROLE NEGATIF : on imprime aussi la hauteur de la bande ENTIERE ; si les deux colonnes
donnaient le meme nombre, l'isolement du glyphe ne servirait a rien.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import outils as O


def capitale(im, rect, fond, seuil=40, etiq=""):
    x0, y0, x1, y1 = rect
    prof = O.profil_lignes(im, x0, y0, x1, y1, fond, seuil)
    bds = [b for b in O.bandes(prof, 2) if b[2] >= 6]
    if not bds:
        print("    %-24s AUCUNE BANDE" % etiq)
        return None
    by0, by1, hb = bds[0]
    bb = O.bbox_encre(im, x0, by0, x1, by1 + 1, fond, seuil)
    gx0 = bb[0]
    px = im.load()
    gx1 = gx0
    for x in range(gx0, min(x1, gx0 + 120)):
        vide = all(O.dist(px[x, y], fond) <= seuil for y in range(by0, by1 + 1))
        if vide and x > gx0:
            break
        gx1 = x
    g = O.bbox_encre(im, gx0, by0, gx1 + 1, by1 + 1, fond, seuil)
    hcap = g[3] - g[1] + 1
    print("    %-24s glyphe1 x=%d..%d  hauteur de capitale=%d px (bande entiere=%d px, y=%d..%d)"
          % (etiq, gx0, gx1, hcap, hb, by0, by1))
    return hcap


CAS = [
    ("E03 ㉚ titre", ("E03-cadre-48.png", (45, 450, 950, 520), (26, 23, 20)),
                     ("E03_Chanedappro_1080x2400.png", (45, 535, 950, 610), (26, 23, 20))),
    ("E03 ㉚ sous-titre", ("E03-cadre-48.png", (45, 528, 950, 580), (26, 23, 20)),
                          ("E03_Chanedappro_1080x2400.png", (45, 605, 950, 665), (26, 23, 20))),
    ("E04 ㉘ titre", ("E04-cadre-54.png", (45, 450, 950, 520), (30, 24, 18)),
                     ("E04_Distribution_1080x2400.png", (45, 535, 950, 605), (32, 25, 18))),
    ("E04 ㉘ sous-titre", ("E04-cadre-54.png", (45, 528, 950, 580), (30, 24, 18)),
                          ("E04_Distribution_1080x2400.png", (45, 605, 950, 665), (32, 25, 18))),
    ("E05 ㉛ titre", ("E05-cadre-67.png", (45, 450, 950, 520), (20, 23, 32)),
                     ("E05_Loi_1080x2400.png", (45, 535, 950, 610), (40, 42, 50))),
    ("E05 ㉛ sous-titre", ("E05-cadre-67.png", (45, 528, 950, 580), (20, 23, 32)),
                          ("E05_Loi_1080x2400.png", (45, 605, 950, 665), (40, 42, 50))),
    ("E06 ㉝ titre", ("E06-cadre-79.png", (45, 450, 950, 520), (22, 20, 20)),
                     ("E06_Dmolition_1080x2400.png", (45, 535, 950, 610), (24, 24, 26))),
    ("E06 ㉝ sous-titre", ("E06-cadre-79.png", (45, 528, 950, 580), (22, 20, 20)),
                          ("E06_Dmolition_1080x2400.png", (45, 650, 950, 705), (24, 24, 26))),
    ("E01 ㊳ titre panneau", ("E01-cadre-125.png", (260, 470, 820, 575), (16, 22, 36)),
                             ("E01_Journal_1080x2400.png", (260, 555, 820, 645), (16, 22, 36))),
    ("E10 ㊵ titre panneau", ("E10-cadre-140-pas-encore-de-filiere.png", (260, 470, 820, 575), (16, 22, 36)),
                             ("E10_Filire_1080x2400.png", (260, 550, 820, 645), (16, 22, 36))),
    ("E07 ㉓ titre (TEMOIN)", ("E07-cadre-98.png", (40, 475, 420, 535), (30, 24, 20)),
                              ("E07_Boutique_1080x2400.png", (35, 550, 420, 610), (30, 24, 20))),
    ("E02 ㉞ titre", ("E02-cadre-85.png", (45, 450, 950, 520), (24, 20, 18)),
                     ("E02_Carnet_1080x2400.png", (45, 540, 950, 615), (24, 20, 18))),
    ("E02 ㉞ sous-titre", ("E02-cadre-85.png", (45, 528, 950, 580), (24, 20, 18)),
                          ("E02_Carnet_1080x2400.png", (45, 615, 950, 672), (24, 20, 18))),
]

print("=== m03b BANDEAU DE TITRE — hauteur de capitale (1er glyphe) ===")
res = {}
for nom, (fr, rr, fondr), (fc, rc, fondc) in CAS:
    print(" " + nom)
    ir = O.ref(fr); ic = O.cap(fc)
    a = capitale(ir, rr, fondr, 40, "REF")
    b = capitale(ic, rc, fondc, 40, "JEU")
    if a and b:
        print("    => %d -> %d px  (%+.1f%%)  soit %.1f -> %.1f px CSS"
              % (a, b, 100 * (b / a - 1), O.css(a), O.css(b)))
        res[nom] = (a, b)
    print()

print("=== RECAPITULATIF ===")
for k, (a, b) in res.items():
    print("  %-28s ref %2d px -> jeu %2d px  (%+6.1f%%)" % (k, a, b, 100 * (b / a - 1)))
