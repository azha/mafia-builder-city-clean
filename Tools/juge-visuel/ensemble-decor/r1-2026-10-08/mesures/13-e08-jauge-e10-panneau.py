#!/usr/bin/env python3
"""M13 - deux elements heros.
(a) E08 : l'arc de TENSION de la maquette est en or et occupe le haut du corps.
    On compte la part de px OR dans le corps, cote maquette (v4-29, x3,0, et
    cadre 25, x3,6) et cote jeu. Un arc absent = une chute franche.
(b) E10 : le panneau des noeuds. bbox du cadre, surface, et part d'encre dedans.
Controle positif (a) : le MEME masque or trouve l'anneau du manometre dans le
chrome des deux cotes -> on l'imprime aussi.
"""
from PIL import Image

RC = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/'
CAP = RC + 'planches-par-ecran-2026-10-08-client2-mots/'
OR = lambda p: p[0] > 130 and p[0] - p[2] > 55 and p[1] > 95


def part_or(path, y0, y1, nom):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    print(f'IMAGE {path.split("/")[-1]}  taille={w}x{h}')
    px = im.load()
    n = t = 0
    for y in range(y0, y1, 2):
        for x in range(6, w - 6, 2):
            t += 1
            if OR(px[x, y]):
                n += 1
    chr_n = chr_t = 0
    for y in range(0, 240, 2):
        for x in range(6, w - 6, 2):
            chr_t += 1
            if OR(px[x, y]):
                chr_n += 1
    print(f'  {nom:34s} corps y {y0}..{y1} : OR = {100*n/t:5.2f} %   '
          f'| controle chrome y 0..240 : OR = {100*chr_n/chr_t:5.2f} %')
    return 100 * n / t


print('=== (a) E08 : l arc de TENSION ===')
part_or(RC + 'compression/v4-29.png', 180, 900, 'maquette v4-29 (x3,0) "au calme"')
part_or(RC + 'compression/reference-1080x2102.png', 220, 1100, 'maquette cadre 25 (x3,6)')
part_or(CAP + 'E08_Lasemaine_1080x2400.png', 250, 1250, 'JEU E08 (x3,6)')

print('=== (b) E10 : le panneau des noeuds ===')
p = CAP + 'E10_Filire_1080x2400.png'
im = Image.open(p).convert('RGB')
w, h = im.size
print(f'IMAGE {p.split("/")[-1]}  taille={w}x{h}')
px = im.load()
# cadre : bord clair du panneau, cherche entre y 880 et 1600
ys = [y for y in range(880, 1620)
      if sum(1 for x in range(60, w - 60, 2)
             if sum(px[x, y]) / 3 > 26) > 300]
x0 = min(x for x in range(0, w)
         if sum(px[x, y][0] for y in range(1000, 1400)) / 400 > 20)
print(f'    bord haut/bas detectes : y {min(ys)}..{max(ys)}  (hauteur {max(ys)-min(ys)+1} px)')
inner = (48, min(ys) + 6, 1032, max(ys) - 6)
tot = enc = 0
for y in range(inner[1], inner[3], 2):
    for x in range(inner[0], inner[2], 2):
        tot += 1
        if sum(px[x, y]) / 3 > 40:
            enc += 1
aire = (inner[2] - inner[0]) * (inner[3] - inner[1])
print(f'    interieur {inner} = {aire} px^2 = {100*aire/(w*h):.1f} % de l ecran ; '
      f'encre (px > 40/255) = {100*enc/tot:.2f} %')
