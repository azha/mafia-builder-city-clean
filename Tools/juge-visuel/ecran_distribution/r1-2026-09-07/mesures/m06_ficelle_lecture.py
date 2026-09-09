#!/usr/bin/env python3
# m06 — (a) la ficelle dans la bande LIBRE entre les deux fiches ; (b) les trois
#       lignes de LECTURE : bandes, separateurs pointilles, couleurs.
# Controle positif (a) : sur la REFERENCE le pic doit valoir #c9bda0 (valeur CSS du cadre #54).
# Controle positif (b) : sur la REFERENCE, entre deux lignes de .lecture, on doit
#       trouver un liseré POINTILLE #3d3024 (CSS .l+.l{border-top:1px dotted #3d3024}).
from PIL import Image
import os, math
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = Image.open(os.path.join(D,"reference-1080x2102.png")).convert('RGB')
CAP = Image.open(os.path.join(D,"capture-1080x2400.png")).convert('RGB')
print("OUVERT reference =", REF.size, " capture =", CAP.size)

print("\n--- (a) FICELLE : traverses verticales dans la bande libre ---")
def trav(im, x, y0,y1, fond, nom):
    px=im.load(); ys=[]
    for y in range(y0,y1):
        c=px[x,y]
        if abs(c[0]-fond[0])+abs(c[1]-fond[1])+abs(c[2]-fond[2])>70: ys.append(y)
    if not ys: print(f"  {nom} x={x:4d} : rien dans y {y0}..{y1}"); return None
    seg=[[ys[0]]]
    for y in ys[1:]:
        if y-seg[-1][-1]<=1: seg[-1].append(y)
        else: seg.append([y])
    segs=[(s[0],s[-1],len(s)) for s in seg]
    pic=max((px[x,y] for y in ys), key=sum)
    print(f"  {nom} x={x:4d} : {len(segs)} segment(s) {segs}  pic={pic} #%02x%02x%02x"%pic)
    return segs
# REFERENCE : bande libre entre fiche gauche (fin 829) et fiche droite (debut 1190)
for x in (350, 500, 650, 800):
    trav(REF, x, 840, 1180, (130,100,62), "REF")
# CAPTURE : bande libre entre fiche haute (fin 697) et fiche basse (debut 783)
for x in (200, 400, 600, 800, 950):
    trav(CAP, x, 700, 780, (122,83,49), "CAP")

print("\n--- (a2) FICELLE : est-elle DROITE ou COURBE ? (fleche de l'arc) ---")
def centre_fil(im, x, y0,y1, fond):
    px=im.load(); ys=[y for y in range(y0,y1)
        if abs(px[x,y][0]-fond[0])+abs(px[x,y][1]-fond[1])+abs(px[x,y][2]-fond[2])>70]
    return (ys[0]+ys[-1])/2 if ys else None
def fleche(im, xs, y0,y1, fond, nom):
    pts=[(x,centre_fil(im,x,y0,y1,fond)) for x in xs]
    pts=[p for p in pts if p[1] is not None]
    if len(pts)<3: print(f"  {nom} : trop peu de points"); return
    (x0,ya),(x1,yb)=pts[0],pts[-1]
    m=(yb-ya)/(x1-x0)
    ecarts=[(x, y-(ya+m*(x-x0))) for x,y in pts]
    mx=max(ecarts,key=lambda t:abs(t[1]))
    print(f"  {nom} : de ({x0},{ya:.1f}) a ({x1},{yb:.1f}), pente={m:+.3f} ; ecart max a la corde = {mx[1]:+.1f} px en x={mx[0]}")
fleche(REF, range(340,830,20), 840,1180, (130,100,62), "REF ficelle (courbe Q attendue)")
fleche(CAP, range(150,980,20), 700, 782, (122,83,49), "CAP ficelle")

print("\n--- (b) LIGNES DE LECTURE : bandes et separateurs ---")
def scan_sep(im, y0,y1, x0,x1, nom, fond):
    """cherche des lignes horizontales dont la couleur mediane differe du fond"""
    px=im.load()
    print(f"  {nom} (fond attendu {fond}) :")
    for y in range(y0,y1):
        vals=[px[x,y] for x in range(x0,x1,3)]
        f=lambda i:sorted(v[i] for v in vals)[len(vals)//2]
        c=(f(0),f(1),f(2))
        d=abs(c[0]-fond[0])+abs(c[1]-fond[1])+abs(c[2]-fond[2])
        # combien de px de la ligne sont "allumes" par rapport au fond ?
        n=sum(1 for v in vals if abs(v[0]-fond[0])+abs(v[1]-fond[1])+abs(v[2]-fond[2])>18)
        if d>=6 or n>len(vals)*0.25:
            print(f"    y={y:4d} mediane={c} #%02x%02x%02x  d={d:3d}  px_allumes={n}/{len(vals)}"%c)
# REF : la .lecture va de 1428 a 1673 ; separateurs attendus vers 1428+~68 et +~136
scan_sep(REF, 1480, 1520, 60, 1020, "REF entre ligne 1 et 2", (26,17,8))
scan_sep(REF, 1560, 1600, 60, 1020, "REF entre ligne 2 et 3", (26,17,8))
# CAP : les trois lignes sont vers y 985..1010 / 1180 ; cherchons partout entre elles
scan_sep(CAP, 1030, 1075, 60, 1020, "CAP entre ligne 1 et 2", (13,13,13))
scan_sep(CAP, 1105, 1150, 60, 1020, "CAP entre ligne 2 et 3", (13,13,13))
