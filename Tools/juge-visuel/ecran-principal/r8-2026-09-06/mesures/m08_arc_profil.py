# -*- coding: utf-8 -*-
"""m08 - epaisseur PERPENDICULAIRE et forme des embouts, sans hypothese de concentricite.
1) centerline = mediane des rayons du masque par bin d'angle (origine = centre du boitier) ;
2) tangente locale par differences finies sur la centerline ;
3) profil du signal (teal: B-R ; braise: R-B) sur la NORMALE, largeur a MI-ALPHA ;
4) profil du signal LE LONG de la centerline -> forme de l'embout (coupe net vs fuselee).
CONTROLE POSITIF : sur le canon l'epaisseur doit rendre 2.45 CSS (= stroke-width 3.5 x 0.700
lu dans la source). CONTROLE NEGATIF : la meme sonde sur un rayon situe dans le VIDE (secteur
neutre) doit rendre une largeur nulle."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
ANC=json.load(open('ancres.json')); CAD=json.load(open('cadran.json'))

def sig(c, quoi):
    r,g,b=c
    return (b-r) if quoi=='teal' else (r-b)

def ech(im,f,x,y):
    """echantillon bilineaire en CSS."""
    px=im.load(); W,H=im.size
    X,Y=x*f,y*f
    x0,y0=int(X),int(Y); dx,dy=X-x0,Y-y0
    def g(a,b):
        a=min(max(a,0),W-1); b=min(max(b,0),H-1); return px[a,b]
    c00,c10,c01,c11=g(x0,y0),g(x0+1,y0),g(x0,y0+1),g(x0+1,y0+1)
    return tuple((1-dx)*(1-dy)*c00[k]+dx*(1-dy)*c10[k]+(1-dx)*dy*c01[k]+dx*dy*c11[k] for k in range(3))

def largeur_mi(prof, pas):
    """prof = liste de valeurs le long de la normale. Largeur a mi-hauteur entre fond et pic."""
    pic=max(prof); fond=mediane(sorted(prof)[:max(3,len(prof)//4)])
    if pic-fond < 8: return 0.0, pic, fond
    mi=fond+(pic-fond)*0.5
    idx=[i for i,v in enumerate(prof) if v>=mi]
    if not idx: return 0.0,pic,fond
    return (idx[-1]-idx[0]+1)*pas, pic, fond

print("=== m08 : epaisseur perpendiculaire + embouts ===")
print("[controle positif] canon attendu = 2.45 CSS (stroke-width 3.5 x echelle 0.700, source)\n")
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle)
    a=ANC[cle]; d=CAD[cle]; ox,oy=a['cx'],a['cy']
    print("-- %s"%cle)
    for quoi in ['teal','braise']:
        P=[tuple(p) for p in d[quoi]]
        bins={}
        for p in P:
            th=math.degrees(math.atan2(oy-p[1], p[0]-ox))
            k=round(th)
            bins.setdefault(k,[]).append(math.hypot(p[0]-ox,p[1]-oy))
        ths=sorted(bins)
        # centerline continue
        cl=[(t, mediane(bins[t])) for t in ths if len(bins[t])>=3]
        if len(cl)<10: print("   %s : centerline trop courte"%quoi); continue
        # largeurs perpendiculaires
        lar=[]
        for i in range(2,len(cl)-2):
            t,r=cl[i]
            t0,r0=cl[i-2]; t1,r1=cl[i+2]
            x=ox+r*math.cos(math.radians(t)); y=oy-r*math.sin(math.radians(t))
            x0=ox+r0*math.cos(math.radians(t0)); y0=oy-r0*math.sin(math.radians(t0))
            x1=ox+r1*math.cos(math.radians(t1)); y1=oy-r1*math.sin(math.radians(t1))
            tx,ty=x1-x0,y1-y0; n=math.hypot(tx,ty)
            if n<1e-6: continue
            nx,ny=-ty/n, tx/n        # normale unitaire
            pas=0.05; prof=[]
            for k in range(-90,91):
                prof.append(sig(ech(im,f,x+nx*k*pas, y+ny*k*pas), quoi))
            w,pic,fond=largeur_mi(prof,pas)
            lar.append((t,w,pic))
        ws=[w for t,w,p in lar if w>0]
        courant=[w for t,w,p in lar[6:-6] if w>0]
        print("   %-6s : %d coupes ; epaisseur MI-ALPHA courante  mediane %.2f  (p10 %.2f  p90 %.2f)  CSS"
              %(quoi,len(lar),mediane(courant),sorted(courant)[int(.1*len(courant))],sorted(courant)[int(.9*len(courant))]))
        # embouts : 8 coupes de chaque bout
        print("      embout A (angle:epaisseur) : %s"%(" ".join("%d:%.2f"%(t,w) for t,w,p in lar[:8])))
        print("      embout B (angle:epaisseur) : %s"%(" ".join("%d:%.2f"%(t,w) for t,w,p in lar[-8:])))
    print()
