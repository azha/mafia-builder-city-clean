# -*- coding: utf-8 -*-
"""Medaillon : centre/rayon par la couleur de l'anneau, puis rayon INTERIEUR de l'arc en fonction de l'angle.
Controle POSITIF : sur le CANON, le rayon interieur de l'arc doit etre quasi CONSTANT (arc circulaire).
Controle NEGATIF : si l'instrument rend constant PARTOUT (canon ET capture) il ne discrimine pas -> le dire.
Aussi : collision du libelle ARGENT avec le medaillon (capture)."""
from PIL import Image
import math
def med(v):
    v=sorted(v); n=len(v); return v[n//2] if n%2 else (v[n//2-1]+v[n//2])//2
def proche(p,c,t): return all(abs(p[i]-c[i])<=t for i in range(3))

def anneau(path,zone,cible,tol,lab):
    im=Image.open(path).convert('RGB'); px=im.load()
    print("OUVERT %s %s"%(path,im.size))
    x0,y0,x1,y1=zone; xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if proche(px[x,y],cible,tol): xs.append(x);ys.append(y)
    if not xs: print("  %s: 0 pixel d'anneau -> instrument muet"%lab); return None
    cx=(min(xs)+max(xs))/2.0; cy=(min(ys)+max(ys))/2.0
    R=((max(xs)-min(xs))+(max(ys)-min(ys)))/4.0
    print("  %s anneau: n=%d  bbox x[%d..%d] y[%d..%d]  centre=(%.1f,%.1f)  R_ext=%.1f"%(lab,len(xs),min(xs),max(xs),min(ys),max(ys),cx,cy,R))
    return im,px,cx,cy,R

def profil_arc(px,cx,cy,R,lab,fondtol=26):
    """pour chaque angle (0 = haut, positif vers la droite), trouve le plus PETIT rayon
    ou la couleur cesse d'etre 'fond sombre du cadran' en venant de l'exterieur -> bord INTERIEUR du disque colore."""
    print("  %s  angle(deg) | rayon interieur du materiau non-fond (px) | couleur a ce rayon"%lab)
    res=[]
    for a in range(-70,71,10):
        th=math.radians(a)
        # fond de reference : au centre bas du cadran
        fond=(px[int(cx),int(cy+R*0.10)])
        rin=None; col=None
        for r in [R*k/100.0 for k in range(88,20,-1)]:
            x=int(round(cx+r*math.sin(th))); y=int(round(cy-r*math.cos(th)))
            p=px[x,y]
            if sum(abs(p[i]-fond[i]) for i in range(3))<=fondtol:
                break
            rin=r; col=p
        if rin is None: res.append((a,None,None)); print("     %+4d | (rien)"%a)
        else:
            res.append((a,rin,col)); print("     %+4d | %.1f (%.0f%% de R) | %s"%(a,rin,100*rin/R,col))
    vals=[r for a,r,c in res if r]
    if vals:
        print("  %s  rayon interieur : min=%.1f max=%.1f amplitude=%.1f px (%.0f%% de R)"%(lab,min(vals),max(vals),max(vals)-min(vals),100*(max(vals)-min(vals))/R))
    return res

print("=== CAPTURE : anneau braise ===")
r=anneau("capture-1080x2400.png",(380,0,700,240),(222,101,73),34,"CAP")
if r:
    imc,pc,cx,cy,R=r
    profil_arc(pc,cx,cy,R,"CAP")
print()
print("=== CANON : anneau laiton ===")
r2=anneau("hud-canon-1176.png",(440,10,760,300),(173,139,61),34,"HUD")
if r2:
    imh,ph,hx_,hy_,HR=r2
    profil_arc(ph,hx_,hy_,HR,"HUD")
print()
print("=== CAPTURE : ARGENT vs medaillon (collision) ===")
im=Image.open("capture-1080x2400.png").convert('RGB'); px=im.load()
# encre doree du montant : bande y 55..100, x 120..760
xs=[]
for y in range(52,102):
    for x in range(120,780):
        p=px[x,y]
        if p[0]>150 and p[1]>110 and p[2]<140 and p[0]-p[2]>50: xs.append((x,y,p))
print("  pixels dores du montant : n=%d   x de %d a %d"%(len(xs),min(a for a,b,c in xs),max(a for a,b,c in xs)))
core=[p for a,b,p in xs]
print("  couleur mediane de l'encre doree = (%d,%d,%d)"%(med([p[0] for p in core]),med([p[1] for p in core]),med([p[2] for p in core])))
if r:
    print("  bord GAUCHE du medaillon (anneau braise) x=%.1f ; extremite droite du montant x=%d"%(cx-R,max(a for a,b,c in xs)))
    print("  -> recouvrement = %.1f px"%(max(0.0,max(a for a,b,c in xs)-(cx-R))))
