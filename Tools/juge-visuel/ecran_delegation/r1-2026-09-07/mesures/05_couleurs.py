#!/usr/bin/env python3
"""Couleurs d'aplat: mediane d'une fenetre 15x9 a >=3px de tout bord (mandat).
Chaque valeur est confrontee au jeton CSS lu dans ecrans-brennar-6.html (l.4913-4969).
Controle positif: le fond de .sv-tete (#1b2027) doit tomber a <=6/255 sur la REFERENCE.
Controle negatif: la meme sonde sur le fond de .sv-bas (#141a21) doit en DIFFERER de >6."""
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def med(im,x,y,w=15,h=9):
    px=im.load(); vs=[]
    for dy in range(-(h//2),h//2+1):
        for dx in range(-(w//2),w//2+1):
            vs.append(px[x+dx,y+dy])
    vs.sort(key=lambda p:0.2126*p[0]+0.7152*p[1]+0.0722*p[2])
    return vs[len(vs)//2]
def hx(c): return "#%02x%02x%02x"%c
def d(a,b): return max(abs(a[i]-b[i]) for i in range(3))
def H(s): return tuple(int(s[i:i+2],16) for i in (1,3,5))

ref=Image.open(D+"reference-1080x2102.png").convert("RGB")
cap=Image.open(D+"capture-1080x2400.png").convert("RGB")
print("REF",ref.size,"  CAP",cap.size)
# (nom, (xref,yref), (xcap,ycap), jeton CSS attendu ou None)
S=[("fond .sv-tete",              (300,560),(300,360),"#1b2027"),
   ("bordure bas .sv-tete",       (300,605),(300,396),"#333c46"),
   ("fond .serv6 haut de body",   (300,630),(300,420),None),
   ("fond .serv6 milieu",         (300,1500),(300,1500),None),
   ("fond .serv6 juste au-dessus sv-bas",(300,1760),(300,1840),None),
   ("jeton fond",                 (300,660),(300,450),"#241c11"),
   ("jeton bordure haute",        (300,644),(300,436),"#5a4a2a"),
   ("jeton rond (centre)",        (110,727),(105,497),"#d9ab4e"),
   ("plaque1 fond HAUT",          (700,862),(700,627),"#242c34"),
   ("plaque1 fond BAS",           (700,975),(700,735),"#1b222a"),
   ("plaque1 bordure haute",      (700,852),(700,617),"#38434e"),
   ("plaque1 'cro'",              (104,918),( 98,680),"#46515c"),
   ("fond .sv-bas",               (300,1810),(300,1880),"#141a21"),
   ("bordure haute .sv-bas(2px)", (300,1783),(300,1857),"#2c3640"),
   ("CTA fond",                   (400,1990),(400,2050),None),
   ("CTA bordure haute",          (400,1939),(400,1995),None),
   ]
print(f"{'partie':38s} {'REF':>18s} {'CAP':>18s} {'d(REF,CAP)':>11s}  {'CSS':>9s} d(REF,CSS)")
for nom,(xr,yr),(xc,yc),css in S:
    a=med(ref,xr,yr); b=med(cap,xc,yc)
    t=f"{d(a,H(css)):>3d}" if css else " - "
    print(f"{nom:38s} {hx(a):>8s}{str(a):>10s} {hx(b):>8s}{str(b):>10s} {d(a,b):>11d}  {css or '-':>9s} {t}")
print()
a=med(ref,300,560); print("CONTROLE POSITIF fond .sv-tete REF vs #1b2027 :", hx(a), "ecart", d(a,H("#1b2027")), "(<=6 attendu)")
b=med(ref,300,1810); print("CONTROLE NEGATIF fond .sv-bas  REF vs #1b2027 :", hx(b), "ecart", d(b,H("#1b2027")), "(>6 attendu)")
