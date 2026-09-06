# m27 — BORD des cartes de rang sur les 4 cotes : la CSS ne pose PAS de border-width sur .rang
# (border-color seule => 0 px) ; seuls les box-shadow inset existent (haut clair, bas sombre).
# On mesure donc, pour chaque cote, le pic de luminance et la teinte R-B juste a l'interieur du bord.
# Controle positif : le cote HAUT doit etre clair des deux cotes (inset rgba(255,255,255,.15)).
# Controle negatif : le cote BAS doit etre SOMBRE des deux cotes (inset rgba(0,0,0,.5)).
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

def bordH(nom,px,ox,oy,f,cssy,x0,x1):
    # pic de luminance sur 3 CSS autour de cssy, pour plusieurs x
    out=[]
    for cssx in [70,120,180,250,320,400,470,520]:
        x=PX(cssx,ox,f); best=None
        for y in range(PX(cssy-2,oy,f),PX(cssy+2,oy,f)+1):
            p=px[x,y]
            if best is None or lum(p)>lum(best): best=p
        out.append((cssx,best))
    print("  %-22s %s"%(nom," ".join("%d:(%d,%d,%d)"%(a,b[0],b[1],b[2]) for a,b in out)))
def bordV(nom,px,ox,oy,f,cssx,ys):
    out=[]
    for cssy in ys:
        y=PX(cssy,oy,f); best=None
        for x in range(PX(cssx-2,ox,f),PX(cssx+2,ox,f)+1):
            p=px[x,y]
            if best is None or lum(p)>lum(best): best=p
        out.append((cssy,best))
    print("  %-22s %s"%(nom," ".join("%d:(%d,%d,%d)"%(a,b[0],b[1],b[2]) for a,b in out)))

print("\n== cote HAUT des rangs (controle positif : clair) ==")
bordH("ref rang2 haut",r,0,0,FR,454.5,70,520)
bordH("cap rang2 haut",c,CX0,CY0,FC,451.3,70,520)
print("\n== cote BAS des rangs (controle negatif : sombre) ==")
bordH("ref rang2 bas",r,0,0,FR,553.5,70,520)
bordH("cap rang2 bas",c,CX0,CY0,FC,551.0,70,520)
print("\n== cote GAUCHE des rangs ==")
bordV("ref rang2 gauche",r,0,0,FR,49.0,[475,490,505,520,535])
bordV("cap rang2 gauche",c,CX0,CY0,FC,48.9,[472,487,502,517,532])
print("\n== cote DROIT des rangs ==")
bordV("ref rang2 droit",r,0,0,FR,537.0,[475,490,505,520,535])
bordV("cap rang2 droit",c,CX0,CY0,FC,537.4,[472,487,502,517,532])
print("\n== cote HAUT du DON-RANG, sur toute la largeur ==")
bordH("ref don haut",r,0,0,FR,135.5,40,530)
bordH("cap don haut",c,CX0,CY0,FC,134.0,40,530)
print("== cote BAS du DON-RANG ==")
bordH("ref don bas",r,0,0,FR,236.3,40,530)
bordH("cap don bas",c,CX0,CY0,FC,233.5,40,530)
