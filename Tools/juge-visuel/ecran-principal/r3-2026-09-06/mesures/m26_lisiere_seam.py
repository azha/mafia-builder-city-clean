# m26 — (a) la couture art/panneau declare a 1080x2400 ; (b) le texte "La Lisiere" : bbox, hauteur
# de capitale, couleur, CONTRASTE sur son fond local (mesure sur l'art reel, jamais sur un gris choisi).
# Controle positif : contraste(creme #eae0c8 sur encre #0b1016) doit valoir ~15.9:1.
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
print(f"[ctrl] contraste creme/encre = {contrast((234,224,200),(11,16,22)):.2f}:1  (attendu ~15.9)")
F=[('district','../capture-district-1080x2400.png',2.755),('fiche24','../capture-fiche-1080x2400.png',2.755),
   ('fiche19','../capture-fiche-1080x1920.png',2.755)]
for name,f,fac in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac)); print(f'== {name} {w}x{h}')
    # (a) couture : profil vertical de la couleur mediane de ligne, x 40..360 CSS
    print('   couture haute (y CSS : couleur mediane de ligne)')
    for ycss in [52,60,70,80,84,86,86.5,87,87.5,88,90,95,105]:
        y=C(ycss); R=[px[x,y][0] for x in range(C(40),C(360),3)];G=[px[x,y][1] for x in range(C(40),C(360),3)];B=[px[x,y][2] for x in range(C(40),C(360),3)]
        print(f'      y={ycss:6.1f} : ({med(R):.0f},{med(G):.0f},{med(B):.0f})  L={lum((med(R),med(G),med(B))):.1f}')
    # (b) "La Lisiere"
    xs=[];ys=[]
    for y in range(C(80),C(100)):
        for x in range(C(2),C(80)):
            if lum(px[x,y])>110: xs.append(x);ys.append(y)
    if xs:
        bb=(min(xs),min(ys),max(xs)+1,max(ys)+1)
        print(f'   "La Lisiere" bbox x {bb[0]/fac:.1f}..{bb[2]/fac:.1f} y {bb[1]/fac:.2f}..{bb[3]/fac:.2f} (l={(bb[2]-bb[0])/fac:.1f} h={(bb[3]-bb[1])/fac:.2f} CSS)')
        P=[px[x,y] for y in range(bb[1],bb[3]) for x in range(bb[0],bb[2]) if lum(px[x,y])>140]
        P.sort(key=lum); core=P[int(len(P)*0.8):]
        Rr=sorted(p[0] for p in core);Gg=sorted(p[1] for p in core);Bb=sorted(p[2] for p in core); n=len(core)
        texte=(Rr[n//2],Gg[n//2],Bb[n//2])
        # fond : mediane des pixels sombres dans le meme rectangle elargi
        Q=[px[x,y] for y in range(bb[1]-C(2),bb[3]+C(2)) for x in range(bb[0]-C(2),bb[2]+C(2)) if lum(px[x,y])<60]
        Rr=sorted(p[0] for p in Q);Gg=sorted(p[1] for p in Q);Bb=sorted(p[2] for p in Q); m=len(Q)
        fond=(Rr[m//2],Gg[m//2],Bb[m//2])
        print(f'      couleur texte {texte} ; fond local {fond} ; contraste = {contrast(texte,fond):.2f}:1  (doctrine : >=4.5 pour petit texte)')
