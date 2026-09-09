# -*- coding: utf-8 -*-
"""Manometre : le bord SUPERIEUR de l arc colore est-il un ARC DE CERCLE ou une ligne BRISEE ?
Le boitier BRULANT etant de la meme couleur que le secteur chaud, la zone d analyse est bornee
a l INTERIEUR du disque (r < 0,88 R_boitier) : controle de portee explicite.
Discriminant : residu maximal au cercle passant par (bout gauche, sommet, bout droit).
Controle POSITIF : REFERENCE et CANON dessinent des arcs SVG `A15 15` -> residu attendu petit."""
from lib_mes import *
import math

def teal(c):
    r,g,b = c
    return b > r+15 and g > r+10 and 50 < g < 210
def braisec(c):
    r,g,b = c
    return r > 95 and g < r-32 and b < r-32
def secteur(c):
    return teal(c) or braisec(c)

def cercle3(p1, p2, p3):
    (x1,y1),(x2,y2),(x3,y3) = p1,p2,p3
    d = 2*(x1*(y2-y3)+x2*(y3-y1)+x3*(y1-y2))
    ux = ((x1*x1+y1*y1)*(y2-y3)+(x2*x2+y2*y2)*(y3-y1)+(x3*x3+y3*y3)*(y1-y2))/d
    uy = ((x1*x1+y1*y1)*(x3-x2)+(x2*x2+y2*y2)*(x1-x3)+(x3*x3+y3*y3)*(x2-x1))/d
    r = math.hypot(x1-ux, y1-uy)
    return ux, uy, r

def analyse(chemin, cx, cy, R, nom):
    im = ouvrir(chemin); p = im.load(); w, h = im.size
    lim = 0.88*R
    bord = []
    for x in range(int(cx-lim), int(cx+lim)+1):
        for y in range(int(cy-lim), int(cy)+1):
            if math.hypot(x-cx, y-cy) > lim: continue
            if secteur(p[x, y]):
                bord.append((x, y)); break
    if len(bord) < 20:
        print('   %s : trop peu de points (%d)' % (nom, len(bord))); return
    xs = [b[0] for b in bord]
    print('   %-9s bord superieur : %d colonnes, x=%d..%d' % (nom, len(bord), min(xs), max(xs)))
    g, d = bord[0], bord[-1]
    som = min(bord, key=lambda b: b[1])
    ux, uy, r = cercle3(g, som, d)
    res = [abs(math.hypot(b[0]-ux, b[1]-uy) - r) for b in bord]
    resmax = max(res); resmoy = sum(res)/len(res)
    print('        gauche=%s  sommet=%s  droit=%s' % (g, som, d))
    print('        cercle ajuste : centre=(%.1f,%.1f) R=%.1f px' % (ux, uy, r))
    print('        RESIDU au cercle : max=%.2f px   moyen=%.2f px   (%.1f %% de R)' % (resmax, resmoy, 100*resmax/r))
    # echantillon du profil
    ech = bord[::max(1, len(bord)//14)]
    print('        profil y(x) : ' + ' '.join('%d:%d' % b for b in ech))
    return resmax, resmoy, r

print('--- REFERENCE (cadre serie 6, arcs SVG) ---')
analyse('../reference-1080x2102.png', 533.0, 133.0, 78.0, 'REFERENCE')
print()
print('--- CANON HUD (arcs SVG) ---')
analyse('../hud-canon-1176.png', 587.5, 116.5, 95.5, 'CANON')
print()
print('--- CAPTURE (client) ---')
analyse('../capture-1080x2400.png', 539.5, 109.5, 91.5, 'CAPTURE')
