# m11 : le HALO des compteurs — methode integrale de grandeurs-r15 §C, avec d=1 ET la luminance BRUTE.
# Controle positif : la sonde tourne d'abord sur la REFERENCE (ou le halo est connu present) ;
#                    elle doit y retrouver une portee ~18 px. Si elle ne la trouve pas, l'instrument est faux.
# Controle negatif : la meme sonde sur une zone d'encre SANS halo (le libelle creme du meme compteur).
import sys; sys.path.insert(0,'.')
from lib import *

CYAN=(127,212,217)
def est_cyan(c,tol=28):
    return abs(c[0]-CYAN[0])<=tol and abs(c[1]-CYAN[1])<=tol and abs(c[2]-CYAN[2])<=tol

def dt_chebyshev(masque, W, H):
    INF=10**6
    d=[[0 if masque[y][x] else INF for x in range(W)] for y in range(H)]
    for y in range(H):
        for x in range(W):
            if d[y][x]==0: continue
            m=INF
            for dy,dx in ((-1,-1),(-1,0),(-1,1),(0,-1)):
                yy,xx=y+dy,x+dx
                if 0<=yy<H and 0<=xx<W and d[yy][xx]+1<m: m=d[yy][xx]+1
            if m<d[y][x]: d[y][x]=m
    for y in range(H-1,-1,-1):
        for x in range(W-1,-1,-1):
            if d[y][x]==0: continue
            m=d[y][x]
            for dy,dx in ((1,1),(1,0),(1,-1),(0,1)):
                yy,xx=y+dy,x+dx
                if 0<=yy<H and 0<=xx<W and d[yy][xx]+1<m: m=d[yy][xx]+1
            d[y][x]=m
    return d

def dilate(masque,W,H,r):
    out=[[False]*W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            if masque[y][x]:
                for j in range(max(0,y-r),min(H,y+r+1)):
                    for i in range(max(0,x-r),min(W,x+r+1)):
                        out[j][i]=True
    return out

def halo(nom, bx0,bx1, dy0,dy1, ink_x0,ink_x1, ink_y0,ink_y1, lab_y, etiq):
    """bx0..bx1 : interieur de la boite en x ; dy0..dy1 : domaine vertical (interieur, hors liseré, hors libellé)"""
    im=ouvrir(nom); px=im.load()
    W=bx1-bx0+1; H=dy1-dy0+1
    # fond = mediane de la RANGEE sur l'interieur de la boite
    fond={ y: mediane([lum(px[x,y]) for x in range(bx0,bx1+1)]) for y in range(dy0,dy1+1) }
    exc=[[lum(px[bx0+x,dy0+y])-fond[dy0+y] for x in range(W)] for y in range(H)]
    ink=[[est_cyan(px[bx0+x,dy0+y]) for x in range(W)] for y in range(H)]
    nink=sum(sum(1 for v in r if v) for r in ink)
    inkd=dilate(ink,W,H,2)
    d=dt_chebyshev(inkd,W,H)
    print("  == %s == encre cyan brute = %d px ; encre dilatee(2) = %d px"
          % (etiq, nink, sum(sum(1 for v in r if v) for r in inkd)))
    if nink==0:
        print("     AUCUNE encre cyan -> profil sans objet"); return None
    P={}
    for dd in range(1,31):
        vals=[exc[y][x] for y in range(H) for x in range(W) if d[y][x]==dd]
        P[dd]=sum(vals)/len(vals) if vals else None
    aff=" ".join("d%d=%s"%(k,("%.2f"%P[k]) if P[k] is not None else "-") for k in range(1,21))
    print("     P(d) :", aff)
    portee=max([k for k in P if P[k] is not None and P[k]>0.5] or [0])
    p2=P[2]
    plateau=2
    if p2 and p2>0:
        for k in range(2,31):
            if P.get(k) is not None and P[k]>=0.90*p2: plateau=k
            else: break
    # mi-valeur : dernier d ou P(d) >= 0,5*P(1)
    p1=P[1]; mi=None
    if p1 and p1>0:
        for k in range(1,31):
            if P.get(k) is not None and P[k]>=0.5*p1: mi=k
    print("     portee (dernier d avec P>0,5) = %s ; mi-valeur = %s ; plateau (P>=0,90*P(2)) = d2..d%d (%d px)"
          % (portee, mi, plateau, plateau-1))
    # LUMINANCE BRUTE le long de la rangee mediane du chiffre, a droite de l'encre
    ym=(ink_y0+ink_y1)//2
    print("     luminance BRUTE a droite de l'encre (rangee y=%d) :" % ym,
          " ".join("%dpx:%.1f"%(k, lum(px[ink_x1+k,ym])) for k in (1,2,3,4,6,8,12,20,30)))
    print("     luminance BRUTE au-dessus (colonne x=%d) :" % ((ink_x0+ink_x1)//2),
          " ".join("%dpx:%.1f"%(k, lum(px[(ink_x0+ink_x1)//2, ink_y0-k])) for k in (1,2,3,4,6,8,12,18)))
    # VALLEE chiffre -> libellé
    vals=[]
    for y in range(ink_y1+1, lab_y):
        row=[lum(px[x,y]) for x in range(bx0,bx1+1)]
        vals.append((y, sum(row)/len(row) - mediane(row)))
    if vals:
        ymin=min(vals,key=lambda t:t[1])
        print("     VALLEE chiffre->libelle : min = %.2f pts (y=%d) sur %d rangees (y%d..%d)"
              % (ymin[1],ymin[0],len(vals),ink_y1+1,lab_y-1))
    # BARYCENTRE de l'exces hors encre
    sx=sy=sw=0.0
    for y in range(H):
        for x in range(W):
            if inkd[y][x]: continue
            e=exc[y][x]
            if e>0: sx+=e*x; sy+=e*y; sw+=e
    ix=iy=iw=0.0
    for y in range(H):
        for x in range(W):
            if ink[y][x]: ix+=x; iy+=y; iw+=1
    if sw>0 and iw>0:
        print("     BARYCENTRE halo-encre = (%+.1f ; %+.1f) px  (masse d'exces hors encre = %.0f pts)"
              % (sx/sw-ix/iw, sy/sw-iy/iw, sw))
    else:
        print("     BARYCENTRE indefini (masse d'exces hors encre = %.1f)" % sw)
    # SYMETRIE brute haut/bas sur 12 rangees, colonnes de l'encre
    cols=[x for x in range(W) if any(ink[y][x] for y in range(H))]
    yy0=min(y for y in range(H) if any(ink[y][x] for x in range(W)))
    yy1=max(y for y in range(H) if any(ink[y][x] for x in range(W)))
    haut=sum(exc[y][x] for y in range(max(0,yy0-12),yy0) for x in cols)
    bas =sum(exc[y][x] for y in range(yy1+1,min(H,yy1+13)) for x in cols)
    print("     SYMETRIE haut/bas (brut, 12 rangees) = %.0f / %.0f  -> %s" % (haut,bas, ("%.2f"%(haut/bas)) if bas else "n/a"))
    # LARGEUR a mi-hauteur du profil de colonnes de l'exces, bande du chiffre
    prof=[sum(max(0.0,exc[y][x]) for y in range(yy0,yy1+1)) for x in range(W)]
    pmax=max(prof); seuil=0.5*pmax
    xs=[x for x in range(W) if prof[x]>=seuil]
    print("     LARGEUR a mi-hauteur du profil de colonnes = %d px ; largeur de l'encre = %d px ; rapport %.2f"
          % (max(xs)-min(xs)+1, ink_x1-ink_x0+1, (max(xs)-min(xs)+1)/float(ink_x1-ink_x0+1)))
    return P

print("### REFERENCE — compteur 1 (CONTROLE POSITIF de l'instrument) ###")
halo('reference-1080x2102.png', 56,356, 706,781, 171,237, 725,761, 783, 'ref c1')
print()
print("### CAPTURE 2400 — compteur 1 ###")
halo('capture-1080x2400.png', 52,354, 731,807, 173,234, 749,785, 809, 'jeu2400 c1')
print()
print("### CAPTURE 1920 — compteur 1 ###")
halo('capture-1080x1920.png', 52,354, 499,575, 173,234, 516,553, 577, 'jeu1920 c1')
