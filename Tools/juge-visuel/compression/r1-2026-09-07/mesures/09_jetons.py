#!/usr/bin/env python3
# 09 — a quel JETON chaque encre correspond-elle ? (table recopiee de chassis6.py, l.32-58)
#   Methode : encre = pixels du haut 25e centile de luminance dans la bande (le COEUR du glyphe,
#   pas la frange d'anti-crenelage) ; on prend la mediane par canal et on cherche le jeton le plus proche.
#   CONTROLE POSITIF : le titre de la CANON serie 2 doit tomber sur --or-vif / hudMoneyGold (#f2c96b),
#   valeur que je n'ai PAS choisie mais qui est la couleur declaree des titres de la maquette.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JETONS = {
 '--encre #0b1016':(11,16,22), 'surfaceBase #0d0f10':(13,15,16), '--panneau #111823':(17,24,35),
 'surfaceCard #16191b':(22,25,27), 'surfaceRow #232a2d':(35,42,45), '--lisere #2a3648':(42,54,72),
 'hudGaugeFaceOuter #0a0e16':(10,14,22), '--creme #eae0c8':(234,224,200), '--creme-2 #b9ad92':(185,173,146),
 'onSurfaceSecondary #8a979c':(138,151,156), 'onSurfaceDisabled #6b737d':(107,115,125),
 '--or #d9ab4e':(217,171,78), '--or-vif #f2c96b':(242,201,107), 'hudHairlineGold #b08d3e':(176,141,62),
 'accentGold #ffd23f':(255,210,63), '--cyan #7fd4d9':(127,212,217), '--braise #e0664a':(224,102,74),
 'accentDanger #ff5a4d':(255,90,77), '--vert #7db36a':(125,179,106), 'accentSuccess #43e0c0':(67,224,192),
}
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def coeur(f,x0,x1,y0,y1,nom):
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    pts=[px[x,y] for y in range(y0,y1) for x in range(x0,x1)]
    pts.sort(key=lum)
    n=len(pts); coeur=pts[int(n*0.90):]           # 10 % les plus clairs = le coeur du glyphe
    R=sorted(p[0] for p in coeur);G=sorted(p[1] for p in coeur);B=sorted(p[2] for p in coeur)
    m=len(R)//2; c=(R[m],G[m],B[m])
    best=min(JETONS.items(), key=lambda kv: max(abs(kv[1][i]-c[i]) for i in range(3)))
    d=max(abs(best[1][i]-c[i]) for i in range(3))
    print(f"    {nom:52s} coeur={c}  -> {best[0]:28s} (ecart max {d}/255){'  == DANS LA TOLERANCE 6/255' if d<=6 else ''}")
    return c

print("OUVERT (3 fichiers) :", [ (f, Image.open(os.path.join(D,f)).size) for f in ['capture-1080x2400.png','etats/ecran-canon-vide.png','etats/v4-29.png']])
print("=== CAPTURE ===")
coeur('capture-1080x2400.png',352,727,262,308,'titre "LA SEMAINE"')
coeur('capture-1080x2400.png',448,632,344,376,'sous-titre "Calm . None"')
coeur('capture-1080x2400.png',  0,1076,468,512,'ligne "Au calme - aucune semaine..."')
coeur('capture-1080x2400.png',528,552,212,234,'losange')
coeur('capture-1080x2400.png',400,700,1000,1100,'CONTROLE - le vide (doit tomber sur un jeton de FOND)')
print("=== CANON SERIE 2 'aucune semaine' (CONTROLE POSITIF sur le titre) ===")
coeur('etats/ecran-canon-vide.png',160,650, 60, 98,'titre "LA COMPRESSION"')
coeur('etats/ecran-canon-vide.png',160,740,125,158,'sur-ligne "JOUR 1 . TENSION CALME . AUCUNE SEMAINE"')
coeur('etats/ecran-canon-vide.png', 78,660,362,418,'titre de plaque "Rien ne presse - vos affaires respirent"')
coeur('etats/ecran-canon-vide.png', 78,810,575,690,'corps de plaque (italique)')
coeur('etats/ecran-canon-vide.png',140,760,1210,1255,'boite d etat vide "Aucune semaine ... en vue"')
coeur('etats/ecran-canon-vide.png',400,700,1450,1550,'CONTROLE - le vide')
print("=== v4-29 (homologue serie 4) ===")
coeur('etats/v4-29.png',170,730,612,668,'ligne de lecture "Calme - vos affaires respirent"')
coeur('etats/v4-29.png', 78,820,778,876,'titre de plaque "Rien ne presse - aucune semaine en vue"')
