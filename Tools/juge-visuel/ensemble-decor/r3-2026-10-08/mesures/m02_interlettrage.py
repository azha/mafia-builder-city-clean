"""m02 — INTERLETTRAGE DES CAPITALES (trait d'ensemble nommé par le dossier).

Grandeur invariante d'échelle ET de résolution : largeur d'encre du mot / hauteur de
capitale du mot. Si la fonte est la même des deux côtés (DejaVu, cf. dossier § Polices),
un écart sur ce rapport est un écart de LETTER-SPACING, pas de chasse.

CONTROLE POSITIF : « ARGENT » et « CHALEUR » sont du chrome HUD, rendus dans la maquette
en Noto Sans (substitution Segoe UI) et dans le jeu en DejaVu Sans => on s'attend à un
écart de chasse ; ils servent de TÉMOIN DE SUBSTITUTION, pas de défaut.
CONTROLE NEGATIF : on mesure aussi un mot dont on sait qu'il est le MEME des deux côtés
et composé de la MEME façon (les chiffres « 00 » des compteurs de ㊵).
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import outils as O

FOND_SOMBRE = (14, 20, 30)


def mot(im, rect, fond, seuil=40, etiquette=""):
    x0, y0, x1, y1 = rect
    bb = O.bbox_encre(im, x0, y0, x1, y1, fond, seuil)
    if bb is None:
        print("   %-34s RIEN TROUVE dans %s" % (etiquette, rect))
        return None
    mnx, mny, mxx, mxy, n = bb
    w = mxx - mnx + 1
    h = mxy - mny + 1
    # colonnes vides internes = les gouttières entre glyphes
    px = im.load()
    creux, cur = [], 0
    for x in range(mnx, mxx + 1):
        vide = True
        for y in range(mny, mxy + 1):
            if O.dist(px[x, y], fond) > seuil:
                vide = False
                break
        if vide:
            cur += 1
        else:
            if cur:
                creux.append(cur)
            cur = 0
    print("   %-34s bbox=(%d,%d)-(%d,%d) w=%d h=%d  w/h=%.3f  creux=%s" %
          (etiquette, mnx, mny, mxx, mxy, w, h, w / h, creux))
    return (w, h, w / h, creux)


print("=== m02 INTERLETTRAGE — mots appariés ref / jeu ===")
print()
print("-- TEMOIN DE SUBSTITUTION (Noto Sans cote maquette, DejaVu Sans cote jeu) --")
r = O.ref("E03-cadre-48.png"); c = O.cap("E03_Chanedappro_1080x2400.png")
print(" REF E03-48")
a = mot(r, (40, 40, 240, 70), (10, 14, 22), 40, "ARGENT")
b = mot(r, (455, 190, 625, 220), (14, 20, 34), 40, "CHALEUR")
print(" JEU E03 2400")
a2 = mot(c, (40, 24, 240, 50), (12, 21, 28), 40, "ARGENT")
b2 = mot(c, (400, 128, 500, 152), (14, 20, 34), 40, "CHALEUR")
for nom, x, y in (("ARGENT", a, a2), ("CHALEUR", b, b2)):
    if x and y:
        print("   => %s  w/h ref=%.3f  jeu=%.3f  ecart=%+.1f%%" %
              (nom, x[2], y[2], 100 * (y[2] / x[2] - 1)))

print()
print("-- MEME FONTE DES DEUX COTES (DejaVu Sans) : un ecart = un letter-spacing --")
cas = [
    ("E07 « LES EXTRAS — PAYES EN MARKS »",
     ("E07-cadre-98.png", (36, 612, 660, 645), (12, 17, 28)),
     ("E07_Boutique_1080x2400.png", (30, 700, 690, 730), (13, 18, 30))),
    ("E01 « CE QUI SE DIT CE MATIN »",
     ("E01-cadre-125.png", (270, 556, 760, 584), (16, 22, 36)),
     ("E01_Journal_1080x2400.png", (300, 650, 790, 680), (16, 22, 36))),
    ("E10 « ETAPES »",
     ("E10-cadre-140-pas-encore-de-filiere.png", (140, 718, 255, 742), (16, 22, 36)),
     ("E10_Filire_1080x2400.png", (135, 810, 275, 836), (16, 22, 36))),
    ("E08 « TENSION »",
     ("E08-cadre-18-au-calme.png", (430, 1612, 640, 1640), (196, 160, 80)),
     ("E08_Lasemaine_1080x2400.png", (430, 1280, 640, 1310), (196, 160, 80))),
    ("A01 « LA SUITE »",
     ("A01-cadre-4-la-suite.png", (440, 868, 630, 896), (12, 18, 30)),
     ("A01_AccueilFile2Cartes_1080x2400.png", (440, 966, 630, 994), (12, 18, 30))),
    ("dock « FAMILLE »",
     ("A01-cadre-4-la-suite.png", (380, 2040, 500, 2070), (10, 14, 24)),
     ("A01_AccueilFile2Cartes_1080x2400.png", (370, 2320, 500, 2350), (10, 14, 24))),
]
for titre, (fr, rr, fondr), (fc, rc, fondc) in cas:
    print(" " + titre)
    ir = O.ref(fr); ic = O.cap(fc)
    x = mot(ir, rr, fondr, 40, "REF")
    y = mot(ic, rc, fondc, 40, "JEU")
    if x and y:
        print("   => w/h ref=%.3f  jeu=%.3f  ecart=%+.1f%%   (h ref=%d, h jeu=%d)" %
              (x[2], y[2], 100 * (y[2] / x[2] - 1), x[1], y[1]))

print()
print("-- CONTROLE NEGATIF : les chiffres « 00 » du 1er compteur de ㊵ (pas de letter-spacing attendu) --")
ir = O.ref("E10-cadre-140-pas-encore-de-filiere.png"); ic = O.cap("E10_Filire_1080x2400.png")
x = mot(ir, (150, 660, 250, 712), (16, 22, 36), 40, "REF 00")
y = mot(ic, (145, 750, 255, 805), (16, 22, 36), 40, "JEU 00")
if x and y:
    print("   => w/h ref=%.3f  jeu=%.3f  ecart=%+.1f%%" % (x[2], y[2], 100 * (y[2] / x[2] - 1)))
