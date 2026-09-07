#!/usr/bin/env python3
# m04 — les etiquettes punaisees (.fiche) : bbox de l'ENCRE claire, inclinaison
#       (pente du bord haut), ombre portee ; et la ficelle (.fil) + la punaise.
# Controle positif : la HAUTEUR de la fiche haute doit valoir ~33,8 CSS des DEUX
#       cotes (valeur derivee de la CSS : 6+7 padding + 10,35 + 3 + 7,44).
# Controle negatif : la pente du bord haut doit DIFFERER entre .fiche.gauche
#       (rotate -2,4deg attendu) et une bande horizontale quelconque (pente 0).
from PIL import Image
import os, math
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = Image.open(os.path.join(D,"reference-1080x2102.png")).convert('RGB')
CAP = Image.open(os.path.join(D,"capture-1080x2400.png")).convert('RGB')
print("OUVERT reference =", REF.size, " capture =", CAP.size)

def clair(c, seuil=180):   # papier : tres clair sur tous les canaux
    return c[0]>=seuil and c[1]>=seuil-15 and c[2]>=seuil-45

def bbox_clair(im, x0,y0,x1,y1):
    px=im.load(); xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if clair(px[x,y]): xs.append(x);ys.append(y)
    if not xs: return None
    return (min(xs),min(ys),max(xs),max(ys)), len(xs)

def bord_haut(im, x0,x1, ymin,ymax):
    """pour chaque colonne, premier y ou le papier commence ; renvoie (x,y)"""
    px=im.load(); pts=[]
    for x in range(x0,x1,4):
        for y in range(ymin,ymax):
            if clair(px[x,y]): pts.append((x,y)); break
    return pts

def pente(pts):
    if len(pts)<8: return None
    n=len(pts); sx=sum(p[0] for p in pts); sy=sum(p[1] for p in pts)
    sxx=sum(p[0]*p[0] for p in pts); sxy=sum(p[0]*p[1] for p in pts)
    d=n*sxx-sx*sx
    if d==0: return None
    a=(n*sxy-sx*sy)/d
    return a, math.degrees(math.atan(a))

print("\n--- REFERENCE : fiche GAUCHE (attendu rotate(-2.4deg)) ---")
bb,n = bbox_clair(REF, 30,640, 900,830)
print("  bbox encre papier :", bb, " n_px=",n, " h=",bb[3]-bb[1]+1, f"px = {(bb[3]-bb[1]+1)/3.6:.1f} CSS", " w=",bb[2]-bb[0]+1)
pts = bord_haut(REF, bb[0]+20, bb[2]-20, 620, 830)
a,deg = pente(pts); print(f"  pente du bord haut = {a:+.5f} px/px  => {deg:+.2f} deg   (CSS: -2,40 deg)")
print("  echantillon (x,y) :", pts[:4], "...", pts[-4:])

print("\n--- REFERENCE : fiche DROITE (attendu rotate(+1.8deg)) ---")
bb2,n2 = bbox_clair(REF, 180,1190, 1060,1360)
print("  bbox encre papier :", bb2, " h=",bb2[3]-bb2[1]+1, f"px = {(bb2[3]-bb2[1]+1)/3.6:.1f} CSS", " w=",bb2[2]-bb2[0]+1)
pts2 = bord_haut(REF, bb2[0]+20, bb2[2]-20, 1180, 1360)
a2,deg2 = pente(pts2); print(f"  pente du bord haut = {a2:+.5f} px/px  => {deg2:+.2f} deg   (CSS: +1,80 deg)")

print("\n--- CAPTURE : fiche HAUTE ---")
bb3,n3 = bbox_clair(CAP, 60,560, 1020,720)
print("  bbox encre papier :", bb3, " h=",bb3[3]-bb3[1]+1, f"px = {(bb3[3]-bb3[1]+1)/3.6:.1f} CSS", " w=",bb3[2]-bb3[0]+1)
pts3 = bord_haut(CAP, bb3[0]+20, bb3[2]-20, 550, 720)
a3,deg3 = pente(pts3); print(f"  pente du bord haut = {a3:+.5f} px/px  => {deg3:+.2f} deg")

print("\n--- CAPTURE : fiche BASSE ---")
bb4,n4 = bbox_clair(CAP, 60,770, 1020,930)
print("  bbox encre papier :", bb4, " h=",bb4[3]-bb4[1]+1, f"px = {(bb4[3]-bb4[1]+1)/3.6:.1f} CSS", " w=",bb4[2]-bb4[0]+1)
pts4 = bord_haut(CAP, bb4[0]+20, bb4[2]-20, 760, 930)
a4,deg4 = pente(pts4); print(f"  pente du bord haut = {a4:+.5f} px/px  => {deg4:+.2f} deg")
print("  CONTROLE NEGATIF : pente REF gauche %+.2f deg VS pente CAP haute %+.2f deg -- l'instrument discrimine ? %s"
      % (deg, deg3, abs(deg-deg3)>1.0))

print("\n--- OMBRE PORTEE sous la fiche (.fiche box-shadow 2px 3px 7px #00000066) ---")
def profil_sous(im, x, y0, y1, nom):
    px=im.load()
    v=[(y, px[x,y]) for y in range(y0,y1)]
    print(f"  {nom} x={x} :", " ".join("%d:%s"%(y,"#%02x%02x%02x"%c) for y,c in v))
profil_sous(REF, 500, 806, 830, "REF sous fiche gauche")
profil_sous(CAP, 500, 694, 718, "CAP sous fiche haute ")

print("\n--- LA FICELLE (.fil) : couleur et epaisseur, traverse verticale ---")
def traverse(im, x, y0,y1, nom, fond):
    px=im.load(); hits=[]
    for y in range(y0,y1):
        c=px[x,y]
        d=abs(c[0]-fond[0])+abs(c[1]-fond[1])+abs(c[2]-fond[2])
        if d>60: hits.append((y,c))
    if hits:
        print(f"  {nom} x={x} : {len(hits)} px hors fond, y={hits[0][0]}..{hits[-1][0]}, pic={max(hits,key=lambda t:sum(t[1]))[1]} "
              f"= {'#%02x%02x%02x'%max(hits,key=lambda t:sum(t[1]))[1]}")
    else:
        print(f"  {nom} x={x} : AUCUN px hors fond")
traverse(REF, 700, 1040, 1140, "REF ficelle (CSS #c9bda0 w=2,4 CSS=8,6px)", (128,98,60))
traverse(REF, 600, 980, 1090,  "REF ficelle bis                          ", (128,98,60))
traverse(CAP, 500, 700,  790,  "CAP ficelle                              ", (122,83,49))
traverse(CAP, 700, 700,  790,  "CAP ficelle bis                          ", (122,83,49))

print("\n--- LA PUNAISE (ellipse rx=7 ry=6.4 CSS => 50x46 px, #c4413a) ---")
def punaise(im, x0,y0,x1,y1,nom):
    px=im.load(); xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            r,g,b=px[x,y]
            if r>120 and r-g>45 and r-b>45: xs.append(x);ys.append(y)
    if xs:
        print(f"  {nom} : bbox=({min(xs)},{min(ys)},{max(xs)},{max(ys)}) w={max(xs)-min(xs)+1} h={max(ys)-min(ys)+1} n={len(xs)}")
    else: print(f"  {nom} : ABSENTE")
punaise(REF, 220,780, 340,880, "REF punaise depart (rouge)")
punaise(REF, 800,1180, 940,1280,"REF punaise arrivee (bleue #3f6f8f -> hors filtre rouge, attendu ABSENTE)")
punaise(CAP,  40,540, 180,640, "CAP punaise depart (rouge)")
punaise(CAP, 760,880, 900,980, "CAP punaise arrivee")
