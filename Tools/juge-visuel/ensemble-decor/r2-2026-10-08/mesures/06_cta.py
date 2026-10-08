#!/usr/bin/env python3
"""06 — Le GESTE PRINCIPAL de chaque écran : couleur du remplissage de la barre et couleur
de l'encre du libellé. C'est le point d'arrivée de l'ordre de lecture ; la famille de teinte
de l'or y est un trait d'identité de la série.

Méthode : dans la fenêtre donnée, le FOND est la couleur modale (quantifiée par 8) ;
l'ENCRE est la médiane des pixels s'écartant du fond de plus de 55/255. On rend aussi le
contraste WCAG encre/fond, que la doctrine du dossier fixe à >= 4,5:1 (petits textes)
et >= 3:1 (grands).

Contrôle positif : E03, dont l'œil dit que la barre est fidèle, doit sortir une encre OR
des deux côtés, à moins de 6/255 par canal — la tolérance d'aplat du mandat.
Contrôle négatif : E11, dont l'œil dit que la barre a changé de famille, doit sortir
un écart très au-dessus de cette tolérance. Si les deux sortent pareil, l'instrument ment."""
from PIL import Image
import os, statistics, collections

REF = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference"
CAP = "/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final"

def lin(c):
    c = c/255.0
    return c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4
def lum(rgb):
    return 0.2126*lin(rgb[0]) + 0.7152*lin(rgb[1]) + 0.0722*lin(rgb[2])
def contraste(a, b):
    la, lb = lum(a), lum(b)
    if la < lb: la, lb = lb, la
    return (la+0.05)/(lb+0.05)

def mesure(path, label, box):
    im = Image.open(path).convert("RGB"); px = im.load()
    x0, y0, x1, y1 = box
    pts = [px[x, y] for y in range(y0, y1) for x in range(x0, x1)]
    q = collections.Counter((p[0]//8, p[1]//8, p[2]//8) for p in pts)
    fond_q = q.most_common(1)[0][0]
    fond_pts = [p for p in pts if (p[0]//8, p[1]//8, p[2]//8) == fond_q]
    fond = tuple(int(statistics.median([p[k] for p in fond_pts])) for k in range(3))
    encre_pts = [p for p in pts if max(abs(p[k]-fond[k]) for k in range(3)) > 55]
    if len(encre_pts) < 40:
        print(f"  {label:36s} {im.size[0]}x{im.size[1]}  fond={fond}  encre: < 40 px, non mesurable")
        return None
    encre = tuple(int(statistics.median([p[k] for p in encre_pts])) for k in range(3))
    print(f"  {label:36s} {im.size[0]}x{im.size[1]}  fond={fond}  encre={encre}  "
          f"part d'encre={100*len(encre_pts)/len(pts):4.1f}%  contraste={contraste(encre, fond):4.1f}:1")
    return fond, encre

# fenetres cadrees sur la BARRE du geste principal, verifiees par decoupe
CAS = [
 ("E01 « Y PRÊTER ATTENTION »", REF, "E01-cadre-125.png",       (60, 1900, 1020, 1990),
                                CAP, "E01_Journal_1080x2400.png",(95, 1930, 985, 2010)),
 ("E02 « LANCER LA SOIRÉE »",   REF, "E02-cadre-85.png",        (55, 1940, 1025, 2040),
                                CAP, "E02_Carnet_1080x2400.png", (95, 1965, 985, 2055)),
 ("E03 « EN COMMANDER »",       REF, "E03-cadre-48.png",        (55, 1940, 1025, 2040),
                                CAP, "E03_Chanedappro_1080x2400.png",(50, 2000, 1030, 2090)),
 ("E05 « LUI TROUVER UN AVOCAT »",REF,"E05-cadre-67.png",       (55, 1925, 1025, 2045),
                                CAP, "E05_Loi_1080x2400.png",   (50, 1960, 1030, 2090)),
 ("E06 « VOIR CE QUI COÛTE… »", REF, "E06-cadre-79.png",        (55, 1940, 1025, 2040),
                                CAP, "E06_Dmolition_1080x2400.png",(50, 1960, 1030, 2090)),
 ("E10 geste (INJECTER/BLANCHIR)",REF,"E10-cadre-140-pas-encore-de-filiere.png",(55,1950,1025,2050),
                                CAP, "E10_Filire_1080x2400.png",(50, 1965, 1030, 2055)),
 ("E11 « LES LIRE MAINTENANT »",REF, "E11-cadre-04-la-carte-distribuee.png",(55,1910,1025,1995),
                                CAP, "E11_DecisionDetail_1080x2400.png",(50, 1935, 1030, 2020)),
]
ecarts = {}
for nom, rb, rf, rbox, cb, cf, cbox in CAS:
    print(nom)
    a = mesure(os.path.join(rb, rf), "réf  "+rf, rbox)
    b = mesure(os.path.join(cb, cf), "jeu  "+cf, cbox)
    if a and b:
        d = max(abs(a[1][k]-b[1][k]) for k in range(3))
        ecarts[nom] = d
        print(f"      -> écart d'ENCRE réf/jeu = {d}/255 par canal au pire "
              f"({'DANS' if d <= 6 else 'HORS'} la tolérance d'aplat de 6/255)")
    print()
print("=== contrôles ===")
print("positif E03 (barre jugée fidèle à l'œil)  écart =", ecarts.get("E03 « EN COMMANDER »"))
print("négatif E11 (barre jugée changée à l'œil) écart =", ecarts.get("E11 « LES LIRE MAINTENANT »"))
