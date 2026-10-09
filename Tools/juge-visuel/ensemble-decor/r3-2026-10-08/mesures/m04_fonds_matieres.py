"""m04 — FONDS ET MATIERES (critere A/B « fond, matiere » du dossier).

Pour chaque matiere : mediane RGB d'une fenetre d'aplat (>= 3 px de tout bord) ET
ecart-type des luminances dans la meme fenetre = la GRANULOMETRIE. Une matiere
« liege », « kraft », « tole » a du grain : ecart-type non nul. Un aplat n'en a pas.

CONTROLE POSITIF : le fond de scene sombre du bandeau haut, dont on sait qu'il est
le meme decor des deux cotes, doit ressortir proche.
CONTROLE NEGATIF : le liege de ⑮ (reference) vs la tole de ⑭ (reference) — deux
matieres differentes dans les MAQUETTES : si l'instrument les rendait egales, il ne
mesure rien.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import outils as O


def matiere(im, rect, etiq):
    x0, y0, x1, y1 = rect
    med = O.mediane(im, x0, y0, x1, y1)
    px = im.load()
    ls = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            ls.append(O.lum(px[x, y]))
    moy = sum(ls) / len(ls)
    var = sum((v - moy) ** 2 for v in ls) / len(ls)
    et = var ** 0.5
    print("   %-40s mediane=%-16s lum_moy=%.4f  grain(ecart-type lum)=%.5f  (fenetre %dx%d)"
          % (etiq, str(med), moy, et, x1 - x0, y1 - y0))
    return med, moy, et


print("=== m04 FONDS ET MATIERES ===")
print()
print("-- ㉘ E04 : la planche sur laquelle vit la fiche « D'OU CA PART » --")
r = O.ref("E04-cadre-54.png"); c = O.cap("E04_Distribution_1080x2400.png")
a = matiere(r, (120, 900, 420, 1100), "REF kraft (cadre 54, hors fiches)")
b = matiere(c, (120, 1130, 420, 1200), "JEU plaque (sous la fiche)")
print("   -> ecart de mediane par canal : %s" % (tuple(b[0][i] - a[0][i] for i in range(3)),))
print("   -> grain : ref %.5f  jeu %.5f  (rapport %.2f)" % (a[2], b[2], (b[2] / a[2]) if a[2] else -1))

print()
print("-- ⑮ E09 : le liege --")
r = O.ref("E09-cadre-33-signalement.png"); c = O.cap("E09_Inspections_1080x2400.png")
a = matiere(r, (120, 1700, 420, 1900), "REF liege (cadre 33, zone nue)")
a31 = matiere(O.ref("E09-cadre-31-tableau.png"), (120, 260, 420, 400), "REF liege (cadre 31, zone nue)")
b = matiere(c, (120, 1750, 420, 1950), "JEU liege (zone nue)")
print("   -> ecart de mediane par canal vs cadre 33 : %s" % (tuple(b[0][i] - a[0][i] for i in range(3)),))
print("   -> ecart de mediane par canal vs cadre 31 : %s" % (tuple(b[0][i] - a31[0][i] for i in range(3)),))
print("   -> grain : ref33 %.5f  ref31 %.5f  jeu %.5f" % (a[2], a31[2], b[2]))

print()
print("-- ⑭ E08 : la tole --")
r = O.ref("E08-cadre-18-au-calme.png"); c = O.cap("E08_Lasemaine_1080x2400.png")
a = matiere(r, (60, 1780, 300, 1900), "REF tole (cadre 18, zone nue)")
b = matiere(c, (60, 1700, 300, 1820), "JEU tole (zone nue)")
print("   -> ecart de mediane par canal : %s" % (tuple(b[0][i] - a[0][i] for i in range(3)),))

print()
print("-- ⑤ E11 : le tapis de feutre --")
r = O.ref("E11-cadre-04-la-carte-distribuee.png"); c = O.cap("E11_DecisionDetail_1080x2400.png")
a = matiere(r, (760, 900, 900, 1050), "REF feutre (a droite de la carte)")
b = matiere(c, (760, 1250, 900, 1400), "JEU feutre (a droite de la carte)")
print("   -> ecart de mediane par canal : %s" % (tuple(b[0][i] - a[0][i] for i in range(3)),))

print()
print("-- CONTROLE NEGATIF : liege (ref ⑮ cadre 33) vs tole (ref ⑭ cadre 18) --")
d = tuple(a31[0][i] - matiere(O.ref("E08-cadre-18-au-calme.png"), (60, 1780, 300, 1900), "REF tole")[0][i] for i in range(3))
print("   -> ecart de mediane par canal entre deux matieres MAQUETTE differentes : %s" % (d,))
