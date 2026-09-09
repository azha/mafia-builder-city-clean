# -*- coding: utf-8 -*-
"""Bande RADIALE occupee par l'arc teal et l'arc chaud du manometre.
Un arc ANNULAIRE occupe une bande radiale ETROITE ; un secteur PLEIN occupe une bande LARGE.
Controle POSITIF : sur le CANON (arc connu annulaire) la bande doit etre etroite.
Controle NEGATIF : si les deux sortent identiques, l'instrument ne discrimine pas -> le dire.
Centre/rayon : anneau detecte en EXCLUANT le filet horizontal (bande y du filet passee en parametre)."""
from PIL import Image
import math
def med(v):
    v=sorted(v); n=len(v); return v[n//2] if n%2 else (v[n//2-1]+v[n//2])//2

def centre(path,zone,cible,tol,exclure_y,lab):
    im=Image.open(path).convert('RGB'); px=im.load()
    print("OUVERT %s %s"%(path,im.size))
    x0,y0,x1,y1=zone; xs=[];ys=[]
    for y in range(y0,y1):
        if exclure_y[0]<=y<=exclure_y[1]: continue
        for x in range(x0,x1):
            if all(abs(px[x,y][i]-cible[i])<=tol for i in range(3)): xs.append(x);ys.append(y)
    cx=(min(xs)+max(xs))/2.0; cy=(min(ys)+max(ys))/2.0
    R=((max(xs)-min(xs))+(max(ys)-min(ys)))/4.0
    print("  %s anneau n=%d bbox x[%d..%d] y[%d..%d] centre=(%.1f,%.1f) R=%.1f (zone=%s, y exclus=%s)"
          %(lab,len(xs),min(xs),max(xs),min(ys),max(ys),cx,cy,R,zone,exclure_y))
    return im,px,cx,cy,R

def bande(px,cx,cy,R,test,lab,nom):
    rs=[];angs=[]
    for k in range(20,96):
        r=R*k/100.0
        for a in range(-95,96,1):
            th=math.radians(a)
            x=int(round(cx+r*math.sin(th))); y=int(round(cy-r*math.cos(th)))
            if test(px[x,y]): rs.append(r/R); angs.append(a)
    if not rs:
        print("  %s %s : 0 pixel -> ABSENT sur cette sonde"%(lab,nom)); return
    rs.sort()
    p05=rs[int(.05*len(rs))]; p95=rs[int(.95*len(rs))]
    print("  %s %s : n=%d  r/R p05=%.2f p95=%.2f  LARGEUR de bande=%.2f  |  angles %d..%d deg"
          %(lab,nom,len(rs),p05,p95,p95-p05,min(angs),max(angs)))

teal=lambda p: p[1]>p[0]+18 and p[2]>p[0]+18 and p[1]>60
chaud=lambda p: p[0]>p[1]+28 and p[0]>p[2]+28 and p[0]>90

print("=== CANON (controle positif : arc annulaire connu) ===")
im,ph,hx,hy,HR=centre("hud-canon-1176.png",(440,10,780,320),(173,139,61),34,(9999,9999),"HUD")
bande(ph,hx,hy,HR,teal,"HUD","teal"); bande(ph,hx,hy,HR,chaud,"HUD","chaud")
print()
print("=== CAPTURE ===")
im,pc,cx,cy,R=centre("capture-1080x2400.png",(380,0,700,240),(222,101,73),34,(135,150),"CAP")
bande(pc,cx,cy,R,teal,"CAP","teal"); bande(pc,cx,cy,R,chaud,"CAP","chaud")
print()
print("=== AIGUILLE : demi-plan ou tombe la pointe (blanc creme sur cadran) ===")
def aiguille(px,cx,cy,R,lab):
    blanc=lambda p: p[0]>170 and p[1]>170 and p[2]>150 and max(p)-min(p)<60
    best=None
    for k in range(30,80):
        r=R*k/100.0
        for a in range(-95,96,1):
            th=math.radians(a)
            x=int(round(cx+r*math.sin(th))); y=int(round(cy-r*math.cos(th)))
            if blanc(px[x,y]):
                if best is None or r>best[0]: best=(r,a,px[x,y])
    if best: print("  %s pointe la plus lointaine : r=%.1f (%.0f%% R)  angle=%+d deg (0=haut, + = DROITE)  %s"%(lab,best[0],100*best[0]/R,best[1],best[2]))
    else: print("  %s : aiguille non trouvee"%lab)
aiguille(ph,hx,hy,HR,"HUD")
aiguille(pc,cx,cy,R,"CAP")
print()
print("=== CAPTURE : recouvrement montant / medaillon (recalcule avec le bon centre) ===")
xs=[]
for y in range(52,102):
    for x in range(120,780):
        p=pc[x,y]
        if p[0]>150 and p[1]>110 and p[2]<140 and p[0]-p[2]>50: xs.append(x)
print("  montant : x max = %d ; bord gauche du medaillon = %.1f ; recouvrement = %.1f px"%(max(xs),cx-R,max(0.0,max(xs)-(cx-R))))
