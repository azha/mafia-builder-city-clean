#!/usr/bin/env python3
# m13 — ordre de lecture objective : pour chaque zone, "poids visuel" = aire x
#       contraste au fond local. Puis geometrie de la section EN TROP de la capture.
# Controle positif : sur la REFERENCE, le poids le plus lourd doit etre la PLANCHE
#       (49 % de l'aire, matiere claire sur ecran sombre) -- si l'instrument
#       designait le bandeau ou un texte, il mesurerait autre chose.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = Image.open(os.path.join(D,"reference-1080x2102.png")).convert('RGB')
CAP = Image.open(os.path.join(D,"capture-1080x2400.png")).convert('RGB')
print("OUVERT reference =", REF.size, " capture =", CAP.size)
def L(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]

def poids(im, zones, y0g, y1g, nom):
    px=im.load(); W,_=im.size
    # fond global = mediane de tout le contenu
    v=[]
    for y in range(y0g,y1g,3):
        for x in range(4,W-4,3): v.append(L(px[x,y]))
    fondg=sorted(v)[len(v)//2]
    print(f"  {nom} (L de fond mediane = {fondg:.1f}) :")
    tot=0; res=[]
    for lib,a,b in zones:
        s=0; n=0
        for y in range(a,b,2):
            for x in range(4,W-4,2):
                s+=abs(L(px[x,y])-fondg); n+=1
        res.append((lib,s,(b-a)))
        tot+=s
    for lib,s,h in sorted(res,key=lambda t:-t[1]):
        print(f"    {lib:30s} poids={100*s/tot:5.1f} %   hauteur={h:4d} px = {h/3.6:5.1f} CSS")

poids(REF, [("entete",434,604),("planche (liege)",604,1425),("lecture",1425,1673),
            ("bas : perso + geste",1673,2102)], 434,2102, "REFERENCE")
poids(CAP, [("titre + sous-titre",143,524),("planche (brun)",524,956),("lecture",956,1240),
            ("VOS COURRIERS (EN TROP)",1240,1690),("perso",1690,1890),
            ("CTA + legende",1890,2110)], 143,2170, "CAPTURE")

print("\n--- SECTION 'VOS COURRIERS' de la CAPTURE (aucune contrepartie dans les 5 cadres) ---")
px=CAP.load()
def boite(y):
    on=[x for x in range(40,1045) if abs(px[x,y][0]-13)+abs(px[x,y][1]-13)+abs(px[x,y][2]-13)>10]
    return (on[0],on[-1]) if on else None
for lib,y in [("titre de section",1225),("rangee 1",1300),("rangee 2",1410),
              ("rangee 3",1520),("bouton ACHETER",1620),("CTA",1970)]:
    b=boite(y)
    print(f"    {lib:20s} y={y} : x {b}  largeur={b[1]-b[0]+1} px = {(b[1]-b[0]+1)/3.6:.1f} CSS" if b else f"    {lib}: rien")
def haut_bas(y0,y1,x):
    ys=[y for y in range(y0,y1) if abs(px[x,y][0]-13)+abs(px[x,y][1]-13)+abs(px[x,y][2]-13)>10]
    return (ys[0],ys[-1]) if ys else None
for lib,a,b in [("rangee 1",1250,1360),("rangee 2",1360,1470),("rangee 3",1465,1575),
                ("bouton ACHETER",1575,1690),("CTA",1895,2050)]:
    hb=haut_bas(a,b,600)
    if hb: print(f"    {lib:20s} y {hb[0]}..{hb[1]}  h={hb[1]-hb[0]+1} px = {(hb[1]-hb[0]+1)/3.6:.1f} CSS")

print("\n--- COULEUR 'tient' (etat de la route) vs jeton CSS .l b.ok = #7fc99a ---")
def pic(im,x0,y0,x1,y1):
    p=im.load(); best=None
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=p[x,y]
            if best is None or L(c)>L(best): best=c
    return best
c=pic(CAP,760,1108,1030,1140)
print(f"    CAP 'tient'        = {c} #%02x%02x%02x"%c)
print(f"    CSS .l b.ok        = (127, 201, 154) #7fc99a")
print(f"    delta par canal    = ({c[0]-127:+d}, {c[1]-201:+d}, {c[2]-154:+d})")
import colorsys
h1=colorsys.rgb_to_hsv(*[v/255 for v in c]); h2=colorsys.rgb_to_hsv(127/255,201/255,154/255)
print(f"    teinte  jeu={h1[0]*360:5.1f} deg  maquette={h2[0]*360:5.1f} deg   ecart={abs(h1[0]-h2[0])*360:5.1f} deg")
print(f"    saturation jeu={h1[1]:.3f}  maquette={h2[1]:.3f}")

print("\n--- COULEUR du papier des fiches ---")
print("    REF .fiche = #efe6d4 (239,230,212)  |  CAP = #eae0c8 (234,224,200)  delta = (-5,-6,-12)")
print("    (#eae0c8 est un jeton de la maquette : couleur de l'AIGUILLE du manometre, hud-brennar)")
