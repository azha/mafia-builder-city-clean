"""m03 — LE BANDEAU DE TITRE (titre + sous-titre), trait partage par ㉚ ㉘ ㉛ ㉝ et,
sous forme de panneau, par ㊳ ㊵.

Grandeur mesuree : HAUTEUR DE CAPITALE du titre et du sous-titre (invariante d'echelle),
et le RAPPORT sous-titre/titre, qui est invariant d'echelle ET de resolution : c'est lui
qui dit si la hierarchie du bandeau est la meme.
Fonte : DejaVu Serif (titre) / DejaVu Sans (sous-titre) des DEUX cotes (cf. dossier).

CONTROLE POSITIF : le titre « LA VITRINE » de ㉓, deja mesure egal en m02b (29 -> 30 px),
est repris ici comme temoin.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import outils as O


def bande(im, rect, fond, seuil=40, rang=0, mini=2, etiq=""):
    x0, y0, x1, y1 = rect
    prof = O.profil_lignes(im, x0, y0, x1, y1, fond, seuil)
    bds = [b for b in O.bandes(prof, mini) if b[2] >= 6]
    if len(bds) <= rang:
        print("    %-22s BANDES=%s (rang %d absent)" % (etiq, bds, rang))
        return None
    by0, by1, h = bds[rang]
    bb = O.bbox_encre(im, x0, by0, x1, by1 + 1, fond, seuil)
    print("    %-22s y=%d..%d  h=%d  x=%d..%d  (bandes trouvees : %s)"
          % (etiq, bb[1], bb[3], bb[3] - bb[1] + 1, bb[0], bb[2], [b[2] for b in bds[:5]]))
    return bb[3] - bb[1] + 1


CAS = [
    # ecran, (ref, rect_titre, rang_t, rect_sstitre, rang_s, fond),
    #        (cap, rect_titre, rang_t, rect_sstitre, rang_s, fond)
    ("E03 ㉚", ("E03-cadre-48.png", (45, 455, 950, 510), 0, (45, 525, 950, 575), 0, (26, 23, 20)),
               ("E03_Chanedappro_1080x2400.png", (45, 540, 950, 600), 0, (45, 605, 950, 660), 0, (26, 23, 20))),
    ("E04 ㉘", ("E04-cadre-54.png", (45, 455, 950, 510), 0, (45, 525, 950, 575), 0, (30, 24, 18)),
               ("E04_Distribution_1080x2400.png", (45, 540, 950, 600), 0, (45, 605, 950, 660), 0, (32, 25, 18))),
    ("E05 ㉛", ("E05-cadre-67.png", (45, 455, 950, 510), 0, (45, 525, 950, 575), 0, (20, 23, 32)),
               ("E05_Loi_1080x2400.png", (45, 540, 950, 600), 0, (45, 605, 950, 660), 0, (40, 42, 50))),
    ("E06 ㉝", ("E06-cadre-79.png", (45, 455, 950, 510), 0, (45, 525, 950, 575), 0, (22, 20, 20)),
               ("E06_Dmolition_1080x2400.png", (45, 540, 950, 600), 0, (45, 655, 950, 700), 0, (24, 24, 26))),
]

print("=== m03 BANDEAU DE TITRE — hauteur de capitale titre / sous-titre ===")
for nom, (fr, rt, rgt, rs, rgs, fondr), (fc, ct, cgt, cs, cgs, fondc) in CAS:
    print(" " + nom)
    ir = O.ref(fr); ic = O.cap(fc)
    ht = bande(ir, rt, fondr, 40, rgt, 2, "REF titre")
    hs = bande(ir, rs, fondr, 40, rgs, 2, "REF sous-titre")
    jt = bande(ic, ct, fondc, 40, cgt, 2, "JEU titre")
    js = bande(ic, cs, fondc, 40, cgs, 2, "JEU sous-titre")
    if ht and hs and jt and js:
        print("    => titre %d -> %d px (%+.1f%%) | sous-titre %d -> %d px (%+.1f%%)"
              % (ht, jt, 100 * (jt / ht - 1), hs, js, 100 * (js / hs - 1)))
        print("    => rapport sous-titre/titre  ref=%.3f  jeu=%.3f  (%+.1f%%)"
              % (hs / ht, js / jt, 100 * ((js / jt) / (hs / ht) - 1)))
    print()

print("=== panneaux a bandeau (㊳ ㊵) : titre serif or + sous-titre capitales ===")
PAN = [
    ("E01 ㊳", ("E01-cadre-125.png", (260, 480, 820, 545), (16, 22, 36), (260, 580, 820, 625), (16, 22, 36)),
               ("E01_Journal_1080x2400.png", (260, 565, 820, 630), (16, 22, 36), (290, 640, 820, 695), (16, 22, 36))),
    ("E10 ㊵", ("E10-cadre-140-pas-encore-de-filiere.png", (260, 480, 820, 548), (16, 22, 36), (200, 578, 880, 625), (16, 22, 36)),
               ("E10_Filire_1080x2400.png", (260, 560, 820, 632), (16, 22, 36), (240, 638, 840, 688), (16, 22, 36))),
]
for nom, (fr, rt, fondr, rs, fsr), (fc, ct, fondc, cs, fsc) in PAN:
    print(" " + nom)
    ir = O.ref(fr); ic = O.cap(fc)
    ht = bande(ir, rt, fondr, 40, 0, 2, "REF titre")
    hs = bande(ir, rs, fsr, 40, 0, 2, "REF sous-titre")
    jt = bande(ic, ct, fondc, 40, 0, 2, "JEU titre")
    js = bande(ic, cs, fsc, 40, 0, 2, "JEU sous-titre")
    if ht and hs and jt and js:
        print("    => titre %d -> %d px (%+.1f%%) | sous-titre %d -> %d px (%+.1f%%)"
              % (ht, jt, 100 * (jt / ht - 1), hs, js, 100 * (js / hs - 1)))
        print("    => rapport sous-titre/titre  ref=%.3f  jeu=%.3f  (%+.1f%%)"
              % (hs / ht, js / jt, 100 * ((js / jt) / (hs / ht) - 1)))
    print()
