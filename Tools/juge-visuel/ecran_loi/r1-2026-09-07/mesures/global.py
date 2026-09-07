# Couche globale : palette quantifiee, luminance moyenne, densite d encre, sur la ZONE DE CONTENU
# (ref : y 434..2085 hors liseré .tel ; capture : y 144..2178, entre filet du bandeau et dock).
# Controle positif : la couleur dominante de la reference doit etre le fond du panneau
#   (#1b1f24..#101317 par le degrade CSS) ; celle de la capture (13,13,13).
# Controle negatif : les deux palettes ne doivent PAS etre identiques.
from PIL import Image
import statistics as st
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def couche(path,x0,y0,x1,y1,nom):
    im=Image.open(path).convert('RGB'); print('%s : %s  zone x %d..%d y %d..%d'%(nom,im.size,x0,x1,y0,y1))
    z=im.crop((x0,y0,x1,y1))
    q=z.quantize(colors=8, method=Image.MEDIANCUT).convert('RGB')
    cols=sorted(q.getcolors(1000000), reverse=True)
    tot=sum(c for c,_ in cols)
    print('  palette (8 classes) :')
    for c,rgb in cols:
        print('    %5.1f%%  %s  #%02x%02x%02x' % (100*c/tot, rgb, *rgb))
    px=z.load(); w,h=z.size
    L=[lum(px[x,y]) for y in range(0,h,3) for x in range(0,w,3)]
    print('  luminance moyenne = %.1f   mediane = %.1f'%(sum(L)/len(L), st.median(L)))
    fondL=st.median(L)
    encre=sum(1 for v in L if abs(v-fondL)>12)
    print('  densite d encre (|L-fond|>12) = %.2f %%'%(100*encre/len(L)))
    return cols
print('=== REFERENCE : panneau .parl6 ===')
couche('../reference-1080x2102.png',6,434,1074,2085,'reference')
print()
print('=== CAPTURE : zone libre entre filet et dock ===')
couche('../capture-1080x2400.png',0,144,1080,2179,'capture')
print()
print('=== CAPTURE : zone REELLEMENT occupee (y 144..1460) ===')
couche('../capture-1080x2400.png',0,144,1080,1460,'capture-haut')
