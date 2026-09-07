"""m05 — le bas : dernier contenu du cadre, vide sous le CTA/panneau, dock, zone libre.
Controle positif : la 1ere encre du dock (libelles EMPIRE/FAMILLE...) doit sortir aux 2 res.
Controle negatif : les 30 px juste sous le filet bas du cadre doivent etre VIDES d'encre.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

def encre_rangees(im, x0, x1, y0, y1, seuil):
    p=im.load(); W,H=im.size
    y1=min(y1,H-1); x1=min(x1,W-1); out=[]
    for y in range(max(0,y0),y1+1):
        n=sum(1 for x in range(x0,x1+1) if lum(p[x,y])>=seuil)
        out.append((y,n))
    return out

CFG={
 'reference-1080x2102.png': dict(fin=2075.5, seuil=45, x=(28,1051)),
 'capture-1080x2400.png'  : dict(fin=2105.5, seuil=45, x=(25,1054)),
 'capture-1080x1920.png'  : dict(fin=1625.5, seuil=45, x=(25,1054)),
}
for nom,c in CFG.items():
    print("="*74); im=ouvrir(nom); x0,x1=c['x']; H=im.size[1]
    f=int(c['fin'])
    er=encre_rangees(im,x0,x1,f-560,f,c['seuil'])
    enc=[y for y,n in er if n>=8]
    print(f"  derniere encre DANS le cadre : y={enc[-1]}   vide sous elle -> filet int = {c['fin']-enc[-1]:.1f} px = {(c['fin']-enc[-1])/3.6:.2f} CSS")
    print(f"    6 dernieres rangees d'encre : {enc[-6:]}")
    er3=encre_rangees(im,x0,x1,f+8,f+40,c['seuil'])
    print(f"  [ctrl negatif] 30 px sous le cadre : rangees d'encre = {sum(1 for _,n in er3 if n>=8)} (attendu 0)")
    er2=encre_rangees(im,0,1079,f+10,H-1,c['seuil'])
    enc2=[y for y,n in er2 if n>=8]
    if enc2:
        # blocs
        blocs=[];cur=[enc2[0]]
        for y in enc2[1:]:
            if y-cur[-1]<=4: cur.append(y)
            else: blocs.append((cur[0],cur[-1])); cur=[y]
        blocs.append((cur[0],cur[-1]))
        print(f"  sous le cadre, blocs d'encre : {blocs}")
    else:
        print("  sous le cadre : aucune encre (dock non lumineux a ce seuil)")
