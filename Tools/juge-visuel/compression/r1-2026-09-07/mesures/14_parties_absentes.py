#!/usr/bin/env python3
# 14 — recensement des PARTIES : ce que l'homologue porte, ce que la capture porte.
#   On mesure la bbox de chaque partie de l'homologue (en CSS) puis, dans la bande homologue
#   de la capture (meme position relative dans le rect libre), on compte l'encre.
#   CONTROLE POSITIF : le titre / la ligne de lecture, qui EXISTENT des deux cotes, doivent
#      rendre de l'encre des deux cotes -> la sonde n'est pas aveugle.
#   CONTROLE NEGATIF : une bande de vide pur de l'homologue doit rendre ~0 des deux cotes.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def bbox(f,x0,x1,y0,y1,fond,fac,nom,seuil=25,bord=0):
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size; p=im.load()
    xs=[];ys=[]
    for y in range(y0,y1+1):
        for x in range(max(x0,bord),min(x1,W-bord)):
            if abs(lum(p[x,y])-fond)>seuil: xs.append(x); ys.append(y); break
    if not ys: print(f"    {nom:46s} : AUCUNE encre"); return None
    xs=[x for x in range(max(x0,bord),min(x1,W-bord)) if any(abs(lum(p[x,y])-fond)>seuil for y in range(y0,y1+1))]
    print(f"    {nom:46s} bbox=({xs[0]},{ys[0]})-({xs[-1]},{ys[-1]})  {xs[-1]-xs[0]+1}x{ys[-1]-ys[0]+1} px = {(xs[-1]-xs[0]+1)/fac:.0f}x{(ys[-1]-ys[0]+1)/fac:.0f} CSS")
    return (xs[0],ys[0],xs[-1],ys[-1])

print("=== v4-29, homologue serie 4 « au calme » (900x1752, x3,0 ; cadre = 16 px) ===")
print("  OUVERT etats/v4-29.png ->", Image.open(os.path.join(D,'etats/v4-29.png')).size)
bbox('etats/v4-29.png', 100,800, 200,600, 27.0,3.0,'.instrument (manometre TENSION) [CSS declare 196x118]',seuil=45,bord=16)
bbox('etats/v4-29.png',  16,884, 605,675, 27.0,3.0,'.jetons-lib.lecture (CONTROLE + : existe des 2 cotes)',seuil=30,bord=16)
bbox('etats/v4-29.png',  16,884, 690,1045,27.0,3.0,'.notes > .plaque (kicker + titre + sous-plaque)',seuil=30,bord=16)
print("=== canon serie 2 « aucune semaine » (900x1752, x3,0) ===")
print("  OUVERT etats/ecran-canon-vide.png ->", Image.open(os.path.join(D,'etats/ecran-canon-vide.png')).size)
bbox('etats/ecran-canon-vide.png',16,884,  50,110,11.0,3.0,'titre "LA COMPRESSION" (CONTROLE +)',bord=16)
bbox('etats/ecran-canon-vide.png',16,884, 118,205,11.0,3.0,'sur-ligne d etat (JOUR / TENSION / SEMAINE)',bord=16)
bbox('etats/ecran-canon-vide.png',16,884, 215,240,11.0,3.0,'filet or sous l en-tete',seuil=10,bord=16)
bbox('etats/ecran-canon-vide.png',16,884, 260,725,11.0,3.0,'plaque (kicker+titre+2 jetons+corps)',bord=16)
bbox('etats/ecran-canon-vide.png',16,884, 480,560,11.0,3.0,'  -> les 2 jetons TENSION.CALME / SEMAINE.AUCUNE',bord=16)
bbox('etats/ecran-canon-vide.png',16,884,1170,1300,11.0,3.0,'boite d etat vide, pointilles',seuil=12,bord=16)
bbox('etats/ecran-canon-vide.png',16,884,1400,1500,11.0,3.0,'CONTROLE - : bande de vide pur (doit etre AUCUNE encre)')
print("=== CAPTURE (1080x2400, x3,6) — la MEME question, bande par bande ===")
print("  OUVERT capture-1080x2400.png ->", Image.open(os.path.join(D,'capture-1080x2400.png')).size)
bbox('capture-1080x2400.png', 0,1080, 205,240,13.0,3.6,'losange (EN TROP vs serie 4 ; pas de filet or)')
bbox('capture-1080x2400.png', 0,1080, 260,310,13.0,3.6,'titre "LA SEMAINE" (CONTROLE +)')
bbox('capture-1080x2400.png', 0,1080, 340,380,13.0,3.6,'sous-titre "Calm . None"')
bbox('capture-1080x2400.png', 0,1080, 465,515,13.0,3.6,'ligne de lecture (CONTROLE +)')
for a,b,n in [(520,900,'bande ou vivrait le manometre / la plaque'),(900,1400,'bande centrale'),(1400,2170,'bande basse (ou vivrait la boite d etat vide)')]:
    bbox('capture-1080x2400.png',0,1080,a,b,13.0,3.6,f'{n} (y {a}..{b})')
