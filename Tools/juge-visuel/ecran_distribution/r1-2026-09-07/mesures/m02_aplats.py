#!/usr/bin/env python3
# m02 — mediane d'une fenetre (>=3 px de tout bord) pour les aplats nommes.
# Controle positif : la couleur du fond de l'entete de la REFERENCE doit valoir
#   #20180f = (32,24,15), valeur ECRITE dans la CSS (.lieg6 .entete{background:#20180f}).
# Controle negatif : la couleur du fond de la .lecture (#1a1108) doit en DIFFERER.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def med_win(im, x0,y0,x1,y1):
    px = im.load()
    R=[];G=[];B=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            r,g,b = px[x,y]; R.append(r);G.append(g);B.append(b)
    f=lambda v:sorted(v)[len(v)//2]
    return (f(R),f(G),f(B)), len(R)

def hexs(c): return "#%02x%02x%02x"%c

REF = Image.open(os.path.join(D,"reference-1080x2102.png")).convert('RGB')
CAP = Image.open(os.path.join(D,"capture-1080x2400.png")).convert('RGB')
print("OUVERT reference =", REF.size, " capture =", CAP.size)

print("\n--- CONTROLES ---")
c,_ = med_win(REF, 300,470, 800,560)   # entete, sous le titre, hors glyphes ? (large)
print("  entete ref (bande large)      :", c, hexs(c), " attendu CSS #20180f (32,24,15)")
c2,_ = med_win(REF, 60,1600, 1020,1660) # lecture bg bas
print("  lecture ref bg                :", c2, hexs(c2), " attendu CSS #1a1108 (26,17,8)")
print("  CONTROLE NEGATIF : les deux different ?", c != c2)

print("\n--- REFERENCE : aplats nommes ---")
for nom,(x0,y0,x1,y1),attendu in [
  ("entete fond (y 440-460)",       (60,440,1020,460),   "#20180f"),
  ("lecture fond (y 1640-1665)",    (60,1640,1020,1665), "#1a1108"),
  (".bas fond (y 1690-1720)",       (60,1690,1020,1720), "#141a21"),
  (".bas bord haut (y 1674-1679)",  (60,1674,1020,1679), "#2c3640"),
  ("planche haut-gauche",           (120,660,200,690),   "#8a6a42+degrade"),
  ("planche milieu",                (120,1000,220,1060), "#8a6a42+degrade"),
  ("planche bas-droite",            (860,1300,960,1330), "#8a6a42+degrade"),
  ("cadre-b bord gauche",           (24,900,38,1000),    "#4a3722"),
  ("fiche gauche fond",             (300,760,520,790),   "#efe6d4"),
  ("fiche droite fond",             (330,1290,600,1320), "#efe6d4"),
  ("geste interieur (y 1960-2020)", (200,1960,900,2020), "#241c11 (CSS)"),
  ("geste bord gauche",             (48,1980,54,2000),   "#5a4a2a"),
  ("geste bord haut",               (200,1938,900,1944), "#5a4a2a"),
]:
    c,n = med_win(REF,x0,y0,x1,y1)
    print(f"  {nom:32s} {str(c):16s} {hexs(c)}   n={n:6d}  CSS={attendu}")

print("\n--- CAPTURE : aplats nommes ---")
for nom,(x0,y0,x1,y1) in [
  ("fond de contenu (y 470-510)",   (60,470,1020,510)),
  ("fond sous lecture (y 1150-1200)",(60,1150,1020,1200)),
  ("fond bas (y 1790-1830)",        (60,1790,1020,1830)),
  ("planche haut-gauche",           (70,535,180,565)),
  ("planche milieu-gauche",         (70,710,180,760)),
  ("planche bas-droite",            (830,915,930,945)),
  ("planche bord gauche x=50..60",  (50,700,62,780)),
  ("fiche haute fond",              (400,600,700,640)),
  ("fiche basse fond",              (200,800,500,840)),
  ("rangee courrier 1 fond",        (200,1280,800,1330)),
  ("bouton ACHETER fond",           (200,1600,800,1650)),
  ("pave avatar",                   (60,1740,130,1790)),
  ("CTA interieur",                 (200,1940,900,2000)),
  ("CTA bord haut y=1906",          (200,1906,900,1912)),
]:
    c,n = med_win(CAP,x0,y0,x1,y1)
    print(f"  {nom:32s} {str(c):16s} {hexs(c)}   n={n:6d}")
