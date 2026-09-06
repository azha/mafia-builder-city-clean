# r10-m31 : intensite de la ligne de balayage a 3 abscisses ou le FOND du .elast est propre des
#  deux cotes (gouttiere gauche, gouttiere carte/tuiles, gouttiere droite).
#  Mesure = (score teal sur la ligne) - (score teal 20 px au-dessus), meme colonne.
# Controle positif : hors ligne (20 px au-dessus ET 20 px en dessous) le delta doit etre ~0.
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452,(631,638),[(36,54),(490,512),(984,1002)]),
    "CAP":(D+"capture-1080x2400.png",18,18,(615,621),[(35,50),(490,512),(994,1008)])}
def sc(p): return (p[1]+p[2])/2.0-p[0]
for k,(p,x0,y0,(va,vb),BANDES) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    print(f"\n{k} taille={im.size}  ligne v={va}..{vb} ({vb-va+1} px)")
    for (ua,ub) in BANDES:
        n=(ub-ua)*(vb-va+1)
        L=sum(sc(px[x0+u,y0+v]) for u in range(ua,ub) for v in range(va,vb+1))/n
        H=sum(sc(px[x0+u,y0+v-20]) for u in range(ua,ub) for v in range(va,vb+1))/n
        B=sum(sc(px[x0+u,y0+v+20]) for u in range(ua,ub) for v in range(va,vb+1))/n
        print(f"   u {ua}..{ub} : ligne={L:6.1f}  au-dessus={H:6.1f}  en-dessous={B:6.1f}"
              f"   -> DELTA={L-(H+B)/2:6.1f}   (controle + : au-dessus - en-dessous = {H-B:+.1f})")
