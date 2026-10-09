#!/usr/bin/env python3
"""M7 - plaque creme de E03 : filet pointille, libelle, interlettrage.
Sur la MEME chaine « A QUOI CA SERT » dans la reference et dans la capture :
  - y du filet pointille (ligne la plus 'pointillee' de la fenetre) ;
  - y du haut de capitale du libelle ;
  - ECART filet -> capitale (px, et en px CSS : /3.6 des deux cotes) ;
  - largeur d'encre de la chaine et hauteur de capitale => chasse par capitale.
Les deux images sont a x3,6 : les px se comparent directement en X.
Controle positif : la plaque creme a la MEME couleur de fond des deux cotes.
"""
from PIL import Image

RC = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/'
CAP = RC + 'planches-par-ecran-2026-10-08-client2-mots/'


def med3(v):
    return tuple(sorted(p[i] for p in v)[len(v) // 2] for i in range(3))


def etude(path, x0, x1, ytop, ybot, nom):
    im = Image.open(path).convert('RGB')
    print(f'IMAGE {path.split("/")[-1]}  taille={im.size[0]}x{im.size[1]}')
    px = im.load()
    fond = med3([px[x, y] for y in range(ytop, ybot) for x in range(x1 - 40, x1)])
    # une ligne est "encree" si des px s'ecartent du fond de > 28
    rows = []
    for y in range(ytop, ybot):
        on = [x for x in range(x0, x1)
              if max(abs(px[x, y][i] - fond[i]) for i in range(3)) > 28]
        rows.append((y, len(on), on[0] if on else None, on[-1] if on else None))
    # filet pointille : beaucoup de petits runs
    def nruns(y):
        on = [x for x in range(x0, x1)
              if max(abs(px[x, y][i] - fond[i]) for i in range(3)) > 20]
        n, prev = 0, None
        for x in on:
            if prev is None or x - prev > 1:
                n += 1
            prev = x
        return n, len(on)
    cand = [(nruns(y)[0], y) for y, c, a, b in rows if c > 20]
    filet = max(cand)[1] if cand else None
    # capitale : premiere ligne apres le filet avec >= 15 px encres et peu de runs
    capt = None
    for y, c, a, b in rows:
        if filet is not None and y <= filet + 2:
            continue
        if c >= 15:
            capt = y
            break
    capb = None
    for y, c, a, b in reversed(rows):
        if c >= 8 and (filet is None or y > filet + 2):
            capb = y
            break
    enc = [(a, b) for y, c, a, b in rows if c >= 8 and (filet is None or y > filet + 2)]
    lx0 = min(a for a, b in enc); lx1 = max(b for a, b in enc)
    print(f'  {nom}')
    print(f'    fond plaque (mediane)  = {fond}')
    print(f'    filet pointille a y    = {filet}  (runs={nruns(filet)[0]}, px={nruns(filet)[1]})')
    print(f'    haut de capitale a y   = {capt}   bas={capb}  hauteur={capb-capt+1} px '
          f'({(capb-capt+1)/3.6:.1f} px CSS)')
    print(f'    ECART filet->capitale  = {capt-filet} px ({(capt-filet)/3.6:.1f} px CSS)')
    print(f'    encre du libelle       = x {lx0}..{lx1} -> largeur {lx1-lx0+1} px '
          f'({(lx1-lx0+1)/3.6:.1f} px CSS)')
    return capt - filet, lx1 - lx0 + 1, capb - capt + 1


print('--- CAPTURE E03 (1080x2400) : ligne « A QUOI CA SERT » ---')
a = etude(CAP + 'E03_Chanedappro_1080x2400.png', 95, 420, 900, 965, 'capture')
print('--- REFERENCE ecran_appro (1080x2102) : meme ligne ---')
b = etude(RC + 'ecran_appro/reference-1080x2102.png', 78, 420, 745, 810, 'reference')
print(f'=> ECART filet->capitale : jeu {a[0]} px / ref {b[0]} px  '
      f'(delta {a[0]-b[0]} px, soit {(a[0]-b[0])/3.6:.1f} px CSS)')
print(f'=> largeur de la MEME chaine : jeu {a[1]} px / ref {b[1]} px  '
      f'(rapport {a[1]/b[1]:.3f})   hauteur de capitale : jeu {a[2]} / ref {b[2]} px')
