# -*- coding: utf-8 -*-
"""Etendue des boites de la REFERENCE par appariement de COULEUR de bord (le fond du bord de .tel
polluait la mesure precedente : .tel porte lui-meme un liseré #3a4356).
ardoise = #2a3648 (42,54,72) +-26 ; or = #b08d3e (176,141,62) +-30 ; on borne x a [24,1056] (dedans du cerne).
CONTROLE POSITIF : le bord bas de l'enseigne (or 2px) doit rendre une plage >= 250 CSS.
CONTROLE NEGATIF : la meme recherche 'or' sur une ligne de fond (y=760) doit rendre une plage vide."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
S=3.6
ref=Image.open(os.path.join(R,"reference-1080x2102.png")).convert("RGB"); px=ref.load()
print("image :", ref.size)
def pl(y, cible, tol, x0=20,x1=1060):
    xs=[x for x in range(x0,x1) if max(abs(px[x,y][i]-cible[i]) for i in range(3))<=tol]
    if not xs: return None
    return xs[0],xs[-1],len(xs)
ARD=(42,54,72); OR=(176,141,62)
for nom,y,c,t in [("cerne haut (or)",453,OR,40),("cerne bas (or)",2077,OR,40),
                  ("enseigne haut (ardoise)",482,ARD,30),("enseigne bas (or 2px)",643,OR,30),
                  ("fen1 haut (ardoise)",669,ARD,30),("fen1 bas (ardoise)",757,ARD,30),
                  ("elast haut (ardoise)",819,ARD,30),("elast bas (ardoise)",1865,ARD,30),
                  ("cta6 haut (or)",1903,OR,40),("cta6 bas (or)",1994,OR,40),
                  ("CTRL NEG or sur fond",760,OR,30)]:
    p=pl(y,c,t)
    if p is None: print("  %-24s y=%4d : AUCUN" % (nom,y))
    else:
        a,b,n=p
        print("  %-24s y=%4d : x=%4d..%4d  l=%4d px = %6.1f CSS = %5.1f%% ecran (n=%d px apparies)"
              % (nom,y,a,b,b-a+1,(b-a+1)/S,100.0*(b-a+1)/1080,n))
# les 3 fenetres de compteurs : segments ardoise sur la ligne du haut
y=669
xs=[x for x in range(20,1060) if max(abs(px[x,y][i]-ARD[i]) for i in range(3))<=30]
seg=[];cur=None
for x in xs:
    if cur is None: cur=[x,x]
    elif x-cur[1]<=2: cur[1]=x
    else: seg.append(tuple(cur)); cur=[x,x]
if cur: seg.append(tuple(cur))
print("  compteurs (3 fenetres) segments ardoise y=669 :", [(a,b,b-a+1,"%.1f CSS"%((b-a+1)/S)) for a,b in seg])
