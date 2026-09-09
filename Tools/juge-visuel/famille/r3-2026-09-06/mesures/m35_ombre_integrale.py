# m35 — integrale de l'ombre portee bornee IDENTIQUEMENT des deux cotes (d = 2,0 a 12,0 CSS sous le
# bord bas), pour que la boite pointillee suivante n'entre dans aucune des deux mesures.
# Controle positif : le creux est negatif des deux cotes. Controle negatif : a d = 18 la reference
# vaut -1,0 et le jeu 0,0 (donnee par m17) -> la borne 12,0 exclut bien tout objet voisin.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0; FR=2.0
def PX(v,o,f): return int(round(o+v*f))
def lum(p): return .2126*p[0]+.7152*p[1]+.0722*p[2]
def medlum(px,ox,oy,f,x0,x1,cssy):
    y=PX(cssy,oy,f); v=[lum(px[x,y]) for x in range(PX(x0,ox,f),PX(x1,ox,f))]
    v.sort(); return v[len(v)//2]
def bord_bas(px,ox,oy,f,y0,y1):
    best=None
    for i in range(int((y1-y0)/0.2)):
        cssy=y0+i*0.2; m=medlum(px,ox,oy,f,200,480,cssy)
        if best is None or m<best[1]: best=(cssy,m)
    return best[0]
def integrale(nom,px,ox,oy,f,base,y0,y1):
    b=bord_bas(px,ox,oy,f,y0,y1)
    s=0.0
    for i in range(41):
        d=2.0+i*0.25
        s+=(medlum(px,ox,oy,f,200,480,b+d)-base)*0.25
    print("  %-14s bord bas CSS y=%.2f   integrale d=2,0..12,0 : %+.1f"%(nom,b,s))
    return s
BR=lum((22,25,27)); BC=lum((22,22,28))
print("\nfond de feuille : reference L=%.2f  jeu L=%.2f"%(BR,BC))
R=[integrale("ref rang%d"%(i+1),r,0,0,FR,BR,a,b) for i,(a,b) in enumerate([(352,360),(552,560),(727,735)])]
C=[integrale("cap rang%d"%(i+1),c,CX0,CY0,FC,BC,a,b) for i,(a,b) in enumerate([(348,356),(549,557),(750,758)])]
print("  moyennes : reference %.1f   jeu %.1f   ratio %.2f"%(sum(R)/3,sum(C)/3,(sum(C)/3)/(sum(R)/3)))
