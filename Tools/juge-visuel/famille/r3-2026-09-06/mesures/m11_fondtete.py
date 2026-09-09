# m11 — fond de tete : profil HORIZONTAL a plusieurs y, et profil VERTICAL au centre.
# La CSS pose radial-gradient(75% 150% at 50% 0%, rgba(217,171,78,.06), transparent 62%) sur .tete
# (hauteur .tete = 115 CSS). Controle positif : au bas de la feuille (y CSS 600) les deux images
# doivent rendre leur fond plat (22,25,27)/(22,22,28) sur toute la largeur hors objets.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0; FR=2.0
def PX(v,o,f): return int(round(o+v*f))
def med(px,ox,oy,f,cssx,cssy,w=6,h=4):
    v=[[],[],[]]
    for y in range(PX(cssy-h/2.,oy,f),PX(cssy+h/2.,oy,f)):
        for x in range(PX(cssx-w/2.,ox,f),PX(cssx+w/2.,ox,f)):
            p=px[x,y]
            for i in range(3): v[i].append(p[i])
    return tuple(sorted(k)[len(k)//2] for k in v)

print("\n-- profil HORIZONTAL a CSS y=8 (au-dessus du titre) --")
for cssx in [8,40,80,120,160,200,240,280,320,360,400,440,480,520,552]:
    print("  x=%-4d ref %s  cap %s"%(cssx,med(r,0,0,FR,cssx,8),med(c,CX0,CY0,FC,cssx,8)))
print("\n-- profil VERTICAL au centre (CSS x=400, hors titre qui s'arrete a 307) --")
for cssy in [3,8,15,25,35,45,55,65,75,85,95,105,112,120,130]:
    print("  y=%-4d ref %s  cap %s"%(cssy,med(r,0,0,FR,400,cssy),med(c,CX0,CY0,FC,400,cssy)))
print("\n-- controle positif : fond plat loin de la tete (CSS y=600) --")
for cssx in [8,120,280,440,552]:
    print("  x=%-4d ref %s  cap %s"%(cssx,med(r,0,0,FR,cssx,600),med(c,CX0,CY0,FC,cssx,600)))
