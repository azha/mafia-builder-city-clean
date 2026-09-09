# m27 — rayon des coins par ajustement de l'arc, + fond de la tete (degrade radial).
from PIL import Image
import os,math
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
def arc(im,ytop,xleft,S,label,fond,n=40):
    px=im.load()
    pts=[]
    for d in range(0,n):
        y=ytop+d
        x=xleft
        while x<xleft+80 and abs(px[x,y][2]-fond[2])<7 and abs(px[x,y][0]-fond[0])<7: x+=1
        pts.append((d/S,(x-xleft)/S))
    # ajuster r : inset(d) = r - sqrt(max(0,r^2-(r-d)^2))
    best=None
    for r10 in range(80,400):
        r=r10/10.0
        err=0
        for d,ins in pts:
            if d>=r: continue
            pred=r-math.sqrt(max(0.0,r*r-(r-d)**2))
            err+=(pred-ins)**2
        if best is None or err<best[0]: best=(err,r)
    print('  %-30s rayon ajuste = %.1f CSS  (erreur %.2f)  points: %s'%(
        label,best[1],best[0],' '.join('%.1f/%.1f'%(d,i) for d,i in pts[:10])))
print('\nRAYON par ajustement de l arc du coin haut-gauche')
arc(ref,909,97,2.0,'REF rang2',(22,25,27))
arc(cap,1108,104,1.88036,'CAP rang2',(22,22,28))
arc(ref,272,47,2.0,'REF don-rang',(22,25,27))
arc(cap,514,57,1.88036,'CAP don-rang',(22,22,28))
print('\nFOND DE LA TETE — profil horizontal (degrade radial attendu, chaud au centre haut)')
def prof(im,y,xs,label):
    px=im.load()
    print('  %s y=%d : %s'%(label,y,' '.join('%d:%s'%(x,px[x,y]) for x in xs)))
prof(ref,20,[20,150,300,450,560,700,850,1000,1100],'REF')
prof(ref,120,[20,150,300,450,560,700,850,1000,1100],'REF')
prof(cap,252,[20,150,300,450,540,700,850,1000,1060],'CAP')
prof(cap,440,[20,150,300,450,540,700,850,1000,1060],'CAP')
