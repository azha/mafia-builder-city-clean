# -*- coding: utf-8 -*-
"""m8 — la valeur ARGENT entre-t-elle dans le médaillon ?
Sonde : pixels OR (r>170, g>120, b<150, r-b>60) dans l'aile gauche ; disque du médaillon = anneau braise.
Contrôle positif : la même sonde sur le canon HUD doit trouver '$ 24 850' ET un écart POSITIF au médaillon."""
import commun as C

print('== m8 : ARGENT vs MEDAILLON ==')
cap = C.ouvrir('capture'); hud = C.ouvrir('hud')

est_or = lambda p: p[0]>170 and p[1]>110 and p[2]<160 and p[0]-p[2]>60

def sonde_or(im, nom, zone):
    p = im.load(); x0,y0,x1,y1 = zone
    mnx,mny,mxx,mxy,n = 10**9,10**9,-1,-1,0
    for y in range(y0,y1):
        for x in range(x0,x1):
            if est_or(p[x,y]):
                n+=1; mnx=min(mnx,x); mny=min(mny,y); mxx=max(mxx,x); mxy=max(mxy,y)
    print('   %-26s OR bbox=(%4d,%4d,%4d,%4d) l=%3d h=%2d n=%d' % (nom,mnx,mny,mxx,mxy,mxx-mnx+1,mxy-mny+1,n))
    return (mnx,mny,mxx,mxy)

def sonde_anneau(im, nom, zone, test):
    p = im.load(); x0,y0,x1,y1 = zone
    mnx,mxx,n = 10**9,-1,0
    for y in range(y0,y1):
        for x in range(x0,x1):
            if test(p[x,y]):
                n+=1; mnx=min(mnx,x); mxx=max(mxx,x)
    print('   %-26s ANNEAU x=%d..%d (diam %d px) n=%d' % (nom,mnx,mxx,mxx-mnx+1,n))
    return mnx,mxx

braise = lambda p: p[0]>140 and p[0]-p[1]>60 and p[0]-p[2]>60
laiton = lambda p: p[0]>150 and p[1]>115 and p[2]<120 and p[0]-p[2]>70

print('\n-- CAPTURE (bandeau y<135, filet rouge y=141 exclu) --')
b_or  = sonde_or(cap, 'valeur argent (or)', (150, 55, 445, 115))
a0,a1 = sonde_anneau(cap, 'medaillon (braise)', (330, 5, 760, 135), braise)
print('   -> bord droit du texte OR = %d ; bord gauche de l anneau = %d ; ecart = %+d px' % (b_or[2], a0, a0-b_or[2]-1))
# le texte deborde-t-il DANS le disque ? on cherche de l or a droite de a0
p = cap.load(); dedans = 0; xmax=0
for y in range(55,115):
    for x in range(a0, 760):
        if est_or(p[x,y]): dedans+=1; xmax=max(xmax,x)
print('   -> pixels OR situes DANS l emprise du medaillon (x>=%d) : %d  (x le plus a droite = %d)' % (a0, dedans, xmax))

print('\n-- CONTRÔLE POSITIF : canon HUD --')
h_or  = sonde_or(hud, 'valeur argent (or)', (40, 40, 420, 135))
h0,h1 = sonde_anneau(hud, 'medaillon (laiton)', (430, 5, 780, 200), laiton)
print('   -> bord droit du texte OR = %d ; bord gauche de l anneau = %d ; ecart = %+d px (%.1f %% de la largeur)'
      % (h_or[2], h0, h0-h_or[2]-1, 100.0*(h0-h_or[2]-1)/1176))
ph = hud.load(); dedans_h=0
for y in range(40,135):
    for x in range(h0, 780):
        if est_or(ph[x,y]): dedans_h+=1
print('   -> pixels OR dans l emprise du medaillon : %d (attendu ~0)' % dedans_h)

print('\n-- soulignement (jauge) sous la valeur --')
for im,nom,zone in [(cap,'capture',(150,105,700,135)), (hud,'canon HUD',(30,120,700,150))]:
    p=im.load(); xs=[x for y in range(zone[1],zone[3]) for x in range(zone[0],zone[2]) if est_or(p[x,y])]
    if xs: print('   %-10s soulignement or x=%d..%d (%d px)' % (nom,min(xs),max(xs),max(xs)-min(xs)+1))
