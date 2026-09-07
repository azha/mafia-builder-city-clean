#!/usr/bin/env python3
# 06 (v5) — la valeur ARGENT entre-t-elle SOUS le medaillon ?
#   Deux mesures INDEPENDANTES, aucune fenetre choisie a la main :
#   (A) groupes d'encre contigus sur la ligne du texte -> ou s'arrete la valeur, ou commence le medaillon ;
#   (B) le disque du medaillon ajuste sur deux cordes prises SOUS le filet (y>=150), la ou il est seul.
#   CONTROLE NEGATIF de la sonde de disque : a y=8 (au-dessus du disque) elle doit rendre VIDE.
#   CONTROLE POSITIF : la meme paire de mesures sur le canon HUD, ou la valeur est courte.
from PIL import Image
import os, math
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def groupes(px,W,ya,yb,seuil,fond,trou=14):
    cols=[x for x in range(W) if max(lum(px[x,y]) for y in range(ya,yb+1))-fond > seuil]
    out=[];cur=[cols[0]]
    for x in cols[1:]:
        if x-cur[-1]<=trou: cur.append(x)
        else: out.append((cur[0],cur[-1])); cur=[x]
    out.append((cur[0],cur[-1]))
    return out

def cercle(pts):
    (y1,x1a,x1b),(y2,x2a,x2b)=pts
    cx=((x1a+x1b)+(x2a+x2b))/4.0
    h1=(x1b-x1a)/2.0; h2=(x2b-x2a)/2.0
    cy=((y2*y2-y1*y1)-(h1*h1-h2*h2))/(2.0*(y2-y1))
    return cx,cy,math.sqrt(h1*h1+(y1-cy)**2)

def dossier(f, ya, yb, cordes, fond, yt, nom):
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size
    print(f"  OUVERT {f} -> {W}x{H}   [{nom}]")
    px=im.load()
    g=groupes(px,W,ya,yb,85,fond)
    print(f"  (A) groupes d'encre claire sur la ligne de la valeur (y {ya}-{yb}) :")
    for a,b in g: print(f"        x {a:4d}..{b:4d}  (largeur {b-a+1})")
    pts=[]
    for y in cordes:
        xs=[x for x in range(200,W-200) if abs(lum(px[x,y])-fond)>12]
        pts.append((y,xs[0],xs[-1]))
        print(f"  (B) corde du medaillon a y={y} : x={xs[0]}..{xs[-1]}")
    cx,cy,r=cercle(pts)
    dx=math.sqrt(max(r*r-(yt-cy)**2,0))
    print(f"  (B) cercle : centre=({cx:.1f},{cy:.1f}) r={r:.1f} -> bord gauche a y={yt} : x={cx-dx:.1f}")
    return g, cx-dx

print("=== CAPTURE 1080x2400 ===")
g,bg = dossier('capture-1080x2400.png', 55,105, [160,190], 13.0, 80, 'capture')
# le groupe de la valeur = celui qui precede immediatement le medaillon
avant=[t for t in g if t[0] < bg]
print(f"  >>> bord gauche du medaillon a la hauteur du texte : x={bg:.1f}")
print(f"  >>> dernier groupe d'encre commencant AVANT le medaillon : x {avant[-1][0]}..{avant[-1][1]}")
print(f"  >>> RECOUVREMENT = {avant[-1][1]-bg:+.1f} px   ({'COLLISION' if avant[-1][1]>bg else 'pas de collision'})")
print()
print("=== CONTROLE POSITIF : canon HUD 1176x2091 (valeur courte) ===")
g2,bg2 = dossier('hud-canon-1176.png', 60,125, [175,205], 25.0, 95, 'canon HUD')
avant2=[t for t in g2 if t[0] < bg2]
print(f"  >>> bord gauche du medaillon canon : x={bg2:.1f}")
print(f"  >>> dernier groupe avant : x {avant2[-1][0]}..{avant2[-1][1]}")
print(f"  >>> RECOUVREMENT CANON = {avant2[-1][1]-bg2:+.1f} px   ({'COLLISION' if avant2[-1][1]>bg2 else 'pas de collision'})")
