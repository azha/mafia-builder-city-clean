# -*- coding: utf-8 -*-
"""m20 - regions de difference fiche/district (2400) : separe la PLAQUE de tout autre changement
provoque par l'ouverture de la fiche (un marqueur de selection, par exemple)."""
import sys, math; sys.path.insert(0,'.')
from commun import *
A,f=ouvrir('j2400'); B,_=ouvrir('d2400')
pa=A.load(); pb=B.load(); W,H=A.size
S=set()
for y in range(H):
    for x in range(W):
        if pa[x,y]!=pb[x,y]: S.add((x,y))
print("=== m20 ===\n   pixels differents : %d / %d (%.2f %%)"%(len(S),W*H,100.0*len(S)/(W*H)))
vus=set(); comps=[]
for s in S:
    if s in vus: continue
    pile=[s]; vus.add(s); c=[]
    while pile:
        p=pile.pop(); c.append(p)
        for dx in (-1,0,1):
            for dy in (-1,0,1):
                q=(p[0]+dx,p[1]+dy)
                if q in S and q not in vus: vus.add(q); pile.append(q)
    comps.append(c)
comps.sort(key=len,reverse=True)
print("   %d composantes ; les 6 plus grosses :"%len(comps))
for c in comps[:6]:
    xs=[p[0] for p in c]; ys=[p[1] for p in c]
    print("      %7d px  x %.2f..%.2f CSS  y %.2f..%.2f CSS  (%.2f x %.2f)"
          %(len(c),min(xs)/f,max(xs)/f,min(ys)/f,max(ys)/f,(max(xs)-min(xs)+1)/f,(max(ys)-min(ys)+1)/f))
# la plaque = composante la plus grosse
c=comps[0]; xs=[p[0] for p in c]; ys=[p[1] for p in c]
x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
lignes={}
for p in c: lignes.setdefault(p[1],[]).append(p[0])
ys2=sorted(lignes)
print("\n   PLAQUE : x %.2f..%.2f (%.2f CSS)  y %.2f..%.2f (%.2f CSS)"%(x0/f,x1/f,(x1-x0+1)/f,y0/f,y1/f,(y1-y0+1)/f))
print("   canon (mesure-canon.txt) : .fiche 366.00 x 169.19 a (13.00 ; 424.52)")
print("   retrait du bord gauche, 16 premieres lignes : %s"%(" ".join("%.2f"%((min(lignes[y])-x0)/f) for y in ys2[:16])))
print("   retrait du bord droit  , 16 premieres lignes : %s"%(" ".join("%.2f"%((x1-max(lignes[y]))/f) for y in ys2[:16])))
print("   retrait du bord gauche, 16 dernieres lignes : %s"%(" ".join("%.2f"%((min(lignes[y])-x0)/f) for y in ys2[-16:])))
# transmittance sur la plaque, encre exclue
ech=[]
for y in range(y0+40,y1-40,2):
    for x in range(x0+40,x1-40,3):
        ca=pa[x,y]; cb=pb[x,y]
        if max(ca)>120: continue            # encre claire de la fiche exclue
        if abs(ca[0]-ca[2])>40: continue    # or / braise exclus
        ech.append((cb,ca))
def pente(k):
    n=len(ech); sx=sum(e[0][k] for e in ech); sy=sum(e[1][k] for e in ech)
    sxx=sum(e[0][k]**2 for e in ech); sxy=sum(e[0][k]*e[1][k] for e in ech)
    return (n*sxy-sx*sy)/float(n*sxx-sx*sx)
print("\n   transmittance (encre exclue, %d ech.) : R %.3f  G %.3f  B %.3f"%(len(ech),pente(0),pente(1),pente(2)))
print("   canon attendu : 1-alpha de #0c1320ef (0.063) en haut -> #080d17f6 (0.035) en bas")
# amplitude visible du fond a travers la plaque : deciles
vals=sorted(ech, key=lambda e: L(e[0]))
n=len(vals)
print("   fond NU du decile le plus sombre L=%.1f -> a travers la plaque L=%.1f ; decile le plus clair L=%.1f -> L=%.1f  (amplitude visible %.1f L)"
      %(L(vals[int(.05*n)][0]),L(vals[int(.05*n)][1]),L(vals[int(.95*n)][0]),L(vals[int(.95*n)][1]),
        L(vals[int(.95*n)][1])-L(vals[int(.05*n)][1])))
