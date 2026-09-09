#!/usr/bin/env python3
"""(a) Layout interne du JETON par balayage d'une LIGNE entiere de la boite, classe par COULEUR
    (or vif #d9ab4e = rond/b ; gris chaud #9a8a6a = i) -> pas de fenetre qui puisse tronquer.
(b) Hauteurs de CAPITALE isolees (une seule lettre, sans accent ni descendante).
Controle positif (a): en REFERENCE le rond doit mesurer 16 CSS = 57,6 px de DIAMETRE dans les
    deux axes (cercle) -> largeur ~ hauteur a <=3 px.
Controle negatif (a): la meme sonde sur une ligne HORS du rond doit rendre une largeur nulle."""
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def runs_clairs(im,y,x0,x1,seuil):
    px=im.load(); out=[];cur=None
    for x in range(x0,x1):
        if lum(px[x,y])>=seuil:
            if cur is None: cur=[x,x]
            else: cur[1]=x
        else:
            if cur is not None: out.append(tuple(cur)); cur=None
    if cur: out.append(tuple(cur))
    return out
def encre_verticale(im,x0,x1,y0,y1,seuil):
    px=im.load(); ys=[y for y in range(y0,y1) for x in range(x0,x1) if lum(px[x,y])>=seuil]
    return (min(ys),max(ys)) if ys else None

ref=Image.open(D+"reference-1080x2102.png").convert("RGB")
cap=Image.open(D+"capture-1080x2400.png").convert("RGB")
print("REF",ref.size,"CAP",cap.size)

print("\n=== (a) JETON — runs clairs (lum>=90) sur la ligne mediane de la boite ===")
print("  REF boite y=643..814 -> ligne y=728 ; CAP boite y=435..561 -> ligne y=498")
for tag,im,y,bx in (("REF",ref,728,(56,1024)),("CAP",cap,498,(51,1029))):
    r=runs_clairs(im,y,bx[0],bx[1],90)
    print(f"   [{tag}] y={y} runs = {[(a,b,b-a+1) for a,b in r]}")
print("  -> le 1er run est le ROND ; diametre horizontal :")
for tag,im,y,bx in (("REF",ref,728,(56,1024)),("CAP",cap,498,(51,1029))):
    r=runs_clairs(im,y,bx[0],bx[1],90)
    a,b=r[0]; v=encre_verticale(im,a,b+1,y-90,y+90,90)
    print(f"   [{tag}] rond: x={a}..{b} (l={b-a+1})  y={v[0]}..{v[1]} (h={v[1]-v[0]+1})  ratio l/h={(b-a+1)/(v[1]-v[0]+1):.3f}")
print("  CONTROLE NEGATIF (ligne hors rond, y = bord haut de boite +2) :")
for tag,im,y,bx in (("REF",ref,646,(56,1024)),("CAP",cap,439,(51,1029))):
    print(f"   [{tag}] y={y} runs clairs = {runs_clairs(im,y,bx[0],bx[1],90)}")

print("\n=== (a') JETON — extremites de l'encre 'i' (gris chaud) et du 'b' (or) ===")
def zone(im,y0,y1,x0,x1,pred):
    px=im.load(); xs=[x for y in range(y0,y1) for x in range(x0,x1) if pred(px[x,y])]
    return (min(xs),max(xs)) if xs else None
oro=lambda p: p[0]>150 and p[1]>110 and p[2]<130 and p[0]-p[2]>60
gris=lambda p: 100<lum(p)<190 and abs(p[0]-p[2])<70
print("   REF b(or) x:",zone(ref,660,800,60,1020,oro),"  CAP b(or) x:",zone(cap,450,556,55,1025,oro))

print("\n=== (b) HAUTEURS DE CAPITALE (une lettre isolee, sans accent) ===")
# h3: le 'C' de 'Ce'  |  plaque1 q b: le 'L' de 'Les'  |  CTA: le 'E' de 'EN'  |  titron: le 'C'
C=[("h3 'C'",        ref,(51,90,470,530),  cap,(48,90,270,330), 120),
   ("plaque1 'L'",   ref,(154,180,880,918),cap,(149,175,644,682),120),
   ("CTA 'E'",       ref,(95,125,1970,2008),cap,(89,120,2026,2065),95),
   ]
for nom,ia,(xa0,xa1,ya0,ya1),ib,(xb0,xb1,yb0,yb1),s in C:
    va=encre_verticale(ia,xa0,xa1,ya0,ya1,s); vb=encre_verticale(ib,xb0,xb1,yb0,yb1,s)
    ha=va[1]-va[0]+1; hb=vb[1]-vb[0]+1
    print(f"   {nom:16s} REF y={va[0]}..{va[1]} cap={ha:3d}px   CAP y={vb[0]}..{vb[1]} cap={hb:3d}px   delta={hb-ha:+3d} ({100*(hb-ha)/ha:+.1f} %)")
v=encre_verticale(cap,47,80,1225,1265,95)
print(f"   titron 'C' (CAP seul) y={v[0]}..{v[1]} cap={v[1]-v[0]+1}px   (.sv-titron CSS 6,6px -> cap attendue ~17px)")
