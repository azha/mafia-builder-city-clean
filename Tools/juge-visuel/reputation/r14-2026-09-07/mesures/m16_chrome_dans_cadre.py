"""m16 — le CHROME tombe-t-il DANS le cadre ? (question 3 du dossier, borne haute)
Le chrome depasse sous son filet (y142) : le medaillon et le losange. On mesure jusqu'ou
ils descendent, et on compare au filet HAUT du cadre (1920 : y162..164 ; 2400 : y482..485).
Encre = px dont la luminance depasse de 8 pts la mediane de la meme rangee prise HORS de
la zone du medaillon (x0..380 et x700..1079) : le fond du sas est ainsi retire.
Controle positif : a 2400 le medaillon doit descendre a y~203 (mesure r13) et se trouver
LOIN au-dessus du cadre (482) ; si mon instrument dit l'inverse il est faux.
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane

for nom, fp, filet_cadre in [('JEU2400','../capture-1080x2400.png', 482),
                             ('JEU1920','../capture-1080x1920.png', 162)]:
    im = ouvrir(fp); px = im.load()
    print(f"\n== {nom} : filet du bandeau y142 · filet HAUT du cadre y{filet_cadre} ==")
    for y in range(143, filet_cadre + 130):
        ref = mediane([lum(px[x, y]) for x in list(range(60, 360)) + list(range(720, 1020))])
        xs = [x for x in range(300, 780) if lum(px[x, y]) > ref + 8]
        if xs:
            print(f"   y={y:4d}  encre du chrome x{min(xs)}..{max(xs)}  n={len(xs)}"
                  f"  {'<<< SOUS le filet du cadre' if y > filet_cadre else ''}")
