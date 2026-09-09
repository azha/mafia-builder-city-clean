# m33 — DEGRADE de panneau (--tx-panneau : linear-gradient(160deg, rgba(22,33,53,.58),
# rgba(9,14,24,.74))) sur le don-rang et sur un rang : echantillons a 5 points relatifs identiques.
# Controle positif : le PIED du degrade doit etre egal des deux cotes (mesure au tour precedent).
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0; FR=2.0
def PX(v,o,f): return int(round(o+v*f))
def med(px,ox,oy,f,x0,y0,x1,y1):
    v=[]
    for y in range(PX(y0,oy,f),PX(y1,oy,f)+1):
        for x in range(PX(x0,ox,f),PX(x1,ox,f)+1): v.append(px[x,y])
    return tuple(sorted(k[i] for k in v)[len(v)//2] for i in range(3))
print("\n== DON-RANG (ref haut=135,0 bas=237,0 ; cap haut=133,5 bas=234,0) ==")
for lab,(dy0,dy1) in [("t=0,05",(4,9)),("t=0,25",(24,29)),("t=0,50",(49,54)),("t=0,75",(74,79)),("t=0,95",(94,99))]:
    a=med(r,0,0,FR,300,135+dy0,430,135+dy1)
    b=med(c,CX0,CY0,FC,300,133.5+dy0,430,133.5+dy1)
    print("  %s  ref %s  cap %s  delta (%+d,%+d,%+d)"%(lab,a,b,b[0]-a[0],b[1]-a[1],b[2]-a[2]))
print("\n== RANG 2 (ref haut=454,5 ; cap haut=451,3) ==")
for lab,(dy0,dy1) in [("t=0,05",(4,9)),("t=0,25",(24,29)),("t=0,50",(49,54)),("t=0,75",(74,79)),("t=0,95",(94,98))]:
    a=med(r,0,0,FR,300,454.5+dy0,430,454.5+dy1)
    b=med(c,CX0,CY0,FC,300,451.3+dy0,430,451.3+dy1)
    print("  %s  ref %s  cap %s  delta (%+d,%+d,%+d)"%(lab,a,b,b[0]-a[0],b[1]-a[1],b[2]-a[2]))
print("\n== gradient HORIZONTAL du rang 2 a mi-hauteur ==")
for cssx in [70,140,220,300,380,460,520]:
    a=med(r,0,0,FR,cssx-6,500,cssx+6,508)
    b=med(c,CX0,CY0,FC,cssx-6,497,cssx+6,505)
    print("  x=%-4d ref %s  cap %s  delta (%+d,%+d,%+d)"%(cssx,a,b,b[0]-a[0],b[1]-a[1],b[2]-a[2]))
