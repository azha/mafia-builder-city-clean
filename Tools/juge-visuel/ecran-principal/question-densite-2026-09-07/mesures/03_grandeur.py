#!/usr/bin/env python3
"""03 - CHOIX DE LA GRANDEUR, avant tout comptage.
Question : quelle grandeur separe 'batî' de 'sol nu' dans cette image ?
Piege connu : le sol nu porte des ombres a BORD DUR ; toute mesure de contraste
local les comptera comme du detail. On regarde donc la grandeur AVANT de compter,
et on exige qu'elle separe le batî du BORD D'OMBRE, pas seulement du sol plat."""
from PIL import Image, ImageFilter
import os
D = os.path.dirname(__file__)
im = Image.open(os.path.join(D, '..', 'capture-nuit-1080x1920.png')).convert('RGB')
W, H = im.size
print("taille source : %d x %d" % (W, H))

L = im.convert('L')
rng = ImageFilter.MaxFilter(9)
mn  = ImageFilter.MinFilter(9)
Lmax = L.filter(rng); Lmin = L.filter(mn)
import PIL.ImageChops as C
R9 = C.subtract(Lmax, Lmin)          # amplitude locale 9x9
R9.save(os.path.join(D, '03_amplitude_locale.png'))
print("ecrit 03_amplitude_locale.png (amplitude locale 9x9 de la luminance)")

p = R9.load()
def stat(name, x0, y0, x1, y1):
    v = [p[x, y] for x in range(x0, x1) for y in range(y0, y1)]
    v.sort(); n = len(v)
    frac = sum(1 for t in v if t >= 12) / n
    print("%-28s zone=(%4d,%4d)-(%4d,%4d) n=%6d  med=%3d  p90=%3d  frac(amp>=12)=%.3f"
          % (name, x0, y0, x1, y1, n, v[n//2], v[int(n*0.9)], frac))
    return frac

print("\n== CONTROLES : la grandeur separe-t-elle ce qu'on veut ? ==")
print("-- POSITIFS (du bati : doit sortir HAUT) --")
b1 = stat("bati tour gauche",        230, 470,  350, 640)
b2 = stat("bati immeuble central",   400, 420,  580, 610)
b3 = stat("bati usine (quai)",       470,1180,  790,1300)
b4 = stat("bati commerces gauche",    60, 900,  330,1010)
print("-- NEGATIFS (pas du bati : doit sortir BAS) --")
n1 = stat("sol nu plat (haut)",      100, 300,  400,  420)
n2 = stat("sol nu plat (droite)",    620, 300,  900,  400)
n3 = stat("eau plein",               150,1600,  700,1700)
n4 = stat("quai dalle nue",          820,1360, 1030,1450)
print("-- NEGATIF DISCRIMINANT (BORD D'OMBRE sur sol nu : doit sortir BAS aussi) --")
n5 = stat("bord d'ombre sur sol nu",   0, 270,  300,  330)
n6 = stat("bord d'ombre diagonal",   700, 200, 1000,  290)

print("\n== VERDICT SUR LA GRANDEUR ==")
lo_bati = min(b1,b2,b3,b4); hi_non = max(n1,n2,n3,n4,n5,n6)
print("plancher des positifs = %.3f" % lo_bati)
print("plafond  des negatifs = %.3f" % hi_non)
print("SEPARATION" if lo_bati > hi_non else "PAS DE SEPARATION -> la grandeur est mauvaise")
