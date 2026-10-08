"""m07 — (a) la COULEUR DE L'ENCRE SECONDAIRE (sous-titres de bandeau) sur les 4 ecrans
             qui partagent le bandeau : trait d'ENSEMBLE ;
        (b) la GOUTTIERE : bord gauche et bord droit de l'encre du corps d'ecran,
             hors chrome (bandeau haut, dock bas) — doctrine « gouttiere » ;
        (c) le petit texte du registre de ⑮ (contraste, rect serre).

CONTROLE POSITIF (a) : l'encre de l'eyebrow « LA SUITE » de A01, deja mesuree egale
(185,173,146) des deux cotes en m06, est reprise ici.
CONTROLE POSITIF (b) : la largeur d'image, 1080 px des deux cotes.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import outils as O


def encre(im, rect, etiq, part=0.04):
    x0, y0, x1, y1 = rect
    px = im.load()
    pts, comptes = [], {}
    for y in range(y0, y1):
        for x in range(x0, x1):
            p = px[x, y]
            pts.append(p)
            comptes[p] = comptes.get(p, 0) + 1
    fond = max(comptes.items(), key=lambda kv: kv[1])[0]
    lf = O.lum(fond)
    pts.sort(key=lambda p: abs(O.lum(p) - lf), reverse=True)
    n = max(1, int(len(pts) * part))
    coeur = sorted(pts[:n], key=O.lum)
    enc = coeur[len(coeur) // 2]
    print("   %-38s fond=%-16s encre=%-16s contraste=%.2f:1" % (etiq, str(fond), str(enc), O.contraste(enc, fond)))
    return enc, fond


print("=== m07a ENCRE SECONDAIRE DES SOUS-TITRES DE BANDEAU ===")
CAS = [
    ("㉚ E03", ("E03-cadre-48.png", (50, 535, 910, 572)), ("E03_Chanedappro_1080x2400.png", (55, 610, 950, 655))),
    ("㉘ E04", ("E04-cadre-54.png", (50, 535, 730, 572)), ("E04_Distribution_1080x2400.png", (55, 608, 870, 655))),
    ("㉛ E05", ("E05-cadre-67.png", (50, 533, 850, 572)), ("E05_Loi_1080x2400.png", (55, 610, 950, 655))),
    ("㉝ E06", ("E06-cadre-79.png", (50, 535, 800, 572)), ("E06_Dmolition_1080x2400.png", (45, 655, 390, 695))),
    ("㉞ E02", ("E02-cadre-85.png", (50, 535, 730, 572)), ("E02_Carnet_1080x2400.png", (50, 612, 960, 680))),
]
for nom, (fr, rr), (fc, rc) in CAS:
    print(" " + nom)
    a = encre(O.ref(fr), rr, "REF")
    b = encre(O.cap(fc), rc, "JEU")
    print("   => ecart d'encre par canal : %s" % (tuple(b[0][i] - a[0][i] for i in range(3)),))

print()
print("=== m07b GOUTTIERE — bord d'encre gauche/droit du corps d'ecran ===")
print("   (on ignore le bandeau haut y<260 et le dock y>2250 ; seuil d'encre 28/255 au-dessus du fond du bord)")
PLANCHES = [
    "A01_AccueilFile2Cartes_1080x2400.png", "E01_Journal_1080x2400.png", "E02_Carnet_1080x2400.png",
    "E03_Chanedappro_1080x2400.png", "E04_Distribution_1080x2400.png", "E05_Loi_1080x2400.png",
    "E06_Dmolition_1080x2400.png", "E07_Boutique_1080x2400.png", "E08_Lasemaine_1080x2400.png",
    "E09_Inspections_1080x2400.png", "E10_Filire_1080x2400.png", "E11_DecisionDetail_1080x2400.png",
]


def bords(im, y0, y1):
    px = im.load()
    # fond de reference : la colonne x=2 (tout a gauche), mediane sur la plage
    g = O.mediane(im, 0, y0, 4, y1)
    d = O.mediane(im, 1076, y0, 1080, y1)
    gauche, droite = None, None
    for x in range(0, 540):
        col = [px[x, y] for y in range(y0, y1, 4)]
        if sum(1 for p in col if O.dist(p, g) > 28) > len(col) * 0.10:
            gauche = x
            break
    for x in range(1079, 540, -1):
        col = [px[x, y] for y in range(y0, y1, 4)]
        if sum(1 for p in col if O.dist(p, d) > 28) > len(col) * 0.10:
            droite = x
            break
    return g, d, gauche, droite


for f in PLANCHES:
    im = O.cap(f)
    g, d, gx, dx = bords(im, 500, 2200)
    print("   %-44s fond bord G=%-15s D=%-15s  encre de x=%s a x=%s (marge G=%s px, D=%s px)"
          % (f, str(g), str(d), gx, dx, gx, (1079 - dx) if dx else None))

print()
print("   memes bords sur les CADRES de reference (le cadre de telephone occupe ~10 px) :")
for f in ["E03-cadre-48.png", "E04-cadre-54.png", "E01-cadre-125.png", "E10-cadre-140-pas-encore-de-filiere.png",
          "E09-cadre-31-tableau.png", "E08-cadre-18-au-calme.png", "A01-cadre-4-la-suite.png"]:
    im = O.ref(f)
    g, d, gx, dx = bords(im, 500, 2000)
    print("   %-44s fond bord G=%-15s D=%-15s  encre de x=%s a x=%s" % (f, str(g), str(d), gx, dx))

print()
print("=== m07c ⑮ : petit texte du registre, rect serre ===")
c = O.cap("E09_Inspections_1080x2400.png")
encre(c, (135, 1272, 945, 1292), "JEU « 18 DISTRICTS · TOUT OU RIEN... »", 0.02)
encre(c, (330, 1296, 760, 1316), "JEU « PARTOUT A LA FOIS »", 0.02)
encre(c, (110, 1086, 810, 1118), "JEU « DISTRICT CHARGE REGIME ORIGINES »", 0.03)
