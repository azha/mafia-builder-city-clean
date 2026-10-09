"""m10 — (a) ⑮ : le liege, couleur et ETENDUE aux deux resolutions ;
        (b) ⑤  : la place de l'eyebrow « CE QUI PESE LE PLUS … » et le lisere de la carte ;
        (c) ⑤  : la carte est-elle droite ou inclinee des deux cotes ?

CONTROLE POSITIF (a) : la couleur du liege du JEU mesuree deux fois (2400 et 1920) doit
etre la meme : c'est la meme matiere rendue a deux hauteurs.
CONTROLE POSITIF (c) : le bord GAUCHE de la carte de ⑤ est droit (vertical) dans la
reference ; si l'instrument le trouvait incline, il mesure autre chose.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import outils as O

print("=== m10a ⑮ le liege ===")
for f, fen in [("E09_Inspections_1080x2400.png", (120, 1750, 420, 1950)),
               ("E09_Inspections_1080x1920.png", (120, 1400, 420, 1560))]:
    im = O.cap(f)
    print("   %-36s mediane=%s" % (f, O.mediane(im, *fen)))
print("   cadre 31 (reference)                 mediane=%s" % (O.mediane(O.ref("E09-cadre-31-tableau.png"), 120, 300, 420, 400),))
print("   cadre 33 (reference)                 mediane=%s" % (O.mediane(O.ref("E09-cadre-33-signalement.png"), 120, 1700, 420, 1900),))

print()
print("   etendue verticale du liege (colonne x=30, du haut vers le bas) :")
for f in ("E09_Inspections_1080x2400.png", "E09_Inspections_1080x1920.png"):
    im = O.cap(f)
    px = im.load()
    deb, fin = None, None
    for y in range(150, im.height):
        r, g, b = px[30, y]
        liege = r > 80 and g > 55 and b < g - 15 and r > b + 45
        if liege and deb is None:
            deb = y
        if liege:
            fin = y
    print("     %-36s liege de y=%s a y=%s  => %s px image = %.0f px CSS"
          % (f, deb, fin, (fin - deb + 1) if deb else None, O.css(fin - deb + 1) if deb else -1))

print()
print("=== m10b ⑤ l'eyebrow « CE QUI PESE LE PLUS … » ===")
r = O.ref("E11-cadre-04-la-carte-distribuee.png")
c = O.cap("E11_DecisionDetail_1080x2400.png")
print("   REF : bande d'encre entre le haut du tapis et la carte (x=120..920, y=760..840)")
for b in O.bandes(O.profil_lignes(r, 120, 760, 920, 850, (26, 73, 50), 45), 2):
    bb = O.bbox_encre(r, 120, b[0], 920, b[1] + 1, (26, 73, 50), 45)
    print("      y=%d..%d  x=%d..%d" % (b[0], b[1], bb[0], bb[2]))
print("   JEU : meme zone (x=120..920, y=900..990) sur le tapis")
for b in O.bandes(O.profil_lignes(c, 120, 900, 920, 990, (24, 66, 47), 45), 2):
    bb = O.bbox_encre(c, 120, b[0], 920, b[1] + 1, (24, 66, 47), 45)
    print("      y=%d..%d  x=%d..%d" % (b[0], b[1], bb[0], bb[2]))
print("   JEU : l'eyebrow se trouve-t-il DANS la carte ? (x=120..700, y=1190..1240)")
for b in O.bandes(O.profil_lignes(c, 120, 1180, 700, 1250, (219, 206, 171), 45), 2):
    bb = O.bbox_encre(c, 120, b[0], 700, b[1] + 1, (219, 206, 171), 45)
    print("      y=%d..%d  x=%d..%d" % (b[0], b[1], bb[0], bb[2]))

print()
print("=== m10c ⑤ inclinaison de la carte : x du bord gauche a 3 hauteurs ===")


def bord_gauche(im, y, fond, seuil=45, x0=40, x1=400):
    px = im.load()
    for x in range(x0, x1):
        if O.dist(px[x, y], fond) > seuil:
            return x
    return None


print("   REF (fond feutre (26,73,50)) :")
for y in (950, 1200, 1450):
    print("      y=%d  bord gauche x=%s" % (y, bord_gauche(r, y, (31, 57, 37))))
print("   JEU (fond feutre (27,72,50)) :")
for y in (1050, 1300, 1550):
    print("      y=%d  bord gauche x=%s" % (y, bord_gauche(c, y, (27, 72, 50))))

print()
print("=== m10d ⑤ liseré d'or du tapis : y a-t-il un filet d'or en haut du tapis ? ===")
for nom, im, y0, y1 in (("REF", r, 680, 740), ("JEU", c, 860, 920)):
    px = im.load()
    out = []
    for y in range(y0, y1):
        n = sum(1 for x in range(200, 880, 2) if (lambda p: p[0] > 110 and p[1] > 80 and p[2] < p[0] - 40)(px[x, y]))
        if n * 2 > 300:
            out.append((y, n * 2))
    print("   %-4s lignes d'or (>300 px) y=%d..%d : %s" % (nom, y0, y1, out))
