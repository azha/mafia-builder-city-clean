# m29 — RECALAGE INDEPENDANT du decor (je ne reprends l'homographie d'aucun tour precedent :
# si elle est fausse, tous les tons compares le sont aussi).
# Methode : (s,dx,dy) qui MAXIMISE la correlation de Pearson entre la luminance du decor REF
# et celle du JEU. Passe grossiere sur echantillon large, puis affinage sur echantillon dense.
# Controle positif : la correlation au meilleur point doit ecraser celle d'un decalage
# volontairement faux (+60 px) — sinon l'appariement ne mesure rien.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge

def grille(pxj,xs,ys):
    return [(x,y,lum(pxj[x,y])) for y in ys for x in xs]

def corr(pxr,wr,hr,G,s,dx,dy):
    A=[];B=[]
    for x,y,lb in G:
        X=int(s*x+dx); Y=int(s*y+dy)
        if 0<=X<wr and 0<=Y<hr:
            A.append(lum(pxr[X,Y])); B.append(lb)
    n=len(A)
    if n<300: return None
    ma=sum(A)/n; mb=sum(B)/n
    va=sum((v-ma)**2 for v in A); vb=sum((v-mb)**2 for v in B)
    if va<=0 or vb<=0: return None
    return sum((A[i]-ma)*(B[i]-mb) for i in range(n))/((va*vb)**0.5)

def recale(nomj,J,yj0,yj1):
    ir=charge(REF); ij=charge(J)
    pxr=ir.load(); pxj=ij.load(); wr,hr=ir.size
    Gc=grille(pxj,range(80,1000,16),range(yj0,yj1,16))
    best=None
    for i in range(0,25):
        s=1.0+i*0.008
        for dx in range(-150,61,12):
            for dy in range(-140,141,12):
                c=corr(pxr,wr,hr,Gc,s,dx,dy)
                if c is not None and (best is None or c>best[0]): best=(c,s,dx,dy)
    c,s,dx,dy=best
    print(f'  {nomj} passe grossiere : s={s:.4f} dx={dx} dy={dy} r={c:.4f}')
    Gf=grille(pxj,range(70,1010,5),range(yj0,yj1,5))
    for pas_s,pas_t in ((0.004,4),(0.002,2),(0.001,1)):
        cand=[]
        for a in (-2,-1,0,1,2):
            for b in (-2,-1,0,1,2):
                for d in (-2,-1,0,1,2):
                    cc=corr(pxr,wr,hr,Gf,s+a*pas_s,dx+b*pas_t,dy+d*pas_t)
                    if cc is not None: cand.append((cc,s+a*pas_s,dx+b*pas_t,dy+d*pas_t))
        c,s,dx,dy=max(cand)
    print(f'  {nomj}: MEILLEUR s={s:.4f} dx={dx} dy={dy}  correlation={c:.4f}')
    print(f'    CONTROLE NEGATIF  dx+60 -> {corr(pxr,wr,hr,Gf,s,dx+60,dy):.4f}   dy+60 -> {corr(pxr,wr,hr,Gf,s,dx,dy+60):.4f}')
    print(f'    CONTROLE s=1 (pas de zoom) -> {corr(pxr,wr,hr,Gf,1.0,dx,dy):.4f}')
    return s,dx,dy

print('== recalage du decor, zone STRICTEMENT decor dans les deux images ==')
recale('JEU1920',J19,170,740)
recale('JEU2400',J24,170,1140)
