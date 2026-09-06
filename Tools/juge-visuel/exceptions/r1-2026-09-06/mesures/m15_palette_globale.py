# m15 — couche globale : palette dominante, luminance moyenne, densité d'encre, sur la ZONE DE CONTENU
# (réf : sous .barre = y216 ; cap : sous le débord du manomètre = y232, au-dessus du dock = y2155).
# Contrôle positif : la somme des pourcentages de palette vaut 100 (±0,1) des deux côtés.
from util import *
print("== m15 couche globale ==")
ref=ouvrir(REF); cap=ouvrir(CAP)
zones={"RÉF contenu (y216..2100)":(ref,(0,216,1080,2100)), "CAP contenu (y232..2155)":(cap,(0,232,1080,2155))}
for nom,(im,b) in zones.items():
    p=palette(im,b,8); s=sum(x[0] for x in p)
    print(f"  {nom}  (contrôle : Σ={s:.1f} %)")
    for pct,rgb in p:
        print(f"     {pct:5.1f} %  rgb{rgb}  #{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}  L={lum(rgb):.4f}")
    # luminance moyenne + densité d'encre (part des px à > 8/255 du fond dominant)
    sub=im.crop(b); px=sub.load(); W,H=sub.size
    fond=max(sub.getcolors(1<<24))[1] if False else sorted(sub.getcolors(1<<24),reverse=True)[0][1]
    tot=0; enc=0; Ls=0
    for y in range(0,H,3):
        for x in range(0,W,3):
            c=px[x,y]; tot+=1; Ls+=(c[0]*299+c[1]*587+c[2]*114)/1000
            if abs(c[0]-fond[0])+abs(c[1]-fond[1])+abs(c[2]-fond[2])>24: enc+=1
    print(f"     fond dominant={fond}  luminance moyenne={Ls/tot:.1f}/255  densité d'encre={enc/tot*100:.1f} % (n={tot})")
