# -*- coding: utf-8 -*-
"""12 — LE REFLET, profil horizontal et intensité.
La maquette : `linear-gradient(90deg, transparent, cyan, transparent)` sur toute la largeur de
.elast, opacité .45 sur le plateau de l'animation. On mesure, colonne par colonne, l'écart de
luminance entre la ligne du reflet et la même colonne 8 px CSS plus bas (même fond), puis on en
déduit l'alpha effectif : a = (G_bande - G_fond) / (212 - G_fond), 212 = canal vert du cyan.
Contrôle positif : au CENTRE la maquette doit donner a ~= 0,45 (valeur écrite dans la CSS).
Contrôle négatif : aux DEUX extrémités la maquette doit donner a ~= 0 (le dégradé y est
transparent) ; une sonde qui rendrait le même alpha partout ne verrait pas le dégradé."""
from PIL import Image
R=Image.open('/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r3-2026-08-31/reference/m-120.png').convert('RGB')
C=Image.open('/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png').convert('RGB')
print('m-120.png',R.size,'| screen_b3_reputation_1080x1920.png',C.size)
for nom,im,yb,ex0,ex1,sc,dy in (('REF',R,907,42,858,3.0,30),('CAP',C,636,46,1034,3.6,36)):
    px=im.load(); print('\n %s : ligne du reflet y=%d ; .elast x=%d..%d'%(nom,yb,ex0,ex1))
    out=[]
    for k in range(21):
        x=ex0+int((ex1-ex0)*k/20)
        x=min(max(x,ex0),ex1-1)
        b=px[x,yb]; f=px[x,yb+dy]
        a=(b[1]-f[1])/(212-f[1]) if f[1]<200 else 0
        out.append((round(100*k/20), round(a,3)))
    print('   alpha effectif (x en %% de .elast) :')
    for i in range(0,21,2): print('     %3d%% -> %.3f'%out[i])
