"""m13 — les 4 tuiles de la colonne droite + la ligne de balayage.
Bord : mi-alpha sur le profil de luminance moyenne de la bande des tuiles.
Controle positif : 4 tuiles doivent sortir dans les 3 images.
Controle negatif : le meme detecteur sur la colonne GAUCHE (la carte) ne doit pas rendre 4 tuiles.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

CAS={
 'reference-1080x2102.png': dict(xt=(520,1000), zone=(960,1500), pan=(848.75,1612.05), sweep=(1060,1110), xall=(60,1020)),
 'capture-1080x2400.png'  : dict(xt=(470,900), zone=(960,1450), pan=(875.35,1548.95), sweep=(1080,1130), xall=(60,1020)),
 'capture-1080x1920.png'  : dict(xt=(470,900), zone=(730,1220), pan=(643.10,1316.65), sweep=(845,895),  xall=(60,1020)),
}
for nom,c in CAS.items():
    print("="*74); im=ouvrir(nom); p=im.load()
    x0,x1=c['xt']; z0,z1=c['zone']
    prof=[(y, sum(lum(p[x,y]) for x in range(x0,x1+1))/(x1-x0+1)) for y in range(z0,z1+1)]
    vals=[v for _,v in prof]; fond=percentile(vals,20)
    pics=bandes(prof, fond+ (max(vals)-fond)*0.45)
    print(f"  bandes de bord de tuile (>{fond+(max(vals)-fond)*0.45:.1f}) : {[(a,b) for a,b,_ in pics]}")
    cents=[(a+b)/2.0 for a,b,_ in pics]
    if len(cents)>=8:
        t=[(cents[2*i],cents[2*i+1]) for i in range(len(cents)//2)]
        print("  tuiles (centre de bord haut -> centre de bord bas) :")
        for i,(a,b) in enumerate(t,1):
            print(f"    tuile {i} : {a:.1f}..{b:.1f}  hauteur {b-a:.1f} px")
        pas=[t[i+1][0]-t[i][0] for i in range(len(t)-1)]
        gout=[t[i+1][0]-t[i][1] for i in range(len(t)-1)]
        print(f"  pas haut-a-haut : {[f'{v:.1f}' for v in pas]}")
        print(f"  gouttieres      : {[f'{v:.1f}' for v in gout]}")
        pan0,pan1=c['pan']
        print(f"  offset 1ere tuile depuis le haut du panneau = {t[0][0]-pan0:.1f} px")
        print(f"  vide sous la 4e tuile jusqu'au bas du panneau = {pan1-t[-1][1]:.1f} px = {100*(pan1-t[-1][1])/(pan1-pan0):.1f} % du panneau")
    # ligne de balayage : profil de la ligne cyan sur toute la largeur
    s0,s1=c['sweep']; ax0,ax1=c['xall']
    best=None
    for y in range(s0,s1+1):
        v=sum(max(0.0, lum(p[x,y])-percentile([lum(p[xx,y]) for xx in range(ax0,ax1+1)],10)) for x in range(ax0,ax1+1))
        if best is None or v>best[1]: best=(y,v)
    yb=best[0]
    row=[lum(p[x,yb]) for x in range(ax0,ax1+1)]
    f=percentile(row,10); pic=max(row)
    for frac,lab in ((0.25,'25%'),(0.10,'10%')):
        seuil=f+(pic-f)*frac
        xs=[ax0+i for i,v in enumerate(row) if v>=seuil]
        print(f"  balayage : rangee de pic y={yb} ; largeur a {lab} du pic = {max(xs)-min(xs)+1} px (x{min(xs)}..{max(xs)})")
    col=[(y,lum(p[(ax0+ax1)//2,y])) for y in range(yb-12,yb+13)]
    vv=[v for _,v in col]; ff=percentile(vv,10); pp=max(vv); i=vv.index(pp)
    e1=mi_alpha(col,i,-1,fond=ff,pic=pp); e2=mi_alpha(col,i,+1,fond=ff,pic=pp)
    print(f"  balayage : epaisseur mi-alpha = {e2-e1:.1f} px ; pic = {pp-ff:.1f} pts")
