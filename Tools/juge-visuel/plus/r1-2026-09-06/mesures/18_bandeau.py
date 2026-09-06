#!/usr/bin/env python3
"""Bandeau haut : la CAPTURE contre le canon du HUD (le dossier l'ordonne : le chrome ne se juge
PAS contre le cadre de serie 6). Canon = Tools/juge-visuel/ecran-principal/ecran-canon.png,
1176 px = 392 CSS (x3) ; capture 1080 px = 392 CSS-HUD (x2,755). Rapport canon/capture = 1176/1080 = 1,0889.
Grandeurs comparees en % de la LARGEUR, jamais en px bruts.
Controle positif : le libelle 'ARGENT' doit exister des DEUX cotes (sinon le repere est faux)."""
import os
from PIL import Image
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
K=Image.open('/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png').convert('RGB')
print(f"ouvre capture {C.size} / canon HUD {K.size}")
cp,kp=C.load(),K.load()
def Lu(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def bb(px,W,x0,x1,y0,y1,s=95):
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if Lu(px[x,y])>s]
    if not pts: return None
    return (min(q[0] for q in pts),min(q[1] for q in pts),max(q[0] for q in pts),max(q[1] for q in pts),len(pts))
print("\n[canon HUD 1176 px]  bandeau : zone ARGENT (x 0..340 = 0..28,9 %)")
print("   libelle ARGENT   :", bb(kp,1176,40,300,25,60))
print("   valeur monetaire :", bb(kp,1176,40,340,60,130))
print("   zone droite JOUR :", bb(kp,1176,800,1160,25,60), " / heure :", bb(kp,1176,900,1160,60,130))
print("\n[capture 1080 px]    bandeau : memes zones ramenees a l'echelle (x1080/1176 = 0,9184)")
print("   libelle ARGENT   :", bb(cp,1080,36,276,20,55))
print("   valeur monetaire :", bb(cp,1080,36,312,55,120))
print("   zone droite JOUR :", bb(cp,1080,735,1065,20,55), " / heure :", bb(cp,1080,827,1065,55,120))
print("\n   CONTROLE POSITIF : 'ARGENT' trouve des deux cotes ->",
      bool(bb(kp,1176,40,300,25,60)) and bool(bb(cp,1080,36,276,20,55)))
print("\n[largeur d'encre de la valeur, en % de la largeur d'ecran]")
k=bb(kp,1176,40,340,60,130); c=bb(cp,1080,36,312,55,120)
if k: print(f"   canon   : {100*(k[2]-k[0]+1)/1176:5.2f} %   (h encre {k[3]-k[1]+1} px)")
if c: print(f"   capture : {100*(c[2]-c[0]+1)/1080:5.2f} %   (h encre {c[3]-c[1]+1} px)")
