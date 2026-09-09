"""m14 — la ligne de balayage (M6 du r14), mesuree en DIFFERENTIEL vertical pour ne pas
compter le fond des tuiles : exces(x) = lum(x,ys) - 0,5*(lum(x,ys-16)+lum(x,ys+16)).
Controle positif : le pic doit tomber sur la rangee de la ligne trouvee par m04.
Controle negatif : la meme sonde 40 px plus haut doit rendre un pic quasi nul.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
CAS={
 'reference-1080x2102.png': dict(win=(1076,1100), pan=(50,1030), panx=(52,1026)),
 'capture-1080x2400.png'  : dict(win=(1092,1116), pan=(50,1030), panx=(49,1030)),
 'capture-1080x1920.png'  : dict(win=(860,884),   pan=(50,1030), panx=(49,1030)),
}
def exces_ligne(p, ys, x0, x1, d=16):
    return [(x, lum(p[x,ys]) - 0.5*(lum(p[x,ys-d])+lum(p[x,ys+d]))) for x in range(x0,x1+1)]
for nom,c in CAS.items():
    print("="*74); im=ouvrir(nom); p=im.load()
    w0,w1=c['win']; x0,x1=c['pan']
    best=max(range(w0,w1+1), key=lambda y: sum(max(0,v) for _,v in exces_ligne(p,y,x0,x1)))
    prof=exces_ligne(p,best,x0,x1)
    vals=[v for _,v in prof]; pic=max(vals)
    print(f"  rangee de balayage y={best} ; pic d'exces = {pic:.1f} pts")
    for frac,lab in ((0.5,'50%'),(0.25,'25%'),(0.10,'10%')):
        xs=[x for x,v in prof if v>=pic*frac]
        larg=max(xs)-min(xs)+1
        print(f"    largeur a {lab} du pic = {larg} px  (x{min(xs)}..{max(xs)})  = {100*larg/(c['panx'][1]-c['panx'][0]+1):.1f} % de la largeur du panneau")
    col=[(y, lum(p[540,y])-0.5*(lum(p[540,y-16])+lum(p[540,y+16]))) for y in range(best-12,best+13)]
    vv=[v for _,v in col]; i=vv.index(max(vv))
    e1=mi_alpha(col,i,-1,fond=0.0,pic=max(vv)); e2=mi_alpha(col,i,+1,fond=0.0,pic=max(vv))
    print(f"    epaisseur mi-alpha = {e2-e1:.1f} px")
    prof2=exces_ligne(p,best-40,x0,x1)
    print(f"  [ctrl negatif] meme sonde 40 px plus haut : pic = {max(v for _,v in prof2):.1f} pts")
