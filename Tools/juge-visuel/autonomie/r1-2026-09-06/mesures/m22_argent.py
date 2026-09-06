# m22 — bloc ARGENT : position et hauteur de capitale, en CSS, dans les trois images.
from PIL import Image
def blocs(path,ech,x0,x1,y1,label,seuil=3*90):
    im=Image.open(path).convert('RGB'); px=im.load()
    print('OUVERT %s %s'%(path,im.size))
    rows=[]
    for y in range(4,y1):
        n=sum(1 for x in range(x0,x1) if sum(px[x,y])>seuil)
        rows.append((y,n))
    seg=[];cur=None
    for y,n in rows:
        if n>0 and cur is None: cur=y
        elif n==0 and cur is not None: seg.append((cur,y-1)); cur=None
    if cur is not None: seg.append((cur,y1-1))
    print('  %s :'%label)
    for a,b in seg:
        cs=[x for x in range(x0,x1) if any(sum(px[x,y])>seuil for y in range(a,b+1))]
        print('     y %3d..%3d h=%2d  x %4d..%4d  | CSS y %.1f..%.1f (h=%.1f)  x %.1f..%.1f (w=%.1f)'%(
            a,b,b-a+1,min(cs),max(cs),a/ech,b/ech,(b-a+1)/ech,min(cs)/ech,max(cs)/ech,(max(cs)-min(cs)+1)/ech))
blocs('/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png',3.000,10,600,150,'CANON HUD  (x3,000)')
print()
blocs('../capture-1080x2400.png',1080/392.0,10,600,138,'CAPTURE    (x2,755)')
print()
blocs('../reference-1080x2102.png',1080/300.0,10,600,225,'REFERENCE serie 6 (x3,600 sur 300 CSS)')
