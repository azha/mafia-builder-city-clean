# m09 — COUCHE GLOBALE : palette quantifiee, luminance moyenne, densite d'encre, saturation,
# sur la ZONE DE CONTENU de chaque cote.
#  reference : le panneau vnt6, y452..2078, x21..1058 (mesure m04)
#  capture   : le rect libre entre bandeau (bas 143) et dock (haut 2180), pleine largeur
# Controle positif : la couleur dominante de la reference doit etre un bleu nuit (b > r).
# Controle negatif : si l'instrument rendait la MEME palette des deux cotes, il ne mesurerait rien.
from PIL import Image
import os, colorsys
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def couche(nom, box, etiquette):
    im=Image.open(os.path.join(D,nom)).convert('RGB')
    print(f'--- {etiquette} : {nom} {im.size} zone={box}')
    z=im.crop(box); w,h=z.size
    px=z.load()
    n=w*h
    # palette quantifiee (pas de numpy) : cube de 32
    from collections import Counter
    c=Counter(); somme=0.0; encre=0; sats=[]
    for y in range(0,h,2):
        for x in range(0,w,2):
            p=px[x,y]; l=lum(p); somme+=l
            c[(p[0]//24*24,p[1]//24*24,p[2]//24*24)]+=1
            if l>28: encre+=1
            mx,mn=max(p),min(p)
            sats.append(0 if mx==0 else (mx-mn)/mx)
    tot=sum(c.values())
    print(f'  taille zone = {w}x{h} = {n} px ; echantillons = {tot}')
    print(f'  luminance MOYENNE = {somme/tot:.2f}')
    print(f'  densite d\'encre (lum>28) = {100.0*encre/tot:.2f} %')
    print(f'  saturation moyenne = {sum(sats)/len(sats):.4f}')
    print('  palette (6 premieres bennes) :')
    for col,k in c.most_common(6):
        print(f'    {col}  {100.0*k/tot:5.2f} %')
    return c.most_common(1)[0][0]

d1=couche('reference-1080x2102.png',(21,452,1059,2079),'REFERENCE panneau')
print()
d2=couche('capture-1080x2400.png',(0,144,1080,2180),'CAPTURE rect libre')
print()
print('CONTROLE POSITIF dominante reference est bleutee (b>r) :',d1[2]>d1[0], d1)
print('CONTROLE NEGATIF dominante capture est NEUTRE (r==g==b) :',d2[0]==d2[1]==d2[2], d2)
print()
# la capture est-elle un aplat ? profil vertical du fond hors carte
im=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); q=im.load()
print('CAPTURE : fond a x=540 tous les 200 px :')
print('  ', [(y,q[540,y]) for y in range(700,2180,200)])
im2=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB'); r=im2.load()
print('REFERENCE : fond du panneau a x=540 (hors elast/enseigne) :')
print('  ', [(y,r[540,y]) for y in [460,470,660,670,800,810,1880,1890,2060,2070]])
