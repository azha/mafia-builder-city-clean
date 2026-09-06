# m17 — OMBRE PORTEE des rangs (0 4px 12px #000a) : creux de luminance sous le bord bas de la carte,
# mesure a partir de 2 CSS sous le bord (les ~1,5 premiers CSS sont le lisere interne bas, un autre
# dispositif). Ligne de base = fond de feuille de CHAQUE image. Controle positif : le creux doit etre
# NEGATIF des deux cotes ; controle negatif : le meme profil pris a 60 CSS sous la carte doit valoir 0.
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

# bas des cartes : trouve d'abord la ligne la plus SOMBRE dans la fenetre du bord bas
def bord_bas(px,ox,oy,f,x0,x1,y0,y1):
    best=None
    for cssy in [y0+i*0.2 for i in range(int((y1-y0)/0.2))]:
        m=medlum(px,ox,oy,f,x0,x1,cssy)
        if best is None or m<best[1]: best=(cssy,m)
    return best

BR=lum((22,25,27)); BC=lum((22,22,28))
print("\nfond de feuille : reference L=%.2f  jeu L=%.2f"%(BR,BC))
for nom,(ox,oy,f,px,base,cards) in {
  "REFERENCE":(0,0,FR,r,BR,[("rang1",352,360),("rang2",554,562),("rang3",729,737)]),
  "JEU":(CX0,CY0,FC,c,BC,[("rang1",348,356),("rang2",550,558),("rang3",751,759)]),
}.items():
    print("\n== %s =="%nom)
    for cn,ya,yb in cards:
        bb=bord_bas(px,ox,oy,f,200,480,ya,yb)
        print("  %s : bord bas (ligne la plus sombre) a CSS y=%.2f, L=%.2f"%(cn,bb[0],bb[1]))
        prof=[]
        for d in [i*0.5 for i in range(0,40)]:
            prof.append((d,medlum(px,ox,oy,f,200,480,bb[0]+d)-base))
        s=sum(v for d,v in prof if d>=2.0)
        print("     profil (d CSS sous le bord, ecart au fond) :", " ".join("%.1f:%+.1f"%(d,v) for d,v in prof if d<=12))
        print("     integrale a partir de d=2,0 : %+.1f   |  controle negatif d=18 : %+.1f"%(s, medlum(px,ox,oy,f,200,480,bb[0]+18)-base))
