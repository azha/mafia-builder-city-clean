# m5 — boites des cartes par MEDIANE de ligne (robuste au texte). Un y appartient a une carte si la
# mediane de la bande x [card] s'ecarte du fond de feuille de plus de 3/255 sur un canal.
# Controle positif : largeur CSS calculee du rang = 560-2*22,4-26,13 = 489,07 -> la reference doit
# la rendre a <=1 px. Controle negatif : la boite vide (.equipe .vide) est plus etroite (marge 48,53).
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0
FR=2.0
FONDC=(22,22,28); FONDR=(22,25,27)

def medline(px,y,x0,x1):
    v=[[],[],[]]
    for x in range(x0,x1+1):
        p=px[x,y]
        for i in range(3): v[i].append(p[i])
    return tuple(sorted(k)[len(k)//2] for k in v)

def segs_med(px,x0,x1,y0,y1,fond,s=3):
    marks=[]
    for y in range(y0,y1+1):
        m=medline(px,y,x0,x1)
        d=max(abs(m[i]-fond[i]) for i in range(3))
        marks.append(d>s)
    out=[];cur=None
    for i,b in enumerate(marks):
        if b and cur is None: cur=i
        if not b and cur is not None: out.append((cur+y0,i-1+y0)); cur=None
    if cur is not None: out.append((cur+y0,y1))
    return out

# bande x des rangs : CSS 48,53..537,6
def PX(cssx,orig,f): return int(round(orig+cssx*f))
print("\n== REFERENCE : rangs (bande CSS 60..520) ==")
for a,b in segs_med(r,PX(60,0,FR),PX(520,0,FR),0,1849,FONDR):
    print("  px %d..%d  CSS %.2f..%.2f  h=%.2f"%(a,b,a/FR,b/FR,(b-a+1)/FR))
print("\n== CAPTURE : rangs (bande CSS 60..520) ==")
for a,b in segs_med(c,PX(60,CX0,FC),PX(520,CX0,FC),232,2151,FONDC):
    print("  px %d..%d  CSS %.2f..%.2f  h=%.2f"%(a,b,(a-CY0)/FC,(b-CY0)/FC,(b-a+1)/FC))
