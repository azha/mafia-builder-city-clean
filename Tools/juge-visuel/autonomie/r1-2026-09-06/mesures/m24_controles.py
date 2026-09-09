# m24 — controles positifs : diametre du manometre et centre, canon vs capture, en CSS.
from PIL import Image
def disque(path,ech,label,ymax):
    im=Image.open(path).convert('RGB'); px=im.load()
    print('OUVERT %s %s'%(path,im.size))
    xs=[];ys=[]
    cx=im.width//2
    for y in range(0,ymax):
        for x in range(cx-160,cx+160):
            r,g,b=px[x,y]
            if r>150 and r-b>70 and g<210:   # anneau cuivre
                xs.append(x); ys.append(y)
    print('  %s anneau : x %d..%d (d=%d px = %.1f CSS)  y %d..%d (d=%d px = %.1f CSS)  centre x=%.1f (%.1f CSS)'%(
        label,min(xs),max(xs),max(xs)-min(xs)+1,(max(xs)-min(xs)+1)/ech,
        min(ys),max(ys),max(ys)-min(ys)+1,(max(ys)-min(ys)+1)/ech,(min(xs)+max(xs))/2.0,(min(xs)+max(xs))/2.0/ech))
disque('/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png',3.0,'CANON  ',260)
disque('../capture-1080x2400.png',1080/392.0,'CAPTURE',240)
