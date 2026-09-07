#!/usr/bin/env python3
# m05 — reprise de m04 sur trois points ou la premiere fenetre etait mal posee :
#   (a) punaises : balayage de TOUT le panneau, pas d'une fenetre devinee ;
#   (b) ombre portee : profondeur et portee mesurees (d=1..30) ;
#   (c) inclinaison de la fiche BASSE de la capture, en partant SOUS la ficelle.
# Controle positif : sur la REFERENCE, le balayage doit trouver DEUX punaises
#   (une rouge #c4413a, une bleue #3f6f8f) ; s'il n'en trouve pas deux, l'instrument ment.
from PIL import Image
import os, math
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = Image.open(os.path.join(D,"reference-1080x2102.png")).convert('RGB')
CAP = Image.open(os.path.join(D,"capture-1080x2400.png")).convert('RGB')
print("OUVERT reference =", REF.size, " capture =", CAP.size)

def amas(im, x0,y0,x1,y1, test):
    px=im.load(); vus=set(); out=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if (x,y) in vus: continue
            if not test(px[x,y]): continue
            pile=[(x,y)]; vus.add((x,y)); pts=[]
            while pile:
                cx,cy=pile.pop(); pts.append((cx,cy))
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx,ny=cx+dx,cy+dy
                    if x0<=nx<x1 and y0<=ny<y1 and (nx,ny) not in vus and test(px[nx,ny]):
                        vus.add((nx,ny)); pile.append((nx,ny))
            if len(pts)>=40:
                xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
                out.append((len(pts),min(xs),min(ys),max(xs),max(ys)))
    return sorted(out, reverse=True)

rouge = lambda c: c[0]>110 and c[0]-c[1]>40 and c[0]-c[2]>40
bleu  = lambda c: c[2]>90 and c[2]-c[0]>25 and c[1]>c[0]

print("\n--- (a) PUNAISES : balayage du panneau entier ---")
print("  CONTROLE POSITIF sur la REFERENCE (panneau y 610..1420) :")
for n,ax,ay,bx,by in amas(REF, 10,610,1070,1420, rouge)[:3]:
    print(f"    ROUGE amas n={n:5d} bbox=({ax},{ay},{bx},{by}) w={bx-ax+1} h={by-ay+1} centre=({(ax+bx)//2},{(ay+by)//2})")
for n,ax,ay,bx,by in amas(REF, 10,610,1070,1420, bleu)[:3]:
    print(f"    BLEUE amas n={n:5d} bbox=({ax},{ay},{bx},{by}) w={bx-ax+1} h={by-ay+1} centre=({(ax+bx)//2},{(ay+by)//2})")
print("  CAPTURE (panneau y 524..956, x 58..1022) :")
r = amas(CAP, 58,524,1022,956, rouge); b = amas(CAP, 58,524,1022,956, bleu)
for n,ax,ay,bx,by in r[:3]:
    print(f"    ROUGE amas n={n:5d} bbox=({ax},{ay},{bx},{by}) w={bx-ax+1} h={by-ay+1} centre=({(ax+bx)//2},{(ay+by)//2})")
if not r: print("    ROUGE : AUCUN amas >= 40 px")
for n,ax,ay,bx,by in b[:3]:
    print(f"    BLEUE amas n={n:5d} bbox=({ax},{ay},{bx},{by}) w={bx-ax+1} h={by-ay+1} centre=({(ax+bx)//2},{(ay+by)//2})")
if not b: print("    BLEUE : AUCUN amas >= 40 px  <== la punaise d'ARRIVEE")

print("\n--- (b) OMBRE PORTEE sous la fiche : exces de sombre a la distance d ---")
def ombre(im, y_bas, xs, fond_ref_y, nom):
    px=im.load()
    base=[]
    for x in xs:
        c=px[x,fond_ref_y]; base.append(0.2126*c[0]+0.7152*c[1]+0.0722*c[2])
    base=sorted(base)[len(base)//2]
    print(f"  {nom} (fond de reference a y={fond_ref_y} : L={base:.2f})")
    portee=0
    for d in list(range(1,13))+[15,18,22,26,30]:
        v=[]
        for x in xs:
            c=px[x,y_bas+d]; v.append(0.2126*c[0]+0.7152*c[1]+0.0722*c[2])
        m=sorted(v)[len(v)//2]
        exces=base-m
        if exces>0.5: portee=d
        print(f"    d={d:2d}  L={m:6.2f}  exces_sombre={exces:+6.2f}")
    print(f"    ==> PORTEE (dernier d ou exces>0,5) = {portee} px")
ombre(REF, 809, range(300,700,7), 900, "REF sous fiche gauche")
ombre(CAP, 697, range(300,700,7), 760, "CAP sous fiche haute ")

print("\n--- (c) inclinaison de la fiche BASSE de la CAPTURE, en partant y>=783 ---")
def clair(c,s=180): return c[0]>=s and c[1]>=s-15 and c[2]>=s-45
def bord_haut(im,x0,x1,ymin,ymax):
    px=im.load(); pts=[]
    for x in range(x0,x1,4):
        for y in range(ymin,ymax):
            if clair(px[x,y]): pts.append((x,y)); break
    return pts
def pente(pts):
    n=len(pts); sx=sum(p[0] for p in pts); sy=sum(p[1] for p in pts)
    sxx=sum(p[0]**2 for p in pts); sxy=sum(p[0]*p[1] for p in pts)
    a=(n*sxy-sx*sy)/(n*sxx-sx*sx); return a, math.degrees(math.atan(a))
pts=bord_haut(CAP,130,950,779,900); a,dg=pente(pts)
print(f"  pente = {a:+.5f} px/px => {dg:+.2f} deg   (ymin=779, sous la ficelle)")
print("  echantillon :", pts[:3],"...",pts[-3:])
pts=bord_haut(CAP,130,950,560,700); a2,dg2=pente(pts)
print(f"  fiche HAUTE : pente = {a2:+.5f} px/px => {dg2:+.2f} deg")

print("\n--- (d) LA FICELLE : epaisseur perpendiculaire ---")
def epaisseur(im, x, y0,y1, fond, nom):
    px=im.load(); ys=[]
    for y in range(y0,y1):
        c=px[x,y]
        if abs(c[0]-fond[0])+abs(c[1]-fond[1])+abs(c[2]-fond[2])>70: ys.append(y)
    if not ys: print(f"  {nom} x={x} : rien"); return
    # segment contigu le plus long
    seg=[[ys[0]]]
    for y in ys[1:]:
        if y-seg[-1][-1]<=2: seg[-1].append(y)
        else: seg.append([y])
    s=max(seg,key=len)
    pic=max(((px[x,y]) for y in s), key=sum)
    print(f"  {nom} x={x} : epaisseur verticale={len(s)} px (y {s[0]}..{s[-1]}), pic={pic} #%02x%02x%02x"%pic)
epaisseur(REF, 500, 900,1100, (130,100,62), "REF ficelle")
epaisseur(REF, 620,1000,1200, (128, 98,60), "REF ficelle")
epaisseur(CAP, 300, 560, 700, (122,83,49),  "CAP ficelle")
epaisseur(CAP, 600, 600, 780, (122,83,49),  "CAP ficelle")
