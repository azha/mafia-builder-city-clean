# -*- coding: utf-8 -*-
"""Couche globale de la ZONE DE CONTENU (chrome exclu) : palette quantifiee, luminance moyenne,
densite d'encre, temperature (R-B moyen).
CONTROLE POSITIF : la somme des parts de la palette doit valoir 100%.
CONTROLE NEGATIF : sur une bande uniforme, la 1re couleur doit couvrir >99%."""
from PIL import Image
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def analyse(path,y0,y1,nom):
    im=Image.open(path).convert("RGB"); W,H=im.size
    print("OUVERT %s taille=%dx%d -> zone %s y=%d..%d"%(path,W,H,nom,y0,y1))
    z=im.crop((0,y0,W,y1+1))
    q=z.quantize(colors=8,method=Image.MEDIANCUT).convert("RGB")
    cols=q.getcolors(1000); cols.sort(reverse=True)
    tot=sum(n for n,_ in cols)
    print("  palette (8 classes) :")
    for n,cc in cols[:6]:
        print("    #%02x%02x%02x  %5.1f%%  L=%5.1f"%(cc[0],cc[1],cc[2],100*n/tot,lum(cc)))
    print("    somme des 8 = %.1f%%"%(100*sum(n for n,_ in cols)/tot))
    px=z.load(); w,h=z.size
    tl=0;tt=0;tr=0
    for y in range(0,h,2):
        for x in range(0,w,2):
            p=px[x,y]; tl+=lum(p); tr+=(p[0]-p[2]); tt+=1
    print("  luminance moyenne = %.1f/255 | temperature moyenne (R-B) = %+.2f"%(tl/tt,tr/tt))
    # densite d'encre : par rapport a la couleur la plus frequente
    fondc=cols[0][1]
    d=0
    for y in range(0,h,2):
        for x in range(0,w,2):
            p=px[x,y]
            if max(abs(p[i]-fondc[i]) for i in range(3))>30: d+=1
    print("  densite d'encre (ecart >30/255 au fond dominant #%02x%02x%02x) = %.1f%%"%(fondc[0],fondc[1],fondc[2],100*d/tt))
    print()
analyse("../reference-1080x2102.png",439,2101,"panneau .appr6")
analyse("../capture-1080x2400.png",143,2179,"entre bandeau et dock")
print("CONTROLE NEGATIF (bande uniforme, ref y1400..1450) :")
analyse("../reference-1080x2102.png",1400,1450,"bande nue")
