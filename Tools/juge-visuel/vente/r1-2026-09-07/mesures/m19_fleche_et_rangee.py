# m19 — deux grandeurs que je refuse d'estimer a l'oeil :
#   (a) la fleche retour presente sur la PLANCHE et absente de la capture principale ;
#   (b) l'extension horizontale REELLE d'une rangee .dl de la reference (bord #2a3648).
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
a=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); pa=a.load()
b=Image.open(os.path.join(D,'capture-planche-1080x2400.png')).convert('RGB'); pb=b.load()
print('OUVERT', a.size, b.size)
# (a) fleche : zone x 0..200, y 0..143 ; ou la planche a-t-elle de l'encre que la principale n'a pas ?
xs=[];ys=[]
for y in range(0,144):
    for x in range(0,220):
        if lum(pb[x,y])-lum(pa[x,y])>25: xs.append(x); ys.append(y)
print('(a) FLECHE RETOUR (planche moins principale, x0..220 y0..143) : %d px'%len(xs))
if xs: print('    bbox x=%d..%d y=%d..%d  (%dx%d px = %.1fx%.1f CSS-HUD a x2,755)'%(
    min(xs),max(xs),min(ys),max(ys),max(xs)-min(xs)+1,max(ys)-min(ys)+1,(max(xs)-min(xs)+1)/2.755,(max(ys)-min(ys)+1)/2.755))
print('    CONTROLE NEGATIF meme mesure en sens inverse (principale moins planche) : %d px'%
      sum(1 for y in range(0,144) for x in range(0,220) if lum(pa[x,y])-lum(pb[x,y])>25))
print()
# (b) rangee .dl : bord #2a3648 sur la ligne du haut de la rangee Oskar (y=855)
im=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB'); px=im.load()
def proche(p,c,tol): return all(abs(p[k]-c[k])<=tol for k in range(3))
BORD=(42,54,72)
for y in [855,969,983]:
    xs2=[x for x in range(25,1055) if proche(px[x,y],BORD,14)]
    print('(b) reference, bord .dl a y=%d : x=%d..%d  largeur=%d px = %.1f CSS  (n=%d px)'%(
        y,min(xs2),max(xs2),max(xs2)-min(xs2)+1,(max(xs2)-min(xs2)+1)/3.6,len(xs2)))
print('    CONTROLE NEGATIF meme motif au milieu du fond de liste (y=1700) : %d px'%
      len([x for x in range(25,1055) if proche(px[x,1700],BORD,14)]))
