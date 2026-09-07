# m9 — couche globale : palette quantifiee, luminance moyenne, densite d'encre.
# Zone REFERENCE = le .cfl6 (y 434..2102) ; zone CAPTURE = le rect libre (y 144..2158).
# Controle positif : sur la REFERENCE la couleur dominante doit etre une brune (#241c14 / #1d1610 famille).
# Controle negatif : la meme sonde sur la seule serviette (.ordre) doit rendre une dominante CREME.
from PIL import Image
def palette(im,box,n=8):
    z=im.crop(box).convert('RGB')
    small=z.resize((z.width//4, z.height//4), Image.BILINEAR)
    q=small.quantize(colors=n, method=Image.MEDIANCUT).convert('RGB')
    tot=q.width*q.height
    cols=sorted(q.getcolors(tot*2), reverse=True)
    return [(round(100*c/tot,1),rgb) for c,rgb in cols]
def lum_moy(im,box):
    z=im.crop(box).convert('RGB').resize((120,240), Image.BILINEAR)
    px=z.load(); s=0
    for y in range(240):
        for x in range(120):
            p=px[x,y]; s+=0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
    return s/(120*240)
def densite(im,box,seuil=70):
    z=im.crop(box).convert('RGB').resize((240,480), Image.BILINEAR)
    px=z.load(); n=0
    for y in range(480):
        for x in range(240):
            p=px[x,y]
            if 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]>seuil: n+=1
    return 100*n/(240*480)

ref=Image.open('reference-1080x2102.png'); print('ref',ref.size)
cap=Image.open('capture-1080x2400.png'); print('cap',cap.size)
BR=(4,434,1076,2098); BC=(4,144,1076,2158)
print("\nREFERENCE .cfl6",BR)
for p,c in palette(ref,BR): print(f"   {p:5.1f}%  {c}")
print(f"   luminance moyenne {lum_moy(ref,BR):.2f}   densite (L>70) {densite(ref,BR):.2f}%")
print("\nCAPTURE rect libre",BC)
for p,c in palette(cap,BC): print(f"   {p:5.1f}%  {c}")
print(f"   luminance moyenne {lum_moy(cap,BC):.2f}   densite (L>70) {densite(cap,BC):.2f}%")
print("\nCONTROLE NEGATIF : REFERENCE, la seule serviette (.ordre) 677..1003")
for p,c in palette(ref,(60,690,1020,995),4): print(f"   {p:5.1f}%  {c}")
print("\nZone haute de la CAPTURE au meme cadrage vertical que la reference (144..1808 = 1664px)")
for p,c in palette(cap,(4,144,1076,1808)): print(f"   {p:5.1f}%  {c}")
print(f"   luminance moyenne {lum_moy(cap,(4,144,1076,1808)):.2f}   densite {densite(cap,(4,144,1076,1808)):.2f}%")
