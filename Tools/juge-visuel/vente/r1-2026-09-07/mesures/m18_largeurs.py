# m18 — LARGEURS comparables (les deux cotes sont a x3,6 : 1 px CSS = 3,6 px image)
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
im=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB'); px=im.load()
print('OUVERT reference-1080x2102.png', im.size)
def bornes(y,x0,x1,seuil):
    g=None;d=None
    for x in range(x0,x1):
        if lum(px[x,y])>seuil: g=x;break
    for x in range(x1-1,x0-1,-1):
        if lum(px[x,y])>seuil: d=x;break
    return g,d
for nom,y,s in [('cerne (panneau)',1200,40),('enseigne (bord)',500,25),('fen 1 (bord)',700,25),
                ('elast (bord)',1500,20),('rangee .dl Oskar',900,20),('cta6 (bord laiton)',1950,40)]:
    g,d=bornes(y,5,1075,s)
    print('  %-22s y=%4d : x=%4d..%4d  largeur=%4d px = %6.1f CSS'%(nom,y,g,d,d-g+1,(d-g+1)/3.6))
print()
im2=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); q=im2.load()
print('OUVERT capture-1080x2400.png', im2.size)
def bornes2(y,x0,x1,seuil):
    g=None;d=None
    for x in range(x0,x1):
        if lum(q[x,y])>seuil: g=x;break
    for x in range(x1-1,x0-1,-1):
        if lum(q[x,y])>seuil: d=x;break
    return g,d
for nom,y,s in [('carte (bord)',500,20),('bouton RAMASSER',580,20)]:
    g,d=bornes2(y,5,1075,s)
    print('  %-22s y=%4d : x=%4d..%4d  largeur=%4d px = %6.1f CSS'%(nom,y,g,d,d-g+1,(d-g+1)/3.6))
print()
print('CONTROLE POSITIF : la largeur du cerne mesuree (%.1f CSS) doit valoir 300 - 2*inset(5) - marges du .tel'%( (1058-21+1)/3.6))
print('CONTROLE NEGATIF : deux objets differents ne doivent PAS rendre la meme largeur -> voir tableau')
