"""m05 — (a) la PLAQUE de ㉘ echantillonnee en 6 fenetres (pour ne pas conclure d'une seule) ;
        (b) le FILET D'OR qui separe la scene du corps sur ⑭ (cadre 18) ;
        (c) la bordure de la carte de ⑤ ;
        (d) presence/absence d'un cadre sur la plaque de ㉘.

CONTROLE POSITIF : sur la MEME capture ㉘, la fiche creme « D'OU CA PART » est un aplat
voulu ; son grain doit ressortir ~0 lui aussi => l'instrument sait reconnaitre un aplat.
CONTROLE NEGATIF : le kraft de la reference, mesure dans les memes 6 fenetres, doit
ressortir avec du grain partout.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import outils as O


def grain(im, rect):
    x0, y0, x1, y1 = rect
    px = im.load()
    ls = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            ls.append(O.lum(px[x, y]))
    moy = sum(ls) / len(ls)
    et = (sum((v - moy) ** 2 for v in ls) / len(ls)) ** 0.5
    return O.mediane(im, x0, y0, x1, y1), moy, et


print("=== m05a ㉘ : la plaque, 6 fenetres ===")
c = O.cap("E04_Distribution_1080x2400.png")
r = O.ref("E04-cadre-54.png")
FEN_JEU = [(80, 1050, 180, 1110), (300, 1050, 400, 1110), (700, 1050, 800, 1110),
           (80, 1150, 180, 1210), (400, 1150, 500, 1210), (850, 1150, 950, 1210)]
FEN_REF = [(60, 700, 160, 760), (300, 700, 400, 760), (700, 700, 800, 760),
           (60, 1150, 160, 1210), (400, 1150, 500, 1210), (850, 1150, 950, 1210)]
for i, f in enumerate(FEN_JEU):
    m, mo, et = grain(c, f)
    print("   JEU plaque fenetre %d %-24s mediane=%-15s grain=%.5f" % (i + 1, str(f), str(m), et))
for i, f in enumerate(FEN_REF):
    m, mo, et = grain(r, f)
    print("   REF kraft  fenetre %d %-24s mediane=%-15s grain=%.5f" % (i + 1, str(f), str(m), et))
print("   CONTROLE POSITIF — la fiche creme du JEU (aplat voulu) :")
m, mo, et = grain(c, (200, 880, 400, 920))
print("      mediane=%s grain=%.5f" % (str(m), et))
print("   CONTROLE POSITIF — la fiche creme de la REF (aplat voulu) :")
m, mo, et = grain(r, (120, 700, 300, 740))
print("      mediane=%s grain=%.5f" % (str(m), et))

print()
print("=== m05b ㉘ : la plaque a-t-elle un CADRE ? (profil sur une ligne horizontale) ===")
px = c.load()
y = 1000
chg = []
prev = px[40, y]
for x in range(40, 1070):
    p = px[x, y]
    if O.dist(p, prev) > 12:
        chg.append((x, prev, p))
    prev = p
print("   JEU y=%d : transitions de couleur > 12/255 : %s" % (y, chg[:12]))
pr = r.load()
y = 900
chg = []
prev = pr[10, y]
for x in range(10, 1070):
    p = pr[x, y]
    if O.dist(p, prev) > 12:
        chg.append((x, prev, p))
    prev = p
print("   REF y=%d : transitions de couleur > 12/255 : %s" % (y, chg[:14]))

print()
print("=== m05c ⑭ : le filet d'or entre la scene et le corps ===")
r8 = O.ref("E08-cadre-18-au-calme.png"); c8 = O.cap("E08_Lasemaine_1080x2400.png")


def cherche_filet(im, y0, y1, etiq):
    px = im.load()
    trouve = []
    for y in range(y0, y1):
        n = 0
        for x in range(100, 980, 2):
            rr, gg, bb = px[x, y]
            if rr > 110 and gg > 80 and bb < rr - 40:
                n += 1
        if n > 200:
            trouve.append((y, n * 2, O.mediane(im, 400, y, 500, y + 1)))
    print("   %-22s lignes d'or pleine largeur : %s" % (etiq, trouve))
    return trouve


cherche_filet(r8, 1120, 1180, "REF cadre 18")
cherche_filet(c8, 790, 900, "JEU 2400")
print("   REF : couleur a la frontiere scene/corps, 3 lignes successives :")
for y in (1140, 1145, 1150, 1155):
    print("      y=%d  %s" % (y, O.mediane(r8, 400, y, 600, y + 1)))
print("   JEU : couleur a la frontiere scene/corps, 3 lignes successives :")
for y in (833, 838, 843, 848):
    print("      y=%d  %s" % (y, O.mediane(c8, 400, y, 600, y + 1)))

print()
print("=== m05d ⑤ : la bordure de la carte ===")
r11 = O.ref("E11-cadre-04-la-carte-distribuee.png"); c11 = O.cap("E11_DecisionDetail_1080x2400.png")
print("   REF — profil horizontal au travers du bord gauche de la carte (y=1200) :")
pr = r11.load()
for x in range(80, 125):
    print("      x=%d %s" % (x, pr[x, 1200]), end="")
    if (x - 80) % 3 == 2:
        print()
print()
print("   JEU — profil horizontal au travers du bord gauche de la carte (y=1400) :")
pc = c11.load()
for x in range(55, 100):
    print("      x=%d %s" % (x, pc[x, 1400]), end="")
    if (x - 55) % 3 == 2:
        print()
print()
