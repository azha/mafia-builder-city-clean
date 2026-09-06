# m12 — le manometre (chrome) deborde-t-il SUR le contenu ? bbox du disque dans les deux images.
from PIL import Image
def bbox_dore(path,label,y1):
    im=Image.open(path).convert('RGB'); px=im.load()
    print('OUVERT %s %s'%(path,im.size))
    xs=[];ys=[]
    for y in range(0,y1):
        for x in range(300,800):
            r,g,b=px[x,y]
            if r>120 and r-b>55 and g>60:   # anneau cuivre/or du manometre
                xs.append(x);ys.append(y)
    print('  %s anneau : x %d..%d (w=%d)  y %d..%d (h=%d)'%(label,min(xs),max(xs),max(xs)-min(xs)+1,min(ys),max(ys),max(ys)-min(ys)+1))
    return min(xs),min(ys),max(xs),max(ys)
c=bbox_dore('../capture-1080x2400.png','capture',400)
r=bbox_dore('../reference-1080x2102.png','reference',400)
print()
print('CAPTURE   : bas du bandeau y=142 (m1). Bas de l anneau du manometre y=%d  => depassement = %d px'%(c[3],c[3]-142))
print('REFERENCE : bas du bandeau y=228 (m4). Bas de l anneau du manometre y=%d  => depassement = %d px'%(r[3],r[3]-228))
print()
print('CAPTURE   : le contenu commence a y=45 (m9) ; le disque du manometre couvre x %d..%d y %d..%d'%(c[0],c[2],c[1],c[3]))
print('  => recouvrement vertical contenu x manometre = y %d..%d, soit %d px'%(max(45,c[1]),c[3],c[3]-max(45,c[1])+1))
print('REFERENCE : le contenu (chassis) commence a y=229 ; le disque descend a y=%d => recouvrement = %d px'%(r[3],max(0,r[3]-229+1)))
