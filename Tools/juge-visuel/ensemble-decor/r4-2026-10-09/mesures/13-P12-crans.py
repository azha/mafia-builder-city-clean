#!/usr/bin/env python3
"""P12 — E08 ⑭ : le cran « ecrasante » de la jauge de tension. Aucun cadre ne le montre :
on dit seulement s'il est RENDU PROPREMENT. On le compare donc a ses TROIS FRERES de la meme
jauge (meme image) : un cran propre a le meme diametre et la meme encre que ses freres.

Detection : composantes de pixels « or clair » (R>150, R-B>60) dans la boite de la jauge,
retenues si elles font >= 100 px. Pour chacune : bbox, diametre, RGB median du centre.
Echelle : 1 px CSS = 3,6 px image des deux cotes.
Controle positif : la jauge de REFERENCE doit rendre 4 crans de diametre egal (+-2 px).
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *

def composantes(im, box, pred, mini=100):
    x0, y0, x1, y1 = box
    c = im.crop(box); W, H = c.size
    px = list(c.getdata())
    m = [pred(px[i]) for i in range(len(px))]
    vu = [False] * len(px)
    out = []
    for i in range(len(px)):
        if m[i] and not vu[i]:
            pile = [i]; vu[i] = True; comp = []
            while pile:
                j = pile.pop(); comp.append(j)
                jy, jx = divmod(j, W)
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = jy + dy, jx + dx
                    if 0 <= ny < H and 0 <= nx < W:
                        k = ny * W + nx
                        if m[k] and not vu[k]:
                            vu[k] = True; pile.append(k)
            if len(comp) >= mini:
                ys = [j // W for j in comp]; xs = [j % W for j in comp]
                out.append(dict(n=len(comp), x0=x0 + min(xs), x1=x0 + max(xs),
                                y0=y0 + min(ys), y1=y0 + max(ys)))
    return out

pred = lambda p: p[0] > 150 and p[0] - p[2] > 60

CAS = [("ref", "E08-cadre-18-au-calme", (190, 1270, 900, 1580)),
       ("cap", "E08_Lasemaine_1080x2400", (170, 940, 920, 1280)),
       ("cap", "E08_Lasemaine_1080x1920", (170, 815, 920, 1155))]
for kind, nom, box in CAS:
    im = ouvrir(kind, nom)
    cs = composantes(im, box, pred)
    # on ne garde que les composantes « rondes » : largeur ~ hauteur, < 90 px
    ronds = [c for c in cs if abs((c['x1'] - c['x0']) - (c['y1'] - c['y0'])) <= 14
             and 15 <= (c['x1'] - c['x0']) <= 90]
    ronds.sort(key=lambda c: (c['y0'], c['x0']))
    print(f"   {nom}  boite={box} : {len(cs)} composantes or, dont {len(ronds)} rondes")
    for c in ronds:
        w, h = c['x1'] - c['x0'] + 1, c['y1'] - c['y0'] + 1
        cx, cy = (c['x0'] + c['x1']) // 2, (c['y0'] + c['y1']) // 2
        (md, _) = med(im, cx - 3, cy - 3, cx + 4, cy + 4)
        print(f"      cran centre=({cx},{cy})  {w}x{h}px = {w/K:.2f}x{h/K:.2f} css  "
              f"aire={c['n']}px  RGB centre={md}")
    d = [c['x1'] - c['x0'] + 1 for c in ronds]
    if d:
        print(f"      diametres={d}  ecart max={max(d)-min(d)}px -> "
              + ("CRANS EGAUX" if max(d) - min(d) <= 4 else "CRANS INEGAUX"))
