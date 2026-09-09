#!/usr/bin/env python3
"""m22c - FILET SEPARATEUR, 3e version. m22 avait le SIGNE de la pente inverse : le bord gauche
mesure x = a*y avec a=+0,0350 (m14) => une HORIZONTALE de la carte monte quand x croit,
soit dy/dx = -0,0350. Les deux jets precedents sondaient donc a cote et leur controle positif a
correctement echoue (18,3% puis 23,6%).
Controle positif : le filet doit couvrir > 90% de sa propre etendue une fois la pente corrigee.
Controle negatif : la meme sonde 40 px plus bas (creme nue) doit rendre < 10%.
"""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")
PENTE=-0.0350
def sonde(im,x0,x1,y_ref,x_ref,label,tol=3.0):
    px=im.load(); n=0
    for x in range(x0,x1):
        y=int(round(y_ref+(x-x_ref)*PENTE))
        v=min(L(px[x,yy]) for yy in range(y-1,y+2))
        vois=statistics.median([L(px[x,y-8]),L(px[x,y-7]),L(px[x,y+7]),L(px[x,y+8])])
        if v<vois-tol: n+=1
    return n/(x1-x0)*100
best=max(((y,sonde(ref,145,675,y,400,'')) for y in range(1300,1330)),key=lambda t:t[1])
print(f"[REF] filet : meilleure ligne y={best[0]} (a x=400), pente {PENTE} -> couverture {best[1]:.1f}% sur x=145..675 (530 px)")
neg=sonde(ref,145,675,best[0]+40,400,'')
print(f"[REF] CONTROLE NEGATIF creme nue 40 px plus bas : {neg:.1f}%")
print(f"  CONTROLE POSITIF > 90% : {best[1]:.1f}% -> {'OK' if best[1]>90 else 'ECHEC'}")
print(f"  CONTROLE NEGATIF < 10% : {neg:.1f}% -> {'OK' if neg<10 else 'ECHEC'}")
# couleur du filet
px=ref.load(); y0=best[0]
ech=[]
for x in range(200,600):
    y=int(round(y0+(x-400)*PENTE))
    ech.append(min([px[x,yy] for yy in range(y-1,y+2)],key=L))
med=(round(statistics.median(p[0] for p in ech)),round(statistics.median(p[1] for p in ech)),round(statistics.median(p[2] for p in ech)))
print(f"[REF] couleur du filet = {med}  (creme voisine = (219,206,171))")
# etendue
print(f"[REF] etendue du filet : x=145..675 soit {530/652*100:.0f}% de la largeur de la carte (652 px)")
print("\n[CAP] bande homologue (entre le titre et la rangee Portee), x=300..400, y=1545..1569 :")
pc=cap.load()
vals=[L(pc[x,y]) for y in range(1545,1570) for x in range(300,400)]
print(f"   luminance min={min(vals):.2f} max={max(vals):.2f} ecart-type={statistics.pstdev(vals):.2f}"
      f" -> {'AUCUN filet (aplat parfait)' if statistics.pstdev(vals)<0.5 else 'variation presente'}")
