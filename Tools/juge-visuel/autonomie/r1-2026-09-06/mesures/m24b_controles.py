# m24b — diametre HORIZONTAL de l anneau du manometre, mesure a son equateur (au-dessus de la regle).
from PIL import Image
def eq(path,ech,label,yeq,xc,exclure):
    im=Image.open(path).convert('RGB'); px=im.load()
    print('OUVERT %s %s'%(path,im.size))
    xs=[x for x in range(xc-250,xc+250) if px[x,yeq][0]>150 and px[x,yeq][0]-px[x,yeq][2]>70]
    print('  %s a y=%d : anneau x %d..%d  diametre=%d px = %.1f CSS ; centre=%.1f px = %.1f CSS'%(
        label,yeq,min(xs),max(xs),max(xs)-min(xs)+1,(max(xs)-min(xs)+1)/ech,(min(xs)+max(xs))/2,(min(xs)+max(xs))/2/ech))
eq('/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png',3.0,'CANON  ',116,588,None)
eq('../capture-1080x2400.png',1080/392.0,'CAPTURE',110,540,None)
